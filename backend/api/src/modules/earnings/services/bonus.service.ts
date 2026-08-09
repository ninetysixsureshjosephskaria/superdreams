import type { Database } from '@/database/client';
import { withTransaction } from '@/database/helpers/transaction';
import { BusinessRuleError, NotFoundError } from '@/errors';
import type { DepositTrancheRepository } from '@/modules/finance/repositories';

import {
  bonusCents,
  deriveStatus,
  isLive,
  selectCampaign,
  type CampaignWindow,
} from '../domain/bonus';
import type { BonusApplicationResult, BonusCampaignData, EarningsActor } from '../dto';
import type {
  BonusCampaignRepository,
  BonusCampaignRow,
  BonusClaimRepository,
  DepositLookupRepository,
  EarningsAuditRepository,
} from '../repositories';
import {
  applyBonusSchema,
  createBonusCampaignSchema,
  updateBonusCampaignSchema,
} from '../validators';

function toWindow(row: BonusCampaignRow): CampaignWindow {
  return {
    id: row.id,
    rateBps: row.rateBps,
    enabled: row.enabled,
    permanent: row.permanent,
    startAt: row.startAt,
    endAt: row.endAt,
    createdAt: row.createdAt,
  };
}

function toCampaign(row: BonusCampaignRow, now: Date): BonusCampaignData {
  return {
    id: row.id,
    name: row.name,
    icon: row.icon,
    scope: row.scope,
    frequency: row.frequency,
    rateBps: row.rateBps,
    lockDays: row.lockDays,
    minUnits: row.minUnits,
    permanent: row.permanent,
    startAt: row.startAt ? row.startAt.toISOString() : null,
    endAt: row.endAt ? row.endAt.toISOString() : null,
    enabled: row.enabled,
    status: deriveStatus(toWindow(row), now),
    createdAt: row.createdAt.toISOString(),
  };
}

/**
 * Bonus Campaigns (Phase 2E). Admin CRUD of deposit-bonus campaigns; on an
 * approved deposit the eligible LIVE campaign is selected deterministically and
 * its bonus is written to the deposit's tranche `bonus_cents` (realised as TXN-B
 * at tranche maturity — reusing the existing tranche lifecycle, forfeited on
 * early unlock). Application is **idempotent**: `bonus_claims.dedupeKey`
 * (`B:<depositId>`) is unique, so a deposit is bonused at most once.
 */
export class BonusService {
  public constructor(
    private readonly db: Database,
    private readonly campaigns: BonusCampaignRepository,
    private readonly claims: BonusClaimRepository,
    private readonly deposits: DepositLookupRepository,
    private readonly tranches: DepositTrancheRepository,
    private readonly audit: EarningsAuditRepository,
  ) {}

  // --- CRUD (bonus.manage) ---------------------------------------------------

  public async list(): Promise<BonusCampaignData[]> {
    const now = new Date();
    const rows = await this.campaigns.list();
    return rows.map((r) => toCampaign(r, now));
  }

  public async get(id: string): Promise<BonusCampaignData> {
    const row = await this.campaigns.findById(id);
    if (!row) {
      throw new NotFoundError('Bonus campaign not found.');
    }
    return toCampaign(row, new Date());
  }

  public async create(input: unknown, actor: EarningsActor): Promise<BonusCampaignData> {
    const data = createBonusCampaignSchema.parse(input);
    const row = await this.campaigns.create({
      name: data.name,
      icon: data.icon ?? null,
      scope: data.scope,
      frequency: data.frequency,
      rateBps: data.rateBps,
      lockDays: data.lockDays,
      minUnits: data.minUnits,
      permanent: data.permanent ?? false,
      startAt: data.startAt ? new Date(data.startAt) : null,
      endAt: data.endAt ? new Date(data.endAt) : null,
      enabled: data.enabled ?? true,
      createdBy: actor.userId,
      updatedBy: actor.userId,
    });
    await withTransaction(this.db, async (tx) => {
      await this.writeAudit(
        tx,
        row.id,
        'CREATE',
        null,
        { name: data.name, rateBps: data.rateBps },
        actor,
      );
    });
    return toCampaign(row, new Date());
  }

  public async update(
    id: string,
    input: unknown,
    actor: EarningsActor,
  ): Promise<BonusCampaignData> {
    const data = updateBonusCampaignSchema.parse(input);
    const existing = await this.campaigns.findById(id);
    if (!existing) {
      throw new NotFoundError('Bonus campaign not found.');
    }
    const patch: Partial<BonusCampaignRow> = { updatedBy: actor.userId };
    if (data.name !== undefined) patch.name = data.name;
    if (data.icon !== undefined) patch.icon = data.icon;
    if (data.scope !== undefined) patch.scope = data.scope;
    if (data.frequency !== undefined) patch.frequency = data.frequency;
    if (data.rateBps !== undefined) patch.rateBps = data.rateBps;
    if (data.lockDays !== undefined) patch.lockDays = data.lockDays;
    if (data.minUnits !== undefined) patch.minUnits = data.minUnits;
    if (data.permanent !== undefined) patch.permanent = data.permanent;
    if (data.startAt !== undefined) patch.startAt = data.startAt ? new Date(data.startAt) : null;
    if (data.endAt !== undefined) patch.endAt = data.endAt ? new Date(data.endAt) : null;
    if (data.enabled !== undefined) patch.enabled = data.enabled;

    const updated = await this.campaigns.update(id, patch);
    if (!updated) {
      throw new NotFoundError('Bonus campaign not found.');
    }
    await withTransaction(this.db, async (tx) => {
      await this.writeAudit(tx, id, 'UPDATE', null, patch, actor);
    });
    return toCampaign(updated, new Date());
  }

  public async remove(id: string, actor: EarningsActor): Promise<void> {
    const existing = await this.campaigns.findById(id);
    if (!existing) {
      throw new NotFoundError('Bonus campaign not found.');
    }
    await this.campaigns.softDelete(id, actor.userId);
  }

  // --- Application engine ----------------------------------------------------

  /**
   * Applies the eligible bonus campaign to an approved deposit's tranche.
   * Idempotent per deposit; returns `{ applied: false }` when no campaign is
   * eligible or the deposit was already processed.
   */
  public async applyForDeposit(
    input: unknown,
    actor: EarningsActor,
  ): Promise<BonusApplicationResult> {
    const { depositRequestId } = applyBonusSchema.parse(input);
    const none: BonusApplicationResult = {
      applied: false,
      campaignId: null,
      trancheId: null,
      bonusCents: 0,
      rateBps: 0,
    };

    const deposit = await this.deposits.getApprovedDeposit(depositRequestId);
    if (!deposit) {
      throw new NotFoundError('Approved deposit not found.');
    }
    if (await this.claims.findByDedupe(`B:${deposit.id}`)) {
      return none; // already processed — idempotent
    }
    const tranche = await this.tranches.findByDepositRequestId(deposit.id);
    if (!tranche) {
      throw new BusinessRuleError('No tranche exists for this deposit.');
    }
    if (tranche.status !== 'LOCKED') {
      throw new BusinessRuleError('A bonus can only be applied to a locked tranche.');
    }

    const now = new Date();
    const isFirstDeposit = (await this.deposits.countApprovedDeposits(deposit.memberId)) === 1;
    const enabled = await this.campaigns.listEnabled();
    const eligible: BonusCampaignRow[] = [];
    for (const campaign of enabled) {
      if (!isLive(toWindow(campaign), now)) {
        continue;
      }
      if (campaign.scope === 'FIRST_DEPOSIT' && !isFirstDeposit) {
        continue;
      }
      if (deposit.units < campaign.minUnits) {
        continue;
      }
      if (
        campaign.frequency === 'SINGLE' &&
        (await this.claims.existsForCampaignMember(campaign.id, deposit.memberId))
      ) {
        continue;
      }
      eligible.push(campaign);
    }

    const chosen = selectCampaign(eligible.map(toWindow));
    if (!chosen) {
      return none;
    }
    const campaign = eligible.find((c) => c.id === chosen.id)!;
    const bonus = bonusCents(tranche.principalCents, campaign.rateBps);
    if (bonus <= 0) {
      return none;
    }

    await withTransaction(this.db, async (tx) => {
      await this.tranches.update(
        tranche.id,
        { bonusBps: campaign.rateBps, bonusCents: bonus, updatedBy: actor.userId },
        tx,
      );
      const claim = await this.claims.create(
        {
          dedupeKey: `B:${deposit.id}`,
          campaignId: campaign.id,
          memberId: deposit.memberId,
          depositRequestId: deposit.id,
          trancheId: tranche.id,
          bonusCents: bonus,
          rateBps: campaign.rateBps,
          lockDays: campaign.lockDays,
          createdBy: actor.userId,
          updatedBy: actor.userId,
        },
        tx,
      );
      await this.writeAudit(
        tx,
        claim.id,
        'CREATE',
        null,
        {
          campaignId: campaign.id,
          trancheId: tranche.id,
          bonusCents: bonus,
          rateBps: campaign.rateBps,
        },
        actor,
        'bonus_claim',
      );
    });

    return {
      applied: true,
      campaignId: campaign.id,
      trancheId: tranche.id,
      bonusCents: bonus,
      rateBps: campaign.rateBps,
    };
  }

  private async writeAudit(
    tx: Parameters<EarningsAuditRepository['write']>[1],
    entityId: string,
    action: 'CREATE' | 'UPDATE' | 'DELETE',
    oldValue: unknown,
    newValue: unknown,
    actor: EarningsActor,
    entityType = 'bonus_campaign',
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
        correlationId: actor.correlationId,
      },
      tx,
    );
  }
}
