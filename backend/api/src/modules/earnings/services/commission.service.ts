import type { Database } from '@/database/client';
import { withTransaction } from '@/database/helpers/transaction';
import { NotFoundError, ValidationError } from '@/errors';
import type { WalletService } from '@/modules/wallet';
import type { WalletRepository } from '@/modules/wallet/repositories';

import { commissionCents, DEFAULT_TIERS, matchTierRateBps, type TierShape } from '../domain/tiers';
import type {
  CommissionConfigView,
  CommissionTargetData,
  CommissionTierData,
  DepositEarningsResult,
  EarningsActor,
} from '../dto';
import type {
  CommissionConfigRepository,
  CommissionEarningRepository,
  CommissionTargetRepository,
  CommissionTierRepository,
  CommissionTierRow,
  DepositLookupRepository,
  EarningsAuditRepository,
  MemberRelationshipRepository,
} from '../repositories';
import {
  createTargetSchema,
  processDepositSchema,
  setDefaultTiersSchema,
  updateReferralRateSchema,
} from '../validators';

/**
 * Supplies a partner's total network units for commission tiering. Adapted in
 * composition from the network + wallet modules; a narrow port keeps earnings
 * decoupled (and lets tests stub it).
 */
export interface NetworkUnitsPort {
  totalNetworkUnits(partnerMemberId: string): Promise<number>;
}

const MODULE_CURRENCY = 'USD';

function toTier(row: CommissionTierRow): CommissionTierData {
  return { id: row.id, fromUnits: row.fromUnits, toUnits: row.toUnits, rateBps: row.rateBps };
}

function tierShapes(rows: CommissionTierRow[]): TierShape[] {
  return rows.map((r) => ({ fromUnits: r.fromUnits, toUnits: r.toUnits, rateBps: r.rateBps }));
}

/**
 * Commission & referral (Phase 2E). Admin configures the default tier table,
 * date-ranged targets, and the one-time referral rate. On a member deposit the
 * engine credits the member's partner a tiered commission (TXN-C, matched by the
 * partner's total network units) and a one-time referral to the member's referrer
 * (TXN-R). Every credit is atomic and **idempotent** — the `commission_earnings`
 * dedupe key and the unique ledger reference both prevent double-crediting.
 */
export class CommissionService {
  public constructor(
    private readonly db: Database,
    private readonly wallet: WalletService,
    private readonly walletRepo: WalletRepository,
    private readonly config: CommissionConfigRepository,
    private readonly tiers: CommissionTierRepository,
    private readonly targets: CommissionTargetRepository,
    private readonly earnings: CommissionEarningRepository,
    private readonly deposits: DepositLookupRepository,
    private readonly members: MemberRelationshipRepository,
    private readonly audit: EarningsAuditRepository,
    private readonly networkUnits: NetworkUnitsPort,
  ) {}

  // --- Config (commission.manage) -------------------------------------------

  public async getConfig(actor: EarningsActor): Promise<CommissionConfigView> {
    const cfg = await this.config.getOrCreate(actor.userId);
    await this.ensureDefaultsSeeded(actor);
    const [defaultTiers, targets] = await Promise.all([
      this.tiers.findDefault(),
      this.targets.list(),
    ]);
    const targetViews: CommissionTargetData[] = [];
    for (const target of targets) {
      const tierRows = await this.tiers.findByTarget(target.id);
      targetViews.push({
        id: target.id,
        startDate: target.startDate,
        endDate: target.endDate,
        tiers: tierRows.map(toTier),
      });
    }
    return {
      referralRateBps: cfg.referralRateBps,
      defaultTiers: defaultTiers.map(toTier),
      targets: targetViews,
    };
  }

  public async updateReferralRate(
    input: unknown,
    actor: EarningsActor,
  ): Promise<CommissionConfigView> {
    const { rateBps } = updateReferralRateSchema.parse(input);
    await this.config.getOrCreate(actor.userId);
    await this.config.updateReferralRate(rateBps, actor.userId);
    return this.getConfig(actor);
  }

  public async setDefaultTiers(
    input: unknown,
    actor: EarningsActor,
  ): Promise<CommissionConfigView> {
    const { tiers } = setDefaultTiersSchema.parse(input);
    await withTransaction(this.db, async (tx) => {
      await this.tiers.replaceDefault(
        tiers.map((t) => ({
          fromUnits: t.fromUnits,
          toUnits: t.toUnits ?? null,
          rateBps: t.rateBps,
        })),
        actor.userId,
        tx,
      );
      await this.audit.write(
        {
          entityType: 'commission_default_tiers',
          entityId: null,
          action: 'UPDATE',
          newValue: { tiers },
          ...this.ctx(actor),
        },
        tx,
      );
    });
    return this.getConfig(actor);
  }

  public async createTarget(input: unknown, actor: EarningsActor): Promise<CommissionTargetData> {
    const data = createTargetSchema.parse(input);
    const existing = await this.targets.list();
    const overlaps = existing.some(
      (t) => data.startDate <= t.endDate && data.endDate >= t.startDate,
    );
    if (overlaps) {
      throw new ValidationError('These dates overlap another target.');
    }

    const created = await withTransaction(this.db, async (tx) => {
      const target = await this.targets.create(
        { startDate: data.startDate, endDate: data.endDate, createdBy: actor.userId },
        tx,
      );
      await this.tiers.createForTarget(
        target.id,
        data.tiers.map((t) => ({
          fromUnits: t.fromUnits,
          toUnits: t.toUnits ?? null,
          rateBps: t.rateBps,
        })),
        actor.userId,
        tx,
      );
      await this.audit.write(
        {
          entityType: 'commission_target',
          entityId: target.id,
          action: 'CREATE',
          newValue: { startDate: data.startDate, endDate: data.endDate, tiers: data.tiers },
          ...this.ctx(actor),
        },
        tx,
      );
      return target;
    });

    const tierRows = await this.tiers.findByTarget(created.id);
    return {
      id: created.id,
      startDate: created.startDate,
      endDate: created.endDate,
      tiers: tierRows.map(toTier),
    };
  }

  public async deleteTarget(id: string, actor: EarningsActor): Promise<void> {
    const target = await this.targets.findById(id);
    if (!target) {
      throw new NotFoundError('Commission target not found.');
    }
    await this.targets.softDelete(id, actor.userId);
  }

  /** Resolves the commission rate (bps) for a network-unit total on a given date. */
  public async resolveRateBps(
    networkUnits: number,
    dateStr: string,
    actor: EarningsActor,
  ): Promise<number> {
    const target = await this.targets.findActive(dateStr);
    let tierRows: CommissionTierRow[];
    if (target) {
      tierRows = await this.tiers.findByTarget(target.id);
    } else {
      await this.ensureDefaultsSeeded(actor);
      tierRows = await this.tiers.findDefault();
    }
    return matchTierRateBps(tierShapes(tierRows), networkUnits);
  }

  // --- Engine ----------------------------------------------------------------

  /**
   * Credits partner commission + one-time referral for an approved member
   * deposit. Idempotent: re-invoking for the same deposit credits nothing more.
   */
  public async processDepositEarnings(
    input: unknown,
    actor: EarningsActor,
  ): Promise<DepositEarningsResult> {
    const { depositRequestId } = processDepositSchema.parse(input);
    const deposit = await this.deposits.getApprovedDeposit(depositRequestId);
    if (!deposit) {
      throw new NotFoundError('Approved deposit not found.');
    }
    const member = await this.members.get(deposit.memberId);
    if (!member) {
      throw new NotFoundError('Member not found.');
    }
    const result: DepositEarningsResult = { commission: null, referral: null };
    const dateStr = new Date().toISOString().slice(0, 10);

    // Commission → the depositing member's partner.
    if (member.partnerId) {
      const dedupeKey = `C:${deposit.id}`;
      if (!(await this.earnings.findByDedupe(dedupeKey))) {
        const networkUnits = await this.networkUnits.totalNetworkUnits(member.partnerId);
        const rateBps = await this.resolveRateBps(networkUnits, dateStr, actor);
        const amountCents = commissionCents(deposit.amountCents, rateBps);
        if (amountCents > 0) {
          const walletId = await this.ensureFinancialWallet(member.partnerId, actor);
          const txId = await this.creditEarning(
            {
              dedupeKey,
              type: 'COMMISSION',
              depositRequestId: deposit.id,
              beneficiaryMemberId: member.partnerId,
              sourceMemberId: deposit.memberId,
              amountCents,
              rateBps,
              networkUnits,
              walletId,
              reference: `TXN-C-${deposit.id}`,
              description: `Commission on deposit ${deposit.id}`,
            },
            actor,
          );
          result.commission = {
            beneficiaryMemberId: member.partnerId,
            amountCents,
            rateBps,
            networkUnits,
            transactionId: txId,
          };
        }
      }
    }

    // Referral → the depositing member's referrer (one-time per referred member).
    if (member.referredBy) {
      const dedupeKey = `R:${deposit.memberId}`;
      if (!(await this.earnings.findByDedupe(dedupeKey))) {
        const cfg = await this.config.getOrCreate(actor.userId);
        const amountCents = commissionCents(deposit.amountCents, cfg.referralRateBps);
        if (amountCents > 0) {
          const walletId = await this.ensureFinancialWallet(member.referredBy, actor);
          const txId = await this.creditEarning(
            {
              dedupeKey,
              type: 'REFERRAL',
              depositRequestId: deposit.id,
              beneficiaryMemberId: member.referredBy,
              sourceMemberId: deposit.memberId,
              amountCents,
              rateBps: cfg.referralRateBps,
              networkUnits: null,
              walletId,
              reference: `TXN-R-${deposit.memberId}`,
              description: `Referral bonus for ${deposit.memberId}`,
            },
            actor,
          );
          result.referral = {
            beneficiaryMemberId: member.referredBy,
            amountCents,
            rateBps: cfg.referralRateBps,
            transactionId: txId,
          };
        }
      }
    }

    return result;
  }

  public async listEarningsForMember(
    memberId: string,
  ): Promise<Array<{ type: string; amountCents: number; rateBps: number; creditedAt: string }>> {
    const rows = await this.earnings.listByBeneficiary(memberId);
    return rows.map((r) => ({
      type: r.type,
      amountCents: r.amountCents,
      rateBps: r.rateBps,
      creditedAt: r.creditedAt.toISOString(),
    }));
  }

  // --- Internals -------------------------------------------------------------

  private async creditEarning(
    params: {
      dedupeKey: string;
      type: 'COMMISSION' | 'REFERRAL';
      depositRequestId: string;
      beneficiaryMemberId: string;
      sourceMemberId: string;
      amountCents: number;
      rateBps: number;
      networkUnits: number | null;
      walletId: string;
      reference: string;
      description: string;
    },
    actor: EarningsActor,
  ): Promise<string> {
    return withTransaction(this.db, async (tx) => {
      const credit = await this.wallet.creditWithin(
        tx,
        params.walletId,
        {
          amountMinor: params.amountCents,
          reference: params.reference,
          description: params.description,
        },
        actor,
      );
      const earning = await this.earnings.create(
        {
          dedupeKey: params.dedupeKey,
          type: params.type,
          depositRequestId: params.depositRequestId,
          beneficiaryMemberId: params.beneficiaryMemberId,
          sourceMemberId: params.sourceMemberId,
          amountCents: params.amountCents,
          rateBps: params.rateBps,
          networkUnits: params.networkUnits,
          transactionId: credit.transactionId,
          createdBy: actor.userId,
          updatedBy: actor.userId,
        },
        tx,
      );
      await this.audit.write(
        {
          entityType: 'commission_earning',
          entityId: earning.id,
          action: 'CREATE',
          newValue: {
            type: params.type,
            amountCents: params.amountCents,
            rateBps: params.rateBps,
            networkUnits: params.networkUnits,
          },
          ...this.ctx(actor),
        },
        tx,
      );
      return credit.transactionId;
    });
  }

  private async ensureFinancialWallet(memberId: string, actor: EarningsActor): Promise<string> {
    const existing = await this.walletRepo.findByMemberId(memberId, 'FINANCIAL');
    if (existing) {
      return existing.id;
    }
    const created = await this.wallet.create(
      { memberId, kind: 'FINANCIAL', currencyCode: MODULE_CURRENCY, status: 'ACTIVE' },
      actor,
    );
    return created.id;
  }

  private async ensureDefaultsSeeded(actor: EarningsActor): Promise<void> {
    const existing = await this.tiers.findDefault();
    if (existing.length === 0) {
      await this.tiers.replaceDefault([...DEFAULT_TIERS], actor.userId);
    }
  }

  private ctx(
    actor: EarningsActor,
  ): Pick<
    Parameters<EarningsAuditRepository['write']>[0],
    'userId' | 'ipAddress' | 'userAgent' | 'correlationId'
  > {
    return {
      userId: actor.userId,
      ipAddress: actor.ipAddress,
      userAgent: actor.userAgent,
      correlationId: actor.correlationId,
    };
  }
}
