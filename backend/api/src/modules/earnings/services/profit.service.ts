import type { Database } from '@/database/client';
import { withTransaction } from '@/database/helpers/transaction';
import { BusinessRuleError, ConflictError, NotFoundError } from '@/errors';
import type { WalletService } from '@/modules/wallet';

import { assignDistinctTimes, monthDays, profitAmountCents, spreadInteger } from '../domain/profit';
import type { EarningsActor, ProfitDistributionResult, ProfitScheduleView } from '../dto';
import type {
  EarningsAuditRepository,
  ProfitDistributionCreditRepository,
  ProfitDistributionRepository,
  ProfitScheduleDayRepository,
  ProfitScheduleDayRow,
  ProfitScheduleRepository,
  ProfitScheduleRow,
  FinancialAccountRepository,
} from '../repositories';
import {
  distributeSchema,
  historyQuerySchema,
  monthParamsSchema,
  planMonthSchema,
  setDaySchema,
} from '../validators';

/** Classifies which members are partners (receive the partner rate). */
export interface PartnerClassifierPort {
  partnerMemberIds(): Promise<Set<string>>;
}

/**
 * Daily Profit (Phase 2E). Admin plans a monthly schedule (auto-spread of a
 * member/partner monthly target across the month's days, each at a distinct
 * randomised 23:00–23:59 time), fine-tunes days, and publishes. Distribution
 * credits each ACTIVE FINANCIAL wallet `round(availableBalance × dayRate)` (base =
 * units × 30 = the balance in cents), split by member/partner rate. It is
 * **idempotent per day**: the `profit_distributions.day` unique key anchors the
 * run and a per-member credit row (+ unique ledger reference) prevents any
 * double-credit; a re-run only credits members not yet paid.
 */
export class ProfitService {
  public constructor(
    private readonly db: Database,
    private readonly wallet: WalletService,
    private readonly schedules: ProfitScheduleRepository,
    private readonly scheduleDays: ProfitScheduleDayRepository,
    private readonly distributions: ProfitDistributionRepository,
    private readonly credits: ProfitDistributionCreditRepository,
    private readonly accounts: FinancialAccountRepository,
    private readonly audit: EarningsAuditRepository,
    private readonly partners: PartnerClassifierPort,
    private readonly rng: () => number = Math.random,
  ) {}

  // --- Schedule (profit.schedule) -------------------------------------------

  public async getSchedule(input: unknown): Promise<ProfitScheduleView | null> {
    const { month } = monthParamsSchema.parse(input);
    const schedule = await this.schedules.findByMonth(month);
    if (!schedule) {
      return null;
    }
    return this.toScheduleView(schedule, await this.scheduleDays.findBySchedule(schedule.id));
  }

  /** Auto-plans a DRAFT monthly schedule by spreading the targets across days. */
  public async planMonth(input: unknown, actor: EarningsActor): Promise<ProfitScheduleView> {
    const data = planMonthSchema.parse(input);
    const existing = await this.schedules.findByMonth(data.month);
    if (existing && existing.status === 'PUBLISHED') {
      throw new ConflictError('A published schedule for this month cannot be re-planned.');
    }

    const days = monthDays(data.month);
    const times = assignDistinctTimes(days.length, this.rng);
    const memberSpread = spreadInteger(data.memberMonthlyBps, days.length);
    const partnerSpread = spreadInteger(data.partnerMonthlyBps, days.length);
    const dayRows = days.map((day, i) => ({
      day,
      memberBps: memberSpread[i] ?? 0,
      partnerBps: partnerSpread[i] ?? 0,
      distributeAt: times[i] ?? null,
      off: false,
    }));

    const schedule = await withTransaction(this.db, async (tx) => {
      const row = existing
        ? await this.schedules.update(
            existing.id,
            {
              memberMonthlyBps: data.memberMonthlyBps,
              partnerMonthlyBps: data.partnerMonthlyBps,
              updatedBy: actor.userId,
            },
            tx,
          )
        : await this.schedules.create(
            {
              month: data.month,
              status: 'DRAFT',
              memberMonthlyBps: data.memberMonthlyBps,
              partnerMonthlyBps: data.partnerMonthlyBps,
              createdBy: actor.userId,
              updatedBy: actor.userId,
            },
            tx,
          );
      if (!row) {
        throw new Error('Failed to upsert profit schedule.');
      }
      await this.scheduleDays.replaceForSchedule(row.id, dayRows, actor.userId, tx);
      await this.writeAudit(
        tx,
        'profit_schedule',
        row.id,
        'UPDATE',
        null,
        {
          month: data.month,
          memberMonthlyBps: data.memberMonthlyBps,
          partnerMonthlyBps: data.partnerMonthlyBps,
          days: dayRows.length,
        },
        actor,
      );
      return row;
    });

    return this.toScheduleView(schedule, await this.scheduleDays.findBySchedule(schedule.id));
  }

  /** Fine-tunes a single day of a DRAFT schedule. */
  public async setDay(input: unknown, actor: EarningsActor): Promise<ProfitScheduleView> {
    const data = setDaySchema.parse(input);
    const month = data.day.slice(0, 7);
    const schedule = await this.schedules.findByMonth(month);
    if (!schedule) {
      throw new NotFoundError('No schedule for that month — plan it first.');
    }
    if (schedule.status === 'PUBLISHED') {
      throw new ConflictError('A published schedule cannot be edited.');
    }
    const existingDays = await this.scheduleDays.findBySchedule(schedule.id);
    const target = existingDays.find((d) => d.day === data.day);
    if (!target) {
      throw new NotFoundError('That day is not part of the schedule.');
    }
    const merged = existingDays.map((d) =>
      d.day === data.day
        ? {
            day: d.day,
            memberBps: data.memberBps ?? d.memberBps,
            partnerBps: data.partnerBps ?? d.partnerBps,
            distributeAt: d.distributeAt,
            off: data.off ?? d.off,
          }
        : {
            day: d.day,
            memberBps: d.memberBps,
            partnerBps: d.partnerBps,
            distributeAt: d.distributeAt,
            off: d.off,
          },
    );
    await withTransaction(this.db, async (tx) => {
      await this.scheduleDays.replaceForSchedule(schedule.id, merged, actor.userId, tx);
      await this.writeAudit(
        tx,
        'profit_schedule',
        schedule.id,
        'UPDATE',
        null,
        { day: data.day },
        actor,
      );
    });
    return this.toScheduleView(schedule, await this.scheduleDays.findBySchedule(schedule.id));
  }

  public async publish(input: unknown, actor: EarningsActor): Promise<ProfitScheduleView> {
    const { month } = monthParamsSchema.parse(input);
    const schedule = await this.schedules.findByMonth(month);
    if (!schedule) {
      throw new NotFoundError('No schedule for that month — plan it first.');
    }
    if (schedule.status === 'PUBLISHED') {
      throw new ConflictError('This schedule is already published.');
    }
    const days = await this.scheduleDays.findBySchedule(schedule.id);
    if (days.length === 0) {
      throw new BusinessRuleError('Nothing to publish — the schedule has no days.');
    }
    const updated = await withTransaction(this.db, async (tx) => {
      const row = await this.schedules.update(
        schedule.id,
        { status: 'PUBLISHED', publishedAt: new Date(), updatedBy: actor.userId },
        tx,
      );
      await this.writeAudit(
        tx,
        'profit_schedule',
        schedule.id,
        'UPDATE',
        { status: 'DRAFT' },
        { status: 'PUBLISHED' },
        actor,
      );
      if (!row) {
        throw new Error('Failed to publish schedule.');
      }
      return row;
    });
    return this.toScheduleView(updated, days);
  }

  // --- Distribution (profit.distribute) -------------------------------------

  /**
   * Distributes daily profit for `day`. Rates come from the request or the
   * published schedule's day row. Idempotent + resume-safe.
   */
  public async distributeForDay(
    input: unknown,
    actor: EarningsActor,
  ): Promise<ProfitDistributionResult> {
    const data = distributeSchema.parse(input);
    let memberBps = data.memberBps;
    let partnerBps = data.partnerBps;
    if (memberBps === undefined || partnerBps === undefined) {
      const scheduled = await this.scheduleDays.findPublishedDay(data.day);
      if (!scheduled) {
        throw new BusinessRuleError('No published profit rates for this day.');
      }
      memberBps = memberBps ?? (scheduled.off ? 0 : scheduled.memberBps);
      partnerBps = partnerBps ?? (scheduled.off ? 0 : scheduled.partnerBps);
    }

    const distribution = await this.getOrCreateDistribution(data.day, memberBps, partnerBps, actor);
    const partnerIds = await this.partners.partnerMemberIds();
    const accounts = await this.accounts.listActive();

    for (const account of accounts) {
      const isPartner = partnerIds.has(account.memberId);
      const bps = isPartner ? partnerBps : memberBps;
      const amountCents = profitAmountCents(account.availableMinor, bps);
      if (amountCents <= 0) {
        continue;
      }
      await withTransaction(this.db, async (tx) => {
        if (await this.credits.exists(distribution.id, account.memberId, tx)) {
          return;
        }
        const credit = await this.wallet.creditWithin(
          tx,
          account.walletId,
          {
            amountMinor: amountCents,
            reference: `TXN-P-${data.day}-${account.memberId}`,
            description: `Daily profit ${data.day}`,
          },
          actor,
        );
        await this.credits.create(
          {
            distributionId: distribution.id,
            memberId: account.memberId,
            walletId: account.walletId,
            role: isPartner ? 'PARTNER' : 'MEMBER',
            baseCents: account.availableMinor,
            bps,
            amountCents,
            transactionId: credit.transactionId,
            createdBy: actor.userId,
            updatedBy: actor.userId,
          },
          tx,
        );
        await this.distributions.addTotals(
          distribution.id,
          {
            memberAmountCents: isPartner ? 0 : amountCents,
            partnerAmountCents: isPartner ? amountCents : 0,
            membersCredited: isPartner ? 0 : 1,
            partnersCredited: isPartner ? 1 : 0,
          },
          tx,
        );
        await this.writeAudit(
          tx,
          'profit_distribution',
          distribution.id,
          'UPDATE',
          null,
          { memberId: account.memberId, amountCents, bps, role: isPartner ? 'PARTNER' : 'MEMBER' },
          actor,
        );
      });
    }

    const finalRow = await this.distributions.findByDay(data.day);
    const row = finalRow ?? distribution;
    return {
      day: row.day,
      reference: row.reference,
      memberBps: row.memberBps,
      partnerBps: row.partnerBps,
      memberAmountCents: row.memberAmountCents,
      partnerAmountCents: row.partnerAmountCents,
      membersCredited: row.membersCredited,
      partnersCredited: row.partnersCredited,
    };
  }

  public async listHistory(input: unknown): Promise<ProfitDistributionResult[]> {
    const { from, to } = historyQuerySchema.parse(input);
    const rows = await this.distributions.listHistory(from, to);
    return rows.map((row) => ({
      day: row.day,
      reference: row.reference,
      memberBps: row.memberBps,
      partnerBps: row.partnerBps,
      memberAmountCents: row.memberAmountCents,
      partnerAmountCents: row.partnerAmountCents,
      membersCredited: row.membersCredited,
      partnersCredited: row.partnersCredited,
    }));
  }

  // --- Internals -------------------------------------------------------------

  private async getOrCreateDistribution(
    day: string,
    memberBps: number,
    partnerBps: number,
    actor: EarningsActor,
  ): Promise<{
    id: string;
    day: string;
    reference: string;
    memberBps: number;
    partnerBps: number;
    memberAmountCents: number;
    partnerAmountCents: number;
    membersCredited: number;
    partnersCredited: number;
  }> {
    const existing = await this.distributions.findByDay(day);
    if (existing) {
      return existing;
    }
    try {
      return await withTransaction(this.db, async (tx) =>
        this.distributions.create(
          {
            day,
            reference: `TXN-P-${day}`,
            memberBps,
            partnerBps,
            createdBy: actor.userId,
            updatedBy: actor.userId,
          },
          tx,
        ),
      );
    } catch {
      const row = await this.distributions.findByDay(day);
      if (!row) {
        throw new Error('Failed to materialise the profit distribution.');
      }
      return row;
    }
  }

  private toScheduleView(
    schedule: ProfitScheduleRow,
    days: ProfitScheduleDayRow[],
  ): ProfitScheduleView {
    return {
      month: schedule.month,
      status: schedule.status,
      memberMonthlyBps: schedule.memberMonthlyBps,
      partnerMonthlyBps: schedule.partnerMonthlyBps,
      publishedAt: schedule.publishedAt ? schedule.publishedAt.toISOString() : null,
      days: days.map((d) => ({
        day: d.day,
        memberBps: d.memberBps,
        partnerBps: d.partnerBps,
        distributeAt: d.distributeAt,
        off: d.off,
      })),
    };
  }

  private async writeAudit(
    tx: Parameters<EarningsAuditRepository['write']>[1],
    entityType: string,
    entityId: string,
    action: 'CREATE' | 'UPDATE' | 'DELETE',
    oldValue: unknown,
    newValue: unknown,
    actor: EarningsActor,
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
