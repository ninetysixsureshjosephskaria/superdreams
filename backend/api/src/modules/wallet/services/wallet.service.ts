import { randomUUID } from 'node:crypto';

import type { Database } from '@/database/client';
import { buildPaginatedResult } from '@/database/helpers';
import { withTransaction } from '@/database/helpers/transaction';
import type { Executor } from '@/database/types';
import { BusinessRuleError, ConflictError, NotFoundError, ValidationError } from '@/errors';

import {
  applyDelta,
  deltasFor,
  oppositeDirection,
  totalMinor,
  type BalanceSnapshot,
} from '../domain/balance';
import type {
  BalanceValidationResult,
  PaginatedTransactions,
  PaginatedWallets,
  TransactionDirection,
  TransactionType,
  WalletActor,
  WalletBalanceData,
  WalletDetail,
  WalletHoldData,
  WalletKind,
  WalletStatementData,
  WalletStatus,
  WalletSummary,
  WalletTransactionData,
} from '../dto';
import type { WalletEventBus } from '../events';
import {
  toWalletBalance,
  toWalletDetail,
  toWalletHold,
  toWalletStatement,
  toWalletSummary,
  toWalletTransaction,
  type WalletRow,
} from '../mappers';
import type {
  MemberLookupRepository,
  WalletAdjustmentRepository,
  WalletAuditRepository,
  WalletBalanceRepository,
  WalletHoldRepository,
  WalletLimitRepository,
  WalletRepository,
  WalletStatementRepository,
  WalletTransactionRepository,
} from '../repositories';
import {
  adjustmentSchema,
  changeWalletStatusSchema,
  createWalletSchema,
  creditSchema,
  debitSchema,
  generateStatementSchema,
  holdSchema,
  listTransactionsQuerySchema,
  listWalletsQuerySchema,
} from '../validators';

/** Platform default currency when a wallet does not specify one. */
const DEFAULT_CURRENCY = 'USD';
const MODULE = 'wallet';

const ALLOWED_STATUS_TRANSITIONS: Record<WalletStatus, readonly WalletStatus[]> = {
  PENDING: ['ACTIVE', 'CLOSED'],
  ACTIVE: ['SUSPENDED', 'CLOSED'],
  SUSPENDED: ['ACTIVE', 'CLOSED'],
  CLOSED: [],
};

interface ApplyParams {
  wallet: WalletRow;
  type: TransactionType;
  direction: TransactionDirection;
  amountMinor: number;
  reference: string;
  description?: string | null;
  holdId?: string | null;
  reversalOfId?: string | null;
  actor: WalletActor;
}

interface ApplyResult {
  transactionId: string;
  reference: string;
  availableAfterMinor: number;
  heldAfterMinor: number;
}

function reference(prefix: string): string {
  return `${prefix}-${randomUUID().slice(0, 12).toUpperCase()}`;
}

/**
 * Wallet business logic. The append-only ledger ({@link WalletTransactionRepository})
 * is the source of truth; the {@link WalletBalanceRepository} projection is kept
 * consistent inside the same database transaction as every balance change, with
 * the wallet and balance rows locked FOR UPDATE to serialise concurrent
 * operations. Every balance-changing operation writes an audit record.
 */
export class WalletService {
  public constructor(
    private readonly db: Database,
    private readonly wallets: WalletRepository,
    private readonly balances: WalletBalanceRepository,
    private readonly transactions: WalletTransactionRepository,
    private readonly holds: WalletHoldRepository,
    private readonly adjustments: WalletAdjustmentRepository,
    private readonly statements: WalletStatementRepository,
    private readonly limits: WalletLimitRepository,
    private readonly memberLookup: MemberLookupRepository,
    private readonly audit: WalletAuditRepository,
    private readonly events: WalletEventBus,
  ) {}

  // --- Queries ---------------------------------------------------------------

  public async list(query: unknown): Promise<PaginatedWallets> {
    const parsed = listWalletsQuerySchema.parse(query);
    const { rows, total } = await this.wallets.search(parsed);
    const balances = await this.balances.findByWalletIds(rows.map((w) => w.id));
    const byWallet = new Map(balances.map((b) => [b.walletId, b]));
    const items: WalletSummary[] = rows.map((wallet) => {
      const balance = byWallet.get(wallet.id);
      if (!balance) {
        throw new Error(`Wallet ${wallet.id} is missing its balance projection.`);
      }
      return toWalletSummary(wallet, balance);
    });
    return buildPaginatedResult(items, total, parsed.page, parsed.pageSize);
  }

  public async getDetail(id: string): Promise<WalletDetail> {
    const wallet = await this.requireWallet(id);
    return this.assembleDetail(wallet);
  }

  public async getBalance(id: string): Promise<WalletBalanceData> {
    await this.requireWallet(id);
    const balance = await this.balances.findByWalletId(id);
    if (!balance) {
      throw new Error(`Wallet ${id} is missing its balance projection.`);
    }
    return toWalletBalance(balance);
  }

  public async listTransactions(id: string, query: unknown): Promise<PaginatedTransactions> {
    await this.requireWallet(id);
    const parsed = listTransactionsQuerySchema.parse(query);
    const { rows, total } = await this.transactions.search(id, parsed);
    return buildPaginatedResult(rows.map(toWalletTransaction), total, parsed.page, parsed.pageSize);
  }

  public async listHolds(id: string): Promise<WalletHoldData[]> {
    await this.requireWallet(id);
    return (await this.holds.listByWallet(id)).map(toWalletHold);
  }

  public async listStatements(id: string): Promise<WalletStatementData[]> {
    await this.requireWallet(id);
    return (await this.statements.listByWallet(id)).map(toWalletStatement);
  }

  /**
   * Resolves the wallet owned by the given identity user (portal self-service).
   * Defaults to the LOYALTY wallet; pass `kind='FINANCIAL'` for the units wallet.
   */
  public async getByUserId(
    userId: string,
    kind: WalletKind = 'LOYALTY',
  ): Promise<WalletDetail | null> {
    const member = await this.memberLookup.findByUserId(userId);
    if (!member) {
      return null;
    }
    const wallet = await this.wallets.findByMemberId(member.id, kind);
    return wallet ? this.assembleDetail(wallet) : null;
  }

  // --- Lifecycle -------------------------------------------------------------

  public async create(input: unknown, actor: WalletActor): Promise<WalletDetail> {
    const data = createWalletSchema.parse(input);

    const member = await this.memberLookup.findById(data.memberId);
    if (!member) {
      throw new NotFoundError('Member not found.');
    }
    const kind = data.kind ?? 'LOYALTY';
    if (await this.wallets.findByMemberId(data.memberId, kind)) {
      throw new ConflictError(`This member already has a ${kind.toLowerCase()} wallet.`);
    }

    const currencyCode = data.currencyCode ?? DEFAULT_CURRENCY;
    const status: WalletStatus = data.status ?? 'PENDING';
    const walletNumber = reference('W');

    const wallet = await withTransaction(this.db, async (tx) => {
      const created = await this.wallets.create(
        {
          walletNumber,
          memberId: data.memberId,
          kind,
          currencyCode,
          status,
          ...(status === 'CLOSED' ? { closedAt: new Date() } : {}),
          createdBy: actor.userId,
          updatedBy: actor.userId,
        },
        tx,
      );
      await this.balances.create(
        { walletId: created.id, currencyCode, createdBy: actor.userId },
        tx,
      );
      await this.limits.create(
        {
          walletId: created.id,
          currencyCode,
          minBalanceMinor: data.limits?.minBalanceMinor ?? 0,
          maxBalanceMinor: data.limits?.maxBalanceMinor ?? null,
          dailyDebitLimitMinor: data.limits?.dailyDebitLimitMinor ?? null,
          singleTransactionLimitMinor: data.limits?.singleTransactionLimitMinor ?? null,
          allowNegative: data.limits?.allowNegative ?? false,
          createdBy: actor.userId,
        },
        tx,
      );
      await this.audit.write(
        {
          entityType: 'wallet',
          entityId: created.id,
          action: 'CREATE',
          newValue: { walletNumber, memberId: data.memberId, currencyCode, status },
          userId: actor.userId,
          ipAddress: actor.ipAddress,
          userAgent: actor.userAgent,
          module: MODULE,
          correlationId: actor.correlationId,
        },
        tx,
      );
      return created;
    });

    await this.events.publish({
      type: 'WalletCreated',
      walletId: wallet.id,
      memberId: wallet.memberId,
      actorId: actor.userId,
      at: new Date(),
    });
    return this.assembleDetail(wallet);
  }

  public async changeStatus(id: string, input: unknown, actor: WalletActor): Promise<WalletDetail> {
    const data = changeWalletStatusSchema.parse(input);
    const wallet = await this.requireWallet(id);
    const from = wallet.status;
    const to = data.status;

    if (from === to) {
      throw new ValidationError(`Wallet is already ${to}.`);
    }
    if (!ALLOWED_STATUS_TRANSITIONS[from].includes(to)) {
      throw new ValidationError(`Cannot change wallet status from ${from} to ${to}.`);
    }
    if (to === 'CLOSED') {
      const balance = await this.balances.findByWalletId(id);
      if (balance && balance.heldMinor !== 0) {
        throw new BusinessRuleError('Cannot close a wallet with active holds.');
      }
    }

    const updated =
      (await this.wallets.update(id, {
        status: to,
        updatedBy: actor.userId,
        ...(to === 'CLOSED' ? { closedAt: new Date() } : {}),
      })) ?? wallet;

    await this.audit.write(
      {
        entityType: 'wallet',
        entityId: id,
        action: 'UPDATE',
        oldValue: { status: from },
        newValue: { status: to, reason: data.reason ?? null },
        userId: actor.userId,
        ipAddress: actor.ipAddress,
        userAgent: actor.userAgent,
        module: MODULE,
        correlationId: actor.correlationId,
      },
      this.db,
    );

    await this.events.publish({
      type: 'WalletStatusChanged',
      walletId: id,
      fromStatus: from,
      toStatus: to,
      actorId: actor.userId,
      at: new Date(),
    });
    if (to === 'ACTIVE') {
      await this.events.publish({
        type: 'WalletActivated',
        walletId: id,
        actorId: actor.userId,
        at: new Date(),
      });
    } else if (to === 'SUSPENDED') {
      await this.events.publish({
        type: 'WalletSuspended',
        walletId: id,
        actorId: actor.userId,
        reason: data.reason ?? null,
        at: new Date(),
      });
    } else if (to === 'CLOSED') {
      await this.events.publish({
        type: 'WalletClosed',
        walletId: id,
        actorId: actor.userId,
        reason: data.reason ?? null,
        at: new Date(),
      });
    }
    return this.assembleDetail(updated);
  }

  // --- Transactions ----------------------------------------------------------

  public async credit(
    id: string,
    input: unknown,
    actor: WalletActor,
  ): Promise<WalletTransactionData> {
    const data = creditSchema.parse(input);
    const wallet = await this.requireActiveWallet(id);
    const result = await withTransaction(this.db, (tx) =>
      this.applyTransaction(tx, {
        wallet,
        type: 'CREDIT',
        direction: 'CREDIT',
        amountMinor: data.amountMinor,
        reference: data.reference ?? reference('TXN'),
        description: data.description ?? null,
        actor,
      }),
    );
    await this.events.publish({
      type: 'WalletCredited',
      walletId: id,
      transactionId: result.transactionId,
      amountMinor: data.amountMinor,
      actorId: actor.userId,
      at: new Date(),
    });
    return this.requireTransaction(result.transactionId);
  }

  public async debit(
    id: string,
    input: unknown,
    actor: WalletActor,
  ): Promise<WalletTransactionData> {
    const data = debitSchema.parse(input);
    const wallet = await this.requireActiveWallet(id);
    const result = await withTransaction(this.db, (tx) =>
      this.applyTransaction(tx, {
        wallet,
        type: 'DEBIT',
        direction: 'DEBIT',
        amountMinor: data.amountMinor,
        reference: data.reference ?? reference('TXN'),
        description: data.description ?? null,
        actor,
      }),
    );
    await this.events.publish({
      type: 'WalletDebited',
      walletId: id,
      transactionId: result.transactionId,
      amountMinor: data.amountMinor,
      actorId: actor.userId,
      at: new Date(),
    });
    return this.requireTransaction(result.transactionId);
  }

  /**
   * Transaction-aware credit — applies a CREDIT to the wallet inside a caller-
   * provided transaction so higher-level financial operations (e.g. approving a
   * deposit AND creating its tranche) commit atomically (rule 14). Mirrors the
   * rewards `*Within(tx, …)` composition seam. Does not publish an event; the
   * composing service publishes its own domain event.
   */
  public async creditWithin(
    tx: Executor,
    walletId: string,
    input: { amountMinor: number; reference?: string; description?: string | null },
    actor: WalletActor,
  ): Promise<{ transactionId: string }> {
    const wallet = await this.requireActiveWallet(walletId, tx);
    const result = await this.applyTransaction(tx, {
      wallet,
      type: 'CREDIT',
      direction: 'CREDIT',
      amountMinor: input.amountMinor,
      reference: input.reference ?? reference('TXN'),
      description: input.description ?? null,
      actor,
    });
    return { transactionId: result.transactionId };
  }

  /** Transaction-aware debit — see {@link creditWithin}. */
  public async debitWithin(
    tx: Executor,
    walletId: string,
    input: { amountMinor: number; reference?: string; description?: string | null },
    actor: WalletActor,
  ): Promise<{ transactionId: string }> {
    const wallet = await this.requireActiveWallet(walletId, tx);
    const result = await this.applyTransaction(tx, {
      wallet,
      type: 'DEBIT',
      direction: 'DEBIT',
      amountMinor: input.amountMinor,
      reference: input.reference ?? reference('TXN'),
      description: input.description ?? null,
      actor,
    });
    return { transactionId: result.transactionId };
  }

  public async adjust(
    id: string,
    input: unknown,
    actor: WalletActor,
  ): Promise<WalletTransactionData> {
    const data = adjustmentSchema.parse(input);
    const wallet = await this.requireWallet(id);
    if (wallet.status === 'CLOSED') {
      throw new BusinessRuleError('Cannot adjust a closed wallet.');
    }
    const ref = data.reference ?? reference('ADJ');
    const result = await withTransaction(this.db, async (tx) => {
      const applied = await this.applyTransaction(tx, {
        wallet,
        type: 'ADJUSTMENT',
        direction: data.direction,
        amountMinor: data.amountMinor,
        reference: ref,
        description: data.reason,
        actor,
      });
      await this.adjustments.create(
        {
          walletId: id,
          transactionId: applied.transactionId,
          direction: data.direction,
          amountMinor: data.amountMinor,
          currencyCode: wallet.currencyCode,
          reason: data.reason,
          approvedBy: actor.userId,
        },
        tx,
      );
      return applied;
    });
    await this.events.publish({
      type: 'WalletAdjusted',
      walletId: id,
      transactionId: result.transactionId,
      direction: data.direction,
      amountMinor: data.amountMinor,
      actorId: actor.userId,
      at: new Date(),
    });
    return this.requireTransaction(result.transactionId);
  }

  public async placeHold(id: string, input: unknown, actor: WalletActor): Promise<WalletHoldData> {
    const data = holdSchema.parse(input);
    const wallet = await this.requireActiveWallet(id);
    const holdRef = data.reference ?? reference('HLD');
    const holdId = await withTransaction(this.db, async (tx) => {
      const applied = await this.applyTransaction(tx, {
        wallet,
        type: 'HOLD',
        direction: 'DEBIT',
        amountMinor: data.amountMinor,
        reference: reference('TXN'),
        description: data.reason ?? null,
        actor,
      });
      const hold = await this.holds.createHold(
        {
          walletId: id,
          reference: holdRef,
          amountMinor: data.amountMinor,
          currencyCode: wallet.currencyCode,
          reason: data.reason ?? null,
          placedBy: actor.userId,
          placeTransactionId: applied.transactionId,
        },
        tx,
      );
      await this.audit.write(
        {
          entityType: 'wallet_hold',
          entityId: hold.id,
          action: 'CREATE',
          newValue: { walletId: id, amountMinor: data.amountMinor, reference: holdRef },
          userId: actor.userId,
          ipAddress: actor.ipAddress,
          userAgent: actor.userAgent,
          module: MODULE,
          correlationId: actor.correlationId,
        },
        tx,
      );
      return hold.id;
    });
    await this.events.publish({
      type: 'WalletHoldPlaced',
      walletId: id,
      holdId,
      amountMinor: data.amountMinor,
      actorId: actor.userId,
      at: new Date(),
    });
    return this.requireHold(holdId);
  }

  public async releaseHold(
    id: string,
    holdId: string,
    actor: WalletActor,
  ): Promise<WalletHoldData> {
    const wallet = await this.requireWallet(id);
    if (wallet.status === 'CLOSED') {
      throw new BusinessRuleError('Cannot release holds on a closed wallet.');
    }
    const hold = await this.holds.findActiveById(holdId, id);
    if (!hold) {
      throw new NotFoundError('Active hold not found.');
    }
    await withTransaction(this.db, async (tx) => {
      const applied = await this.applyTransaction(tx, {
        wallet,
        type: 'RELEASE',
        direction: 'CREDIT',
        amountMinor: hold.amountMinor,
        reference: reference('TXN'),
        description: `Release of hold ${hold.reference}`,
        holdId: hold.id,
        actor,
      });
      await this.holds.markReleased(hold.id, actor.userId, applied.transactionId, tx);
      await this.audit.write(
        {
          entityType: 'wallet_hold',
          entityId: hold.id,
          action: 'UPDATE',
          oldValue: { status: 'ACTIVE' },
          newValue: { status: 'RELEASED' },
          userId: actor.userId,
          ipAddress: actor.ipAddress,
          userAgent: actor.userAgent,
          module: MODULE,
          correlationId: actor.correlationId,
        },
        tx,
      );
    });
    await this.events.publish({
      type: 'WalletHoldReleased',
      walletId: id,
      holdId: hold.id,
      amountMinor: hold.amountMinor,
      actorId: actor.userId,
      at: new Date(),
    });
    return this.requireHold(hold.id);
  }

  public async reverse(
    id: string,
    transactionId: string,
    actor: WalletActor,
  ): Promise<WalletTransactionData> {
    const wallet = await this.requireWallet(id);
    if (wallet.status === 'CLOSED') {
      throw new BusinessRuleError('Cannot reverse transactions on a closed wallet.');
    }
    const original = await this.transactions.findById(transactionId);
    if (!original || original.walletId !== id) {
      throw new NotFoundError('Transaction not found.');
    }
    if (original.status === 'REVERSED') {
      throw new BusinessRuleError('Transaction has already been reversed.');
    }
    if (!['CREDIT', 'DEBIT', 'ADJUSTMENT'].includes(original.type)) {
      throw new BusinessRuleError('Only credit, debit and adjustment entries can be reversed.');
    }

    const result = await withTransaction(this.db, async (tx) => {
      const applied = await this.applyTransaction(tx, {
        wallet,
        type: 'REVERSAL',
        direction: oppositeDirection(original.direction),
        amountMinor: original.amountMinor,
        reference: reference('REV'),
        description: `Reversal of ${original.reference}`,
        reversalOfId: original.id,
        actor,
      });
      await this.transactions.markReversed(original.id, tx);
      await this.audit.write(
        {
          entityType: 'wallet_transaction',
          entityId: original.id,
          action: 'UPDATE',
          oldValue: { status: 'POSTED' },
          newValue: { status: 'REVERSED', reversalId: applied.transactionId },
          userId: actor.userId,
          ipAddress: actor.ipAddress,
          userAgent: actor.userAgent,
          module: MODULE,
          correlationId: actor.correlationId,
        },
        tx,
      );
      return applied;
    });
    await this.events.publish({
      type: 'WalletTransactionReversed',
      walletId: id,
      transactionId: original.id,
      reversalId: result.transactionId,
      actorId: actor.userId,
      at: new Date(),
    });
    return this.requireTransaction(result.transactionId);
  }

  // --- Statements & integrity ------------------------------------------------

  public async generateStatement(
    id: string,
    input: unknown,
    actor: WalletActor,
  ): Promise<WalletStatementData> {
    const data = generateStatementSchema.parse(input);
    const wallet = await this.requireWallet(id);

    const periodEnd = data.periodEnd ? new Date(data.periodEnd) : new Date();
    const periodStart = data.periodStart
      ? new Date(data.periodStart)
      : new Date(periodEnd.getTime() - 30 * 24 * 60 * 60 * 1000);
    if (periodStart.getTime() > periodEnd.getTime()) {
      throw new ValidationError('Statement period start must be before its end.');
    }

    const all = await this.transactions.listAllByWallet(id);
    let opening = 0;
    let closing = 0;
    let credits = 0;
    let debits = 0;
    let count = 0;
    for (const txn of all) {
      const delta = deltasFor(txn.type, txn.direction, txn.amountMinor).availableMinor;
      const at = txn.createdAt.getTime();
      if (at < periodStart.getTime()) {
        opening += delta;
        closing += delta;
        continue;
      }
      if (at <= periodEnd.getTime()) {
        closing += delta;
        count += 1;
        if (delta >= 0) {
          credits += delta;
        } else {
          debits += -delta;
        }
      }
    }

    const statement = await this.statements.create({
      walletId: id,
      reference: reference('STM'),
      periodStart,
      periodEnd,
      currencyCode: wallet.currencyCode,
      openingBalanceMinor: opening,
      closingBalanceMinor: closing,
      totalCreditsMinor: credits,
      totalDebitsMinor: debits,
      transactionCount: count,
      generatedBy: actor.userId,
    });

    await this.audit.write(
      {
        entityType: 'wallet_statement',
        entityId: statement.id,
        action: 'CREATE',
        newValue: { walletId: id, reference: statement.reference },
        userId: actor.userId,
        ipAddress: actor.ipAddress,
        userAgent: actor.userAgent,
        module: MODULE,
        correlationId: actor.correlationId,
      },
      this.db,
    );
    await this.events.publish({
      type: 'StatementGenerated',
      walletId: id,
      statementId: statement.id,
      actorId: actor.userId,
      at: new Date(),
    });
    return toWalletStatement(statement);
  }

  /**
   * Recomputes the balance from the ledger and compares it to the stored
   * projection. Powers ledger-integrity checks and daily balance validation.
   */
  public async validateBalance(id: string): Promise<BalanceValidationResult> {
    await this.requireWallet(id);
    const stored = await this.balances.findByWalletId(id);
    if (!stored) {
      throw new Error(`Wallet ${id} is missing its balance projection.`);
    }
    const derived = await this.deriveBalance(id);
    return {
      walletId: id,
      consistent:
        derived.availableMinor === stored.availableMinor && derived.heldMinor === stored.heldMinor,
      storedAvailableMinor: stored.availableMinor,
      storedHeldMinor: stored.heldMinor,
      derivedAvailableMinor: derived.availableMinor,
      derivedHeldMinor: derived.heldMinor,
    };
  }

  /** Folds the entire ledger into an available/held balance. */
  public async deriveBalance(id: string): Promise<BalanceSnapshot> {
    const all = await this.transactions.listAllByWallet(id);
    return all.reduce<BalanceSnapshot>(
      (snapshot, txn) => applyDelta(snapshot, deltasFor(txn.type, txn.direction, txn.amountMinor)),
      { availableMinor: 0, heldMinor: 0 },
    );
  }

  // --- Internals -------------------------------------------------------------

  /**
   * Applies a single balance-changing transaction atomically: locks the wallet
   * and balance rows, enforces balance rules, writes the ledger entry and the
   * updated projection, and audits the operation — all inside `tx`.
   */
  private async applyTransaction(tx: Executor, params: ApplyParams): Promise<ApplyResult> {
    const { wallet, actor } = params;

    // Lock wallet + balance rows to serialise concurrent operations.
    await this.wallets.lockById(wallet.id, tx);
    const balanceRow = await this.balances.lockByWalletId(wallet.id, tx);
    if (!balanceRow) {
      throw new Error(`Wallet ${wallet.id} is missing its balance projection.`);
    }

    const current: BalanceSnapshot = {
      availableMinor: balanceRow.availableMinor,
      heldMinor: balanceRow.heldMinor,
    };
    const delta = deltasFor(params.type, params.direction, params.amountMinor);
    const next = applyDelta(current, delta);

    await this.enforceBalanceRules(tx, wallet.id, params, next);

    await this.balances.setBalances(
      wallet.id,
      { availableMinor: next.availableMinor, heldMinor: next.heldMinor },
      actor.userId,
      tx,
    );

    const entry = await this.transactions.append(
      {
        walletId: wallet.id,
        reference: params.reference,
        type: params.type,
        direction: params.direction,
        amountMinor: params.amountMinor,
        currencyCode: wallet.currencyCode,
        availableAfterMinor: next.availableMinor,
        heldAfterMinor: next.heldMinor,
        description: params.description ?? null,
        holdId: params.holdId ?? null,
        reversalOfId: params.reversalOfId ?? null,
        createdBy: actor.userId,
      },
      tx,
    );

    await this.audit.write(
      {
        entityType: 'wallet_transaction',
        entityId: entry.id,
        action: 'CREATE',
        newValue: {
          walletId: wallet.id,
          type: params.type,
          direction: params.direction,
          amountMinor: params.amountMinor,
          availableAfterMinor: next.availableMinor,
          heldAfterMinor: next.heldMinor,
        },
        userId: actor.userId,
        ipAddress: actor.ipAddress,
        userAgent: actor.userAgent,
        module: MODULE,
        correlationId: actor.correlationId,
      },
      tx,
    );

    return {
      transactionId: entry.id,
      reference: entry.reference,
      availableAfterMinor: next.availableMinor,
      heldAfterMinor: next.heldMinor,
    };
  }

  /** Balance invariants — evaluated against the wallet's configured limits. */
  private async enforceBalanceRules(
    executor: Executor,
    walletId: string,
    params: ApplyParams,
    next: BalanceSnapshot,
  ): Promise<void> {
    if (next.heldMinor < 0) {
      throw new BusinessRuleError('Held balance cannot be negative.');
    }

    const limits = await this.limits.findByWalletId(walletId, executor);
    const minBalance = limits?.minBalanceMinor ?? 0;
    const allowNegative = limits?.allowNegative ?? false;

    if (!allowNegative && next.availableMinor < minBalance) {
      throw new BusinessRuleError('Insufficient available balance for this operation.');
    }
    if (
      limits?.singleTransactionLimitMinor != null &&
      params.amountMinor > limits.singleTransactionLimitMinor
    ) {
      throw new BusinessRuleError('Amount exceeds the single-transaction limit.');
    }
    if (limits?.maxBalanceMinor != null && totalMinor(next) > limits.maxBalanceMinor) {
      throw new BusinessRuleError('Operation would exceed the maximum wallet balance.');
    }
  }

  private async assembleDetail(wallet: WalletRow): Promise<WalletDetail> {
    const [balance, limits] = await Promise.all([
      this.balances.findByWalletId(wallet.id),
      this.limits.findByWalletId(wallet.id),
    ]);
    if (!balance) {
      throw new Error(`Wallet ${wallet.id} is missing its balance projection.`);
    }
    return toWalletDetail(wallet, balance, limits);
  }

  private async requireWallet(id: string, executor: Executor = this.db): Promise<WalletRow> {
    const wallet = await this.wallets.findById(id, executor);
    if (!wallet) {
      throw new NotFoundError('Wallet not found.');
    }
    return wallet;
  }

  private async requireActiveWallet(id: string, executor: Executor = this.db): Promise<WalletRow> {
    const wallet = await this.requireWallet(id, executor);
    if (wallet.status !== 'ACTIVE') {
      throw new BusinessRuleError(`Wallet must be ACTIVE (currently ${wallet.status}).`);
    }
    return wallet;
  }

  private async requireTransaction(id: string): Promise<WalletTransactionData> {
    const txn = await this.transactions.findById(id);
    if (!txn) {
      throw new NotFoundError('Transaction not found.');
    }
    return toWalletTransaction(txn);
  }

  private async requireHold(id: string): Promise<WalletHoldData> {
    const hold = await this.holds.findById(id);
    if (!hold) {
      throw new NotFoundError('Hold not found.');
    }
    return toWalletHold(hold);
  }
}
