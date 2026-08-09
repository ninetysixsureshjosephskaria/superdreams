import type { Database } from '@/database/client';
import { withTransaction } from '@/database/helpers/transaction';
import type { WalletService } from '@/modules/wallet';
import type { WalletRepository } from '@/modules/wallet/repositories';

import { activationAmountCents, hasTwoWithinWindow } from '../domain/activation';
import type { ActivationConfigData, ActivationGrantResult, EarningsActor } from '../dto';
import type {
  ActivationConfigRepository,
  ActivationGrantRepository,
  EarningsAuditRepository,
  ReferralJoinRepository,
} from '../repositories';
import { processActivationSchema, updateActivationConfigSchema } from '../validators';

const MODULE_CURRENCY = 'USD';

const noGrant = (memberId: string): ActivationGrantResult => ({
  granted: false,
  memberId,
  amountCents: 0,
  transactionId: null,
});

/**
 * Activation Bonus (Phase 2E). A single network-wide config; a member who adds 2
 * members within a day (referrals whose join times fall in a 24h window) earns an
 * auto reward (TXN-A) — percentage of their balance or a fixed amount. **Idempotent**:
 * `activation_bonus_grants.member_id` is unique (+ unique ledger reference
 * `TXN-A-<memberId>`), so the bonus is issued at most once per member.
 */
export class ActivationBonusService {
  public constructor(
    private readonly db: Database,
    private readonly wallet: WalletService,
    private readonly walletRepo: WalletRepository,
    private readonly config: ActivationConfigRepository,
    private readonly grants: ActivationGrantRepository,
    private readonly referrals: ReferralJoinRepository,
    private readonly audit: EarningsAuditRepository,
  ) {}

  // --- Config (activation.bonus.manage) -------------------------------------

  public async getConfig(actor: EarningsActor): Promise<ActivationConfigData> {
    const row = await this.config.getOrCreate(actor.userId);
    return {
      enabled: row.enabled,
      rewardType: row.rewardType,
      value: row.value,
      lockDays: row.lockDays,
    };
  }

  public async updateConfig(input: unknown, actor: EarningsActor): Promise<ActivationConfigData> {
    const data = updateActivationConfigSchema.parse(input);
    await this.config.getOrCreate(actor.userId);
    const patch: Record<string, unknown> = { updatedBy: actor.userId };
    if (data.enabled !== undefined) patch.enabled = data.enabled;
    if (data.rewardType !== undefined) patch.rewardType = data.rewardType;
    if (data.value !== undefined) patch.value = data.value;
    if (data.lockDays !== undefined) patch.lockDays = data.lockDays;
    const updated = await this.config.update(patch);
    if (!updated) {
      throw new Error('Failed to update activation config.');
    }
    await withTransaction(this.db, async (tx) => {
      await this.writeAudit(tx, updated.id, 'UPDATE', null, patch, actor);
    });
    return {
      enabled: updated.enabled,
      rewardType: updated.rewardType,
      value: updated.value,
      lockDays: updated.lockDays,
    };
  }

  // --- Trigger / grant -------------------------------------------------------

  public async processMember(input: unknown, actor: EarningsActor): Promise<ActivationGrantResult> {
    const { memberId } = processActivationSchema.parse(input);
    return this.grantForMember(memberId, actor);
  }

  /** Scans every recruiter and grants the activation bonus to newly-qualifying ones. */
  public async processAll(actor: EarningsActor): Promise<{ granted: number }> {
    const config = await this.config.getOrCreate(actor.userId);
    if (!config.enabled) {
      return { granted: 0 };
    }
    const recruiters = await this.referrals.distinctRecruiters();
    let granted = 0;
    for (const recruiterId of recruiters) {
      const result = await this.grantForMember(recruiterId, actor);
      if (result.granted) {
        granted += 1;
      }
    }
    return { granted };
  }

  private async grantForMember(
    memberId: string,
    actor: EarningsActor,
  ): Promise<ActivationGrantResult> {
    const config = await this.config.getOrCreate(actor.userId);
    if (!config.enabled) {
      return noGrant(memberId);
    }
    if (await this.grants.findByMember(memberId)) {
      return noGrant(memberId); // already granted — idempotent
    }
    if ((await this.referrals.memberStatus(memberId)) !== 'ACTIVE') {
      return noGrant(memberId); // only an active member qualifies
    }
    const joinTimes = await this.referrals.joinTimesFor(memberId);
    if (!hasTwoWithinWindow(joinTimes)) {
      return noGrant(memberId); // trigger not achieved — no penalty
    }

    const walletId = await this.ensureFinancialWallet(memberId, actor);
    let balanceCents = 0;
    if (config.rewardType === 'PERCENT') {
      balanceCents = (await this.wallet.getBalance(walletId)).availableMinor;
    }
    const amountCents = activationAmountCents(
      { rewardType: config.rewardType, value: config.value },
      balanceCents,
    );
    if (amountCents <= 0) {
      return noGrant(memberId); // nothing to credit yet (e.g. 0% base); not recorded, can qualify later
    }

    const transactionId = await withTransaction(this.db, async (tx) => {
      const credit = await this.wallet.creditWithin(
        tx,
        walletId,
        {
          amountMinor: amountCents,
          reference: `TXN-A-${memberId}`,
          description: 'Activation bonus',
        },
        actor,
      );
      await this.grants.create(
        {
          memberId,
          walletId,
          amountCents,
          rewardType: config.rewardType,
          value: config.value,
          lockDays: config.lockDays,
          transactionId: credit.transactionId,
          createdBy: actor.userId,
          updatedBy: actor.userId,
        },
        tx,
      );
      await this.writeAudit(
        tx,
        memberId,
        'CREATE',
        null,
        { amountCents, rewardType: config.rewardType, value: config.value },
        actor,
        'activation_bonus_grant',
      );
      return credit.transactionId;
    });

    return { granted: true, memberId, amountCents, transactionId };
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

  private async writeAudit(
    tx: Parameters<EarningsAuditRepository['write']>[1],
    entityId: string,
    action: 'CREATE' | 'UPDATE' | 'DELETE',
    oldValue: unknown,
    newValue: unknown,
    actor: EarningsActor,
    entityType = 'activation_bonus_config',
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
