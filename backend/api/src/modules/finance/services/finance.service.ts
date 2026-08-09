import { randomUUID } from 'node:crypto';

import type { Database } from '@/database/client';
import { buildPaginatedResult } from '@/database/helpers';
import { withTransaction } from '@/database/helpers/transaction';
import {
  BusinessRuleError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from '@/errors';
import { PERMISSIONS } from '@/modules/rbac';
import type { WalletService } from '@/modules/wallet';
import type { WalletRepository } from '@/modules/wallet/repositories';
import { centsFromUnits } from '@/modules/wallet/units';

import type {
  DepositTrancheData,
  FinanceActor,
  FinancialLimitsData,
  FinancialRequestData,
  FinancialRequestType,
  PaginatedFinancialRequests,
  TrancheMaturityResult,
} from '../dto';
import type { FinanceEventBus } from '../events';
import { toDepositTranche, toFinancialLimits, toFinancialRequest } from '../mappers';
import type {
  DepositTrancheRepository,
  FinanceAuditRepository,
  FinancialLimitsRepository,
  FinancialRequestRepository,
  MemberLookupRepository,
} from '../repositories';
import {
  createDepositSchema,
  createWithdrawalSchema,
  decisionSchema,
  listRequestsQuerySchema,
  rejectSchema,
  updateLimitsSchema,
} from '../validators';

const MODULE = 'finance';
const DEFAULT_CURRENCY = 'USD';
/** Reference-defined 30-day capital lock for deposit tranches. */
const DEFAULT_LOCK_DAYS = 30;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** A short, unique, human-readable reference like `DEP-1A2B3C4D5E6F`. */
function reference(prefix: string): string {
  return `${prefix}-${randomUUID().slice(0, 12).toUpperCase()}`;
}

/**
 * Reused RBAC check (rule 4). The composition root adapts this to
 * `AuthorizationService.hasPermission`; tests supply a stub. Kept as a narrow
 * port so the service does not depend on the RBAC module's runtime wiring.
 */
export interface FinanceAuthorizationPort {
  can(userId: string, permissionKey: string): Promise<boolean>;
}

/**
 * Finance business logic (Phase 2B). Deposit / withdrawal requests are the
 * intent + admin action-queue records; money moves only on approval, where the
 * wallet ledger credit/debit AND (for deposits) the tranche creation happen in a
 * single database transaction via the wallet module's `*Within(tx, …)` compose
 * seam (rule 3 — extends the existing wallet infrastructure; rule 14 — money
 * movement is transactional and auditable). A decided request is terminal.
 */
export class FinanceService {
  public constructor(
    private readonly db: Database,
    private readonly wallet: WalletService,
    private readonly walletRepo: WalletRepository,
    private readonly requests: FinancialRequestRepository,
    private readonly tranches: DepositTrancheRepository,
    private readonly limits: FinancialLimitsRepository,
    private readonly members: MemberLookupRepository,
    private readonly audit: FinanceAuditRepository,
    private readonly events: FinanceEventBus,
    private readonly authz: FinanceAuthorizationPort,
  ) {}

  // --- Member: submit requests ----------------------------------------------

  public async createDeposit(
    memberId: string,
    input: unknown,
    actor: FinanceActor,
  ): Promise<FinancialRequestData> {
    const data = createDepositSchema.parse(input);
    await this.requireMember(memberId);
    const limits = await this.limits.getOrCreate(actor.userId);
    if (data.units < limits.minDepositUnits) {
      throw new BusinessRuleError(`Deposit must be at least ${limits.minDepositUnits} unit(s).`);
    }
    if (data.units > limits.maxDepositUnits) {
      throw new BusinessRuleError(`Deposit may not exceed ${limits.maxDepositUnits} units.`);
    }
    const amountCents = centsFromUnits(data.units);

    const created = await withTransaction(this.db, async (tx) => {
      const row = await this.requests.create(
        {
          requestNumber: reference('DEP'),
          memberId,
          type: 'DEPOSIT',
          status: 'PENDING',
          amountCents,
          units: data.units,
          currencyCode: DEFAULT_CURRENCY,
          reason: data.reason ?? null,
          createdBy: actor.userId,
          updatedBy: actor.userId,
        },
        tx,
      );
      await this.writeAudit(tx, row.id, 'CREATE', null, { type: 'DEPOSIT', amountCents }, actor);
      return row;
    });

    await this.events.publish({
      type: 'FinancialRequestSubmitted',
      requestId: created.id,
      requestType: 'DEPOSIT',
      memberId,
      amountCents,
      actorId: actor.userId,
      at: new Date(),
    });
    return toFinancialRequest(created);
  }

  public async createWithdrawal(
    memberId: string,
    input: unknown,
    actor: FinanceActor,
  ): Promise<FinancialRequestData> {
    const data = createWithdrawalSchema.parse(input);
    await this.requireMember(memberId);
    const amountCents = centsFromUnits(data.units);

    const limits = await this.limits.getOrCreate(actor.userId);
    if (amountCents < limits.minWithdrawCents) {
      throw new BusinessRuleError(
        `Withdrawal must be at least $${Math.round(limits.minWithdrawCents / 100)}.`,
      );
    }
    if (data.early && !limits.earlyWithdrawAllowed) {
      throw new BusinessRuleError('Early withdrawal is currently disabled.');
    }

    // Immediate feedback: a member can only withdraw against real available funds.
    // Final sufficiency is re-enforced atomically at approval (debitWithin).
    const wallet = await this.walletRepo.findByMemberId(memberId, 'FINANCIAL');
    if (!wallet) {
      throw new BusinessRuleError('You have no financial balance to withdraw from.');
    }
    const balance = await this.wallet.getBalance(wallet.id);
    if (balance.availableMinor < amountCents) {
      throw new BusinessRuleError('Withdrawal exceeds your available balance.');
    }

    const created = await withTransaction(this.db, async (tx) => {
      const row = await this.requests.create(
        {
          requestNumber: reference('WDR'),
          memberId,
          walletId: wallet.id,
          type: 'WITHDRAW',
          status: 'PENDING',
          amountCents,
          units: data.units,
          currencyCode: DEFAULT_CURRENCY,
          early: data.early ?? false,
          reason: data.reason ?? null,
          createdBy: actor.userId,
          updatedBy: actor.userId,
        },
        tx,
      );
      await this.writeAudit(
        tx,
        row.id,
        'CREATE',
        null,
        { type: 'WITHDRAW', amountCents, early: data.early ?? false },
        actor,
      );
      return row;
    });

    await this.events.publish({
      type: 'FinancialRequestSubmitted',
      requestId: created.id,
      requestType: 'WITHDRAW',
      memberId,
      amountCents,
      actorId: actor.userId,
      at: new Date(),
    });
    return toFinancialRequest(created);
  }

  // --- Admin: action the queue ----------------------------------------------

  public async approve(
    id: string,
    input: unknown,
    actor: FinanceActor,
  ): Promise<FinancialRequestData> {
    const parsed = decisionSchema.parse(input);
    const request = await this.requests.findById(id);
    if (!request) {
      throw new NotFoundError('Request not found.');
    }
    this.assertActionable(request.status);
    await this.assertCanDecide(actor, request.type);

    // Resolve the settling FINANCIAL wallet OUTSIDE the money transaction, since
    // wallet creation runs in its own transaction. The credit/debit below then
    // joins the approval transaction.
    let walletId: string;
    if (request.type === 'DEPOSIT') {
      walletId = await this.ensureFinancialWallet(request.memberId, actor);
    } else {
      const wallet = await this.walletRepo.findByMemberId(request.memberId, 'FINANCIAL');
      if (!wallet) {
        throw new BusinessRuleError('Member has no financial wallet to withdraw from.');
      }
      walletId = wallet.id;
    }

    const decidedAt = new Date();
    const result = await withTransaction(this.db, async (tx) => {
      const locked = await this.requests.lockById(id, tx);
      if (!locked) {
        throw new NotFoundError('Request not found.');
      }
      this.assertActionable(locked.status);

      let transactionId: string;
      let trancheId: string | null = null;

      if (locked.type === 'DEPOSIT') {
        const credit = await this.wallet.creditWithin(
          tx,
          walletId,
          {
            amountMinor: locked.amountCents,
            reference: locked.requestNumber,
            description: `Deposit approved — ${locked.units} unit(s)`,
          },
          actor,
        );
        transactionId = credit.transactionId;
        const tranche = await this.tranches.create(
          {
            trancheNumber: reference('TRN'),
            memberId: locked.memberId,
            walletId,
            depositRequestId: locked.id,
            principalCents: locked.amountCents,
            currencyCode: locked.currencyCode,
            lockDays: DEFAULT_LOCK_DAYS,
            maturesAt: new Date(decidedAt.getTime() + DEFAULT_LOCK_DAYS * MS_PER_DAY),
            status: 'LOCKED',
            createdBy: actor.userId,
            updatedBy: actor.userId,
          },
          tx,
        );
        trancheId = tranche.id;
      } else {
        const debit = await this.wallet.debitWithin(
          tx,
          walletId,
          {
            amountMinor: locked.amountCents,
            reference: locked.requestNumber,
            description: `Withdrawal approved — ${locked.units} unit(s)`,
          },
          actor,
        );
        transactionId = debit.transactionId;
      }

      const updated = await this.requests.update(
        locked.id,
        {
          status: 'APPROVED',
          walletId,
          decidedBy: actor.userId,
          decidedAt,
          ...(parsed.reason ? { reason: parsed.reason } : {}),
          updatedBy: actor.userId,
        },
        tx,
      );
      await this.writeAudit(
        tx,
        locked.id,
        'UPDATE',
        { status: locked.status },
        { status: 'APPROVED', walletId, transactionId, trancheId },
        actor,
      );
      if (!updated) {
        throw new Error('Request update did not return a row.');
      }
      return { updated, transactionId, trancheId };
    });

    if (result.updated.type === 'DEPOSIT') {
      await this.events.publish({
        type: 'DepositApproved',
        requestId: result.updated.id,
        memberId: result.updated.memberId,
        walletId,
        trancheId: result.trancheId as string,
        transactionId: result.transactionId,
        amountCents: result.updated.amountCents,
        actorId: actor.userId,
        at: decidedAt,
      });
    } else {
      await this.events.publish({
        type: 'WithdrawalApproved',
        requestId: result.updated.id,
        memberId: result.updated.memberId,
        walletId,
        transactionId: result.transactionId,
        amountCents: result.updated.amountCents,
        actorId: actor.userId,
        at: decidedAt,
      });
    }
    return toFinancialRequest(result.updated);
  }

  public async reject(
    id: string,
    input: unknown,
    actor: FinanceActor,
  ): Promise<FinancialRequestData> {
    const parsed = rejectSchema.parse(input);
    const decidedAt = new Date();

    const updated = await withTransaction(this.db, async (tx) => {
      const locked = await this.requests.lockById(id, tx);
      if (!locked) {
        throw new NotFoundError('Request not found.');
      }
      this.assertActionable(locked.status);
      await this.assertCanDecide(actor, locked.type);
      const row = await this.requests.update(
        locked.id,
        {
          status: 'REJECTED',
          reason: parsed.reason,
          decidedBy: actor.userId,
          decidedAt,
          updatedBy: actor.userId,
        },
        tx,
      );
      await this.writeAudit(
        tx,
        locked.id,
        'UPDATE',
        { status: locked.status },
        { status: 'REJECTED', reason: parsed.reason },
        actor,
      );
      if (!row) {
        throw new Error('Request update did not return a row.');
      }
      return row;
    });

    await this.events.publish({
      type: 'FinancialRequestRejected',
      requestId: updated.id,
      requestType: updated.type,
      memberId: updated.memberId,
      reason: parsed.reason,
      actorId: actor.userId,
      at: decidedAt,
    });
    return toFinancialRequest(updated);
  }

  public async hold(
    id: string,
    input: unknown,
    actor: FinanceActor,
  ): Promise<FinancialRequestData> {
    const parsed = decisionSchema.parse(input);

    const updated = await withTransaction(this.db, async (tx) => {
      const locked = await this.requests.lockById(id, tx);
      if (!locked) {
        throw new NotFoundError('Request not found.');
      }
      if (locked.status !== 'PENDING') {
        throw new ConflictError('Only a pending request can be put on hold.');
      }
      await this.assertCanDecide(actor, locked.type);
      const row = await this.requests.update(
        locked.id,
        {
          status: 'HOLD',
          ...(parsed.reason ? { reason: parsed.reason } : {}),
          updatedBy: actor.userId,
        },
        tx,
      );
      await this.writeAudit(
        tx,
        locked.id,
        'UPDATE',
        { status: locked.status },
        { status: 'HOLD' },
        actor,
      );
      if (!row) {
        throw new Error('Request update did not return a row.');
      }
      return row;
    });

    await this.events.publish({
      type: 'FinancialRequestHeld',
      requestId: updated.id,
      requestType: updated.type,
      memberId: updated.memberId,
      actorId: actor.userId,
      at: new Date(),
    });
    return toFinancialRequest(updated);
  }

  // --- Queries ---------------------------------------------------------------

  public async list(query: unknown): Promise<PaginatedFinancialRequests> {
    const parsed = listRequestsQuerySchema.parse(query);
    const { rows, total } = await this.requests.search(parsed);
    return buildPaginatedResult(rows.map(toFinancialRequest), total, parsed.page, parsed.pageSize);
  }

  public async getById(id: string): Promise<FinancialRequestData> {
    const row = await this.requests.findById(id);
    if (!row) {
      throw new NotFoundError('Request not found.');
    }
    return toFinancialRequest(row);
  }

  public async listByMember(memberId: string): Promise<FinancialRequestData[]> {
    const rows = await this.requests.findByMemberId(memberId);
    return rows.map(toFinancialRequest);
  }

  public async listTranchesByMember(memberId: string): Promise<DepositTrancheData[]> {
    const rows = await this.tranches.findByMemberId(memberId);
    return rows.map(toDepositTranche);
  }

  // --- Tranche lifecycle (Phase 2E) -----------------------------------------

  /**
   * Matures every LOCKED tranche whose maturity date has passed (scheduler +
   * admin manual run). Each tranche is processed in its own transaction and
   * credits its bonus (if any) exactly once — the ledger reference
   * `TXN-B-<trancheNumber>` is unique, so a re-run can never double-credit
   * (rule: idempotent, no double-crediting).
   */
  public async matureTranches(
    actor: FinanceActor,
    asOf: Date = new Date(),
  ): Promise<TrancheMaturityResult> {
    const candidates = await this.tranches.findMaturable(asOf);
    let maturedCount = 0;
    let bonusCreditedCents = 0;
    const toPublish: Array<{
      trancheId: string;
      memberId: string;
      walletId: string;
      bonusCents: number;
      transactionId: string | null;
    }> = [];

    for (const candidate of candidates) {
      const outcome = await withTransaction(this.db, async (tx) => {
        const locked = await this.tranches.lockById(candidate.id, tx);
        if (!locked || locked.status !== 'LOCKED' || locked.maturesAt.getTime() > asOf.getTime()) {
          return null;
        }
        let transactionId: string | null = null;
        if (locked.bonusCents > 0) {
          const credit = await this.wallet.creditWithin(
            tx,
            locked.walletId,
            {
              amountMinor: locked.bonusCents,
              reference: `TXN-B-${locked.trancheNumber}`,
              description: `Tranche matured — bonus (${locked.trancheNumber})`,
            },
            actor,
          );
          transactionId = credit.transactionId;
        }
        const updated = await this.tranches.update(
          locked.id,
          { status: 'MATURED', unlockedAt: asOf, updatedBy: actor.userId },
          tx,
        );
        await this.writeAudit(
          tx,
          locked.id,
          'UPDATE',
          { status: 'LOCKED' },
          { status: 'MATURED', bonusCents: locked.bonusCents, transactionId },
          actor,
          'deposit_tranche',
        );
        if (!updated) {
          throw new Error('Tranche update did not return a row.');
        }
        return { row: updated, transactionId, bonusCents: locked.bonusCents };
      });
      if (!outcome) {
        continue;
      }
      maturedCount += 1;
      bonusCreditedCents += outcome.bonusCents;
      toPublish.push({
        trancheId: outcome.row.id,
        memberId: outcome.row.memberId,
        walletId: outcome.row.walletId,
        bonusCents: outcome.bonusCents,
        transactionId: outcome.transactionId,
      });
    }

    for (const event of toPublish) {
      await this.events.publish({
        type: 'TrancheMatured',
        ...event,
        actorId: actor.userId,
        at: asOf,
      });
    }
    return { maturedCount, bonusCreditedCents };
  }

  /** Member self-service early-unlock (ownership enforced). */
  public async earlyUnlockMyTranche(
    userId: string,
    trancheId: string,
    actor: FinanceActor,
  ): Promise<DepositTrancheData> {
    const memberId = await this.memberIdForUser(userId);
    return this.earlyUnlockTranche(trancheId, actor, memberId);
  }

  /**
   * Early-unlocks (liquidates) a LOCKED tranche before maturity: forfeits the
   * pending bonus and charges the early-unlock fee, atomically. The fee rate is
   * the admin-configurable `financialLimits.earlyWithdrawFeeBps` — the reference
   * conflicts on the literal (users.html 5% vs limits.html 10%), so no value is
   * hardcoded (flagged unresolved). Insufficient balance for the fee rolls the
   * whole operation back (tranche stays LOCKED).
   */
  public async earlyUnlockTranche(
    trancheId: string,
    actor: FinanceActor,
    requireMemberId?: string,
  ): Promise<DepositTrancheData> {
    const limits = await this.limits.getOrCreate(actor.userId);
    const feeBps = limits.earlyWithdrawFeeBps;
    const now = new Date();

    const result = await withTransaction(this.db, async (tx) => {
      const locked = await this.tranches.lockById(trancheId, tx);
      if (!locked) {
        throw new NotFoundError('Tranche not found.');
      }
      if (requireMemberId && locked.memberId !== requireMemberId) {
        throw new ForbiddenError('This tranche does not belong to you.');
      }
      if (locked.status !== 'LOCKED') {
        throw new ConflictError('Only a locked tranche can be early-unlocked.');
      }
      const feeCents = Math.round((locked.principalCents * feeBps) / 10000);
      let transactionId: string | null = null;
      if (feeCents > 0) {
        const debit = await this.wallet.debitWithin(
          tx,
          locked.walletId,
          {
            amountMinor: feeCents,
            reference: `TXN-F-${locked.trancheNumber}`,
            description: `Early-unlock fee (${locked.trancheNumber})`,
          },
          actor,
        );
        transactionId = debit.transactionId;
      }
      const bonusForfeited = locked.bonusCents;
      const updated = await this.tranches.update(
        locked.id,
        { status: 'LIQUIDATED', unlockedAt: now, feeCents, bonusCents: 0, updatedBy: actor.userId },
        tx,
      );
      await this.writeAudit(
        tx,
        locked.id,
        'UPDATE',
        { status: 'LOCKED', bonusCents: bonusForfeited },
        { status: 'LIQUIDATED', feeCents, bonusForfeited, transactionId },
        actor,
        'deposit_tranche',
      );
      if (!updated) {
        throw new Error('Tranche update did not return a row.');
      }
      return { row: updated, feeCents, bonusForfeited, transactionId };
    });

    await this.events.publish({
      type: 'TrancheEarlyUnlocked',
      trancheId: result.row.id,
      memberId: result.row.memberId,
      walletId: result.row.walletId,
      feeCents: result.feeCents,
      bonusForfeitedCents: result.bonusForfeited,
      transactionId: result.transactionId,
      actorId: actor.userId,
      at: now,
    });
    return toDepositTranche(result.row);
  }

  // --- Limits policy (Phase 2C) ---------------------------------------------

  /** The system-wide deposit / withdrawal policy (materialised from defaults if absent). */
  public async getLimits(actor?: FinanceActor): Promise<FinancialLimitsData> {
    const row = await this.limits.getOrCreate(actor?.userId ?? null);
    return toFinancialLimits(row);
  }

  public async updateLimits(input: unknown, actor: FinanceActor): Promise<FinancialLimitsData> {
    const parsed = updateLimitsSchema.parse(input);
    const current = await this.limits.getOrCreate(actor.userId);
    const minDep = parsed.minDepositUnits ?? current.minDepositUnits;
    const maxDep = parsed.maxDepositUnits ?? current.maxDepositUnits;
    const minDays = parsed.processingMinDays ?? current.processingMinDays;
    const maxDays = parsed.processingMaxDays ?? current.processingMaxDays;
    if (maxDep < minDep) {
      throw new ValidationError('Maximum deposit must be greater than or equal to the minimum.');
    }
    if (maxDays < minDays) {
      throw new ValidationError(
        'Maximum processing time must be greater than or equal to the minimum.',
      );
    }

    const patch = {
      ...(parsed.minDepositUnits !== undefined ? { minDepositUnits: parsed.minDepositUnits } : {}),
      ...(parsed.maxDepositUnits !== undefined ? { maxDepositUnits: parsed.maxDepositUnits } : {}),
      ...(parsed.minWithdrawCents !== undefined
        ? { minWithdrawCents: parsed.minWithdrawCents }
        : {}),
      ...(parsed.earlyWithdrawAllowed !== undefined
        ? { earlyWithdrawAllowed: parsed.earlyWithdrawAllowed }
        : {}),
      ...(parsed.earlyWithdrawFeeBps !== undefined
        ? { earlyWithdrawFeeBps: parsed.earlyWithdrawFeeBps }
        : {}),
      ...(parsed.processingMinDays !== undefined
        ? { processingMinDays: parsed.processingMinDays }
        : {}),
      ...(parsed.processingMaxDays !== undefined
        ? { processingMaxDays: parsed.processingMaxDays }
        : {}),
      updatedBy: actor.userId,
    };

    const updated = await withTransaction(this.db, async (tx) => {
      const row = await this.limits.update(patch, tx);
      if (!row) {
        throw new Error('Finance limits update did not return a row.');
      }
      await this.audit.write(
        {
          entityType: 'financial_limits',
          entityId: row.id,
          action: 'UPDATE',
          oldValue: toFinancialLimits(current),
          newValue: toFinancialLimits(row),
          userId: actor.userId,
          ipAddress: actor.ipAddress,
          userAgent: actor.userAgent,
          module: MODULE,
          correlationId: actor.correlationId,
        },
        tx,
      );
      return row;
    });
    return toFinancialLimits(updated);
  }

  /** Resolves the caller's member id from their auth user id (portal). */
  public async memberIdForUser(userId: string): Promise<string> {
    const member = await this.members.findByUserId(userId);
    if (!member) {
      throw new NotFoundError('No member is linked to your account.');
    }
    return member.id;
  }

  // --- Internals -------------------------------------------------------------

  private async requireMember(memberId: string): Promise<void> {
    const member = await this.members.findById(memberId);
    if (!member) {
      throw new NotFoundError('Member not found.');
    }
  }

  private assertActionable(status: string): void {
    if (status !== 'PENDING' && status !== 'HOLD') {
      throw new ConflictError('This request has already been decided.');
    }
  }

  /**
   * Enforces the reference's split permissions: deciding a deposit needs
   * `deposits.approve`, a withdrawal needs `withdrawals.approve`. The route guard
   * already required at least one finance-approval permission; this refines it to
   * the specific request type.
   */
  private async assertCanDecide(actor: FinanceActor, type: FinancialRequestType): Promise<void> {
    const permission =
      type === 'DEPOSIT'
        ? PERMISSIONS.FINANCE_DEPOSIT_APPROVE
        : PERMISSIONS.FINANCE_WITHDRAW_APPROVE;
    if (!actor.userId || !(await this.authz.can(actor.userId, permission))) {
      throw new ForbiddenError(`You are not permitted to action ${type.toLowerCase()} requests.`);
    }
  }

  /** Finds the member's ACTIVE FINANCIAL wallet, creating one if absent. */
  private async ensureFinancialWallet(memberId: string, actor: FinanceActor): Promise<string> {
    const existing = await this.walletRepo.findByMemberId(memberId, 'FINANCIAL');
    if (existing) {
      return existing.id;
    }
    const created = await this.wallet.create(
      { memberId, kind: 'FINANCIAL', currencyCode: DEFAULT_CURRENCY, status: 'ACTIVE' },
      actor,
    );
    return created.id;
  }

  private async writeAudit(
    tx: Parameters<FinanceAuditRepository['write']>[1],
    entityId: string,
    action: 'CREATE' | 'UPDATE',
    oldValue: unknown,
    newValue: unknown,
    actor: FinanceActor,
    entityType = 'financial_request',
  ): Promise<void> {
    await this.audit.write(
      {
        entityType,
        entityId,
        action,
        oldValue,
        newValue,
        userId: actor.userId,
        ipAddress: actor.ipAddress,
        userAgent: actor.userAgent,
        module: MODULE,
        correlationId: actor.correlationId,
      },
      tx,
    );
  }
}
