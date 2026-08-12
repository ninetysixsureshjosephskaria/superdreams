import { randomUUID } from 'node:crypto';

import type { Database } from '@/database/client';
import { buildPaginatedResult } from '@/database/helpers';
import { withTransaction } from '@/database/helpers/transaction';
import type { Executor } from '@/database/types';
import { BusinessRuleError, ConflictError, NotFoundError, ValidationError } from '@/errors';

import { computeRulePoints, oppositeDirection, pointsDelta } from '../domain/points';
import type {
  AllocateInput,
  ExpiryRunResult,
  MemberRewardBalance,
  PaginatedPrograms,
  PaginatedTransactions,
  RewardActor,
  RewardBalanceValidationResult,
  RewardDirection,
  RewardProgramDetail,
  RewardProgramStatus,
  RewardProgramSummary,
  RewardRedemptionData,
  RewardTransactionData,
  RewardTransactionType,
} from '../dto';
import type { RewardEventBus } from '../events';
import {
  toMemberRewardBalance,
  toRewardProgramDetail,
  toRewardProgramSummary,
  toRewardRedemption,
  toRewardTransaction,
  type RewardProgramRow,
} from '../mappers';
import type {
  MemberLookupRepository,
  MemberRewardRepository,
  RewardAdjustmentRepository,
  RewardAuditRepository,
  RewardCategoryRepository,
  RewardExpiryRuleRepository,
  RewardHistoryRepository,
  RewardProgramRepository,
  RewardRedemptionRepository,
  RewardRuleRepository,
  RewardTransactionRepository,
} from '../repositories';
import {
  adjustSchema,
  allocateSchema,
  changeProgramStatusSchema,
  createProgramSchema,
  expireSchema,
  listProgramsQuerySchema,
  listTransactionsQuerySchema,
  memberHistoryQuerySchema,
  redeemSchema,
  updateProgramSchema,
} from '../validators';

const MODULE = 'rewards';
const DAY_MS = 24 * 60 * 60 * 1000;

const ALLOWED_PROGRAM_TRANSITIONS: Record<RewardProgramStatus, readonly RewardProgramStatus[]> = {
  DRAFT: ['ACTIVE', 'ARCHIVED'],
  ACTIVE: ['INACTIVE', 'ARCHIVED'],
  INACTIVE: ['ACTIVE', 'ARCHIVED'],
  ARCHIVED: [],
};

/** Adapter to the Wallet module for redemption-to-wallet credits (optional). */
export interface WalletBridge {
  creditMember(memberId: string, amountMinor: number, actor: RewardActor): Promise<string | null>;
}

interface ApplyParams {
  memberId: string;
  type: RewardTransactionType;
  direction: RewardDirection;
  points: number;
  reference: string;
  description?: string | null;
  programId?: string | null;
  ruleId?: string | null;
  reversalOfId?: string | null;
  expiresAt?: Date | null;
  actor: RewardActor;
}

interface ApplyResult {
  transactionId: string;
  balanceAfter: number;
}

function reference(prefix: string): string {
  return `${prefix}-${randomUUID().slice(0, 12).toUpperCase()}`;
}

/**
 * Rewards business logic. The append-only {@link RewardTransactionRepository}
 * ledger is the source of truth; {@link MemberRewardRepository} is a projection
 * kept consistent inside the same database transaction as every points change,
 * with the projection row locked FOR UPDATE. Every points-changing operation is
 * audited.
 */
export class RewardService {
  public constructor(
    private readonly db: Database,
    private readonly programs: RewardProgramRepository,
    private readonly rules: RewardRuleRepository,
    private readonly categories: RewardCategoryRepository,
    private readonly expiryRules: RewardExpiryRuleRepository,
    private readonly balances: MemberRewardRepository,
    private readonly transactions: RewardTransactionRepository,
    private readonly redemptions: RewardRedemptionRepository,
    private readonly adjustments: RewardAdjustmentRepository,
    private readonly history: RewardHistoryRepository,
    private readonly memberLookup: MemberLookupRepository,
    private readonly audit: RewardAuditRepository,
    private readonly events: RewardEventBus,
    private readonly walletBridge?: WalletBridge,
  ) {}

  // --- Programs --------------------------------------------------------------

  public async listPrograms(query: unknown): Promise<PaginatedPrograms> {
    const parsed = listProgramsQuerySchema.parse(query);
    const { rows, total } = await this.programs.search(parsed);
    const items = await Promise.all(rows.map((program) => this.summariseProgram(program)));
    return buildPaginatedResult(items, total, parsed.page, parsed.pageSize);
  }

  public async getProgram(id: string): Promise<RewardProgramDetail> {
    const program = await this.requireProgram(id);
    return this.assembleProgramDetail(program);
  }

  public async createProgram(input: unknown, actor: RewardActor): Promise<RewardProgramDetail> {
    const data = createProgramSchema.parse(input);
    if (await this.programs.findByCode(data.code)) {
      throw new ConflictError('A reward program with this code already exists.');
    }
    const categoryId = await this.resolveCategoryId(data.categoryCode);
    const status: RewardProgramStatus = data.status ?? 'DRAFT';

    const program = await withTransaction(this.db, async (tx) => {
      const created = await this.programs.create(
        {
          code: data.code,
          name: data.name,
          description: data.description ?? null,
          type: data.type,
          categoryId,
          status,
          startsAt: data.startsAt ? new Date(data.startsAt) : null,
          endsAt: data.endsAt ? new Date(data.endsAt) : null,
          pointsPerUnit: data.pointsPerUnit ?? null,
          createdBy: actor.userId,
          updatedBy: actor.userId,
        },
        tx,
      );
      for (const rule of data.rules ?? []) {
        await this.rules.create(
          {
            programId: created.id,
            name: rule.name,
            type: rule.type,
            points: rule.points ?? null,
            rateBasisPoints: rule.rateBasisPoints ?? null,
            priority: rule.priority ?? 0,
            createdBy: actor.userId,
          },
          tx,
        );
      }
      if (data.expiry) {
        await this.expiryRules.create(
          {
            programId: created.id,
            policy: data.expiry.policy,
            fixedDate: data.expiry.fixedDate ? new Date(data.expiry.fixedDate) : null,
            rollingDays: data.expiry.rollingDays ?? null,
            createdBy: actor.userId,
          },
          tx,
        );
      }
      await this.audit.write(
        {
          entityType: 'reward_program',
          entityId: created.id,
          action: 'CREATE',
          newValue: { code: created.code, name: created.name, type: created.type, status },
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
      type: 'RewardProgramCreated',
      programId: program.id,
      actorId: actor.userId,
      at: new Date(),
    });
    return this.assembleProgramDetail(program);
  }

  public async updateProgram(
    id: string,
    input: unknown,
    actor: RewardActor,
  ): Promise<RewardProgramDetail> {
    const data = updateProgramSchema.parse(input);
    const program = await this.requireProgram(id);

    const values: Record<string, unknown> = { updatedBy: actor.userId };
    if (data.name !== undefined) values.name = data.name;
    if (data.description !== undefined) values.description = data.description;
    if (data.startsAt !== undefined)
      values.startsAt = data.startsAt ? new Date(data.startsAt) : null;
    if (data.endsAt !== undefined) values.endsAt = data.endsAt ? new Date(data.endsAt) : null;
    if (data.pointsPerUnit !== undefined) values.pointsPerUnit = data.pointsPerUnit;
    if (data.categoryCode !== undefined) {
      values.categoryId = data.categoryCode
        ? await this.resolveCategoryId(data.categoryCode)
        : null;
    }

    const updated = (await this.programs.update(id, values)) ?? program;
    await this.audit.write(
      {
        entityType: 'reward_program',
        entityId: id,
        action: 'UPDATE',
        oldValue: { name: program.name },
        newValue: { name: updated.name },
        userId: actor.userId,
        ipAddress: actor.ipAddress,
        userAgent: actor.userAgent,
        module: MODULE,
        correlationId: actor.correlationId,
      },
      this.db,
    );
    return this.assembleProgramDetail(updated);
  }

  public async changeProgramStatus(
    id: string,
    input: unknown,
    actor: RewardActor,
  ): Promise<RewardProgramDetail> {
    const data = changeProgramStatusSchema.parse(input);
    const program = await this.requireProgram(id);
    const from = program.status;
    const to = data.status;

    if (from === to) {
      throw new ValidationError(`Program is already ${to}.`);
    }
    if (!ALLOWED_PROGRAM_TRANSITIONS[from].includes(to)) {
      throw new ValidationError(`Cannot change program status from ${from} to ${to}.`);
    }

    const updated =
      (await this.programs.update(id, { status: to, updatedBy: actor.userId })) ?? program;
    await this.audit.write(
      {
        entityType: 'reward_program',
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
      type: 'RewardProgramStatusChanged',
      programId: id,
      fromStatus: from,
      toStatus: to,
      actorId: actor.userId,
      at: new Date(),
    });
    if (to === 'ACTIVE') {
      await this.events.publish({
        type: 'RewardProgramActivated',
        programId: id,
        actorId: actor.userId,
        at: new Date(),
      });
    } else if (to === 'INACTIVE' || to === 'ARCHIVED') {
      await this.events.publish({
        type: 'RewardProgramDeactivated',
        programId: id,
        actorId: actor.userId,
        at: new Date(),
      });
    }
    return this.assembleProgramDetail(updated);
  }

  // --- Member balance & history ---------------------------------------------

  public async getMemberBalance(memberId: string): Promise<MemberRewardBalance> {
    await this.requireMember(memberId);
    const account = await this.balances.findByMemberId(memberId);
    if (!account) {
      return { memberId, pointsBalance: 0, lifetimeEarned: 0, lifetimeRedeemed: 0 };
    }
    return toMemberRewardBalance(account);
  }

  public async getMemberHistory(memberId: string, query: unknown): Promise<PaginatedTransactions> {
    await this.requireMember(memberId);
    const parsed = memberHistoryQuerySchema.parse(query);
    const { rows, total } = await this.transactions.search(
      { ...parsed, page: parsed.page, pageSize: parsed.pageSize, sortBy: 'createdAt' },
      memberId,
    );
    return buildPaginatedResult(rows.map(toRewardTransaction), total, parsed.page, parsed.pageSize);
  }

  public async listTransactions(query: unknown): Promise<PaginatedTransactions> {
    const parsed = listTransactionsQuerySchema.parse(query);
    const { rows, total } = await this.transactions.search(parsed);
    return buildPaginatedResult(rows.map(toRewardTransaction), total, parsed.page, parsed.pageSize);
  }

  public async getByUserId(userId: string): Promise<MemberRewardBalance | null> {
    const member = await this.memberLookup.findByUserId(userId);
    if (!member) {
      return null;
    }
    return this.getMemberBalance(member.id);
  }

  public async getMemberIdForUser(userId: string): Promise<string | null> {
    const member = await this.memberLookup.findByUserId(userId);
    return member?.id ?? null;
  }

  // --- Composable, transaction-aware point movements -------------------------
  // These let other modules (e.g. Dream Store redemption, Games rewards) move
  // points atomically inside their own transaction, reusing the ledger +
  // projection + audit path (no duplicated business logic). Callers own their
  // own domain events/history. Balance is enforced (throws when insufficient).

  /** Spends (DEBIT/REDEEM) member points within an existing transaction. */
  public async spendPointsWithin(
    tx: Executor,
    memberId: string,
    points: number,
    options: { reference: string; description: string; actor: RewardActor },
  ): Promise<{ transactionId: string; balanceAfter: number }> {
    return this.applyTransaction(tx, {
      memberId,
      type: 'REDEEM',
      direction: 'DEBIT',
      points,
      reference: options.reference,
      description: options.description,
      actor: options.actor,
    });
  }

  /** Awards (CREDIT/EARN) member points within an existing transaction. */
  public async awardPointsWithin(
    tx: Executor,
    memberId: string,
    points: number,
    options: {
      reference: string;
      description: string;
      actor: RewardActor;
      expiresAt?: Date | null;
    },
  ): Promise<{ transactionId: string; balanceAfter: number }> {
    return this.applyTransaction(tx, {
      memberId,
      type: 'EARN',
      direction: 'CREDIT',
      points,
      reference: options.reference,
      description: options.description,
      expiresAt: options.expiresAt ?? null,
      actor: options.actor,
    });
  }

  /** Refunds (CREDIT/ADJUSTMENT) member points within an existing transaction. */
  public async refundPointsWithin(
    tx: Executor,
    memberId: string,
    points: number,
    options: { reference: string; description: string; actor: RewardActor },
  ): Promise<{ transactionId: string; balanceAfter: number }> {
    return this.applyTransaction(tx, {
      memberId,
      type: 'ADJUSTMENT',
      direction: 'CREDIT',
      points,
      reference: options.reference,
      description: options.description,
      actor: options.actor,
    });
  }

  /**
   * Redeems (DEBIT/REDEEM) member points **within an existing transaction**, and
   * additionally records a completed `reward_redemptions` row — the same in-tx
   * work `redeem()` does (applyTransaction → redemptions.create → setRedemptionId),
   * minus the post-commit wallet-bridge/history/event. This lets the P2
   * redemption-request approval debit points AND create the completed redemption
   * record atomically inside the approval transaction, reusing the existing
   * transaction-aware ledger primitives. It NEVER touches the wallet/money bridge
   * (points-only). Throws `BusinessRuleError` if the balance is insufficient (the
   * caller's transaction then rolls back). `redeem()` is intentionally left
   * unchanged (preserve-first); this is an additive sibling.
   */
  public async redeemWithin(
    tx: Executor,
    memberId: string,
    points: number,
    options: { reference: string; note?: string | null; actor: RewardActor },
  ): Promise<{ redemptionId: string; transactionId: string; balanceAfter: number }> {
    const applied = await this.applyTransaction(tx, {
      memberId,
      type: 'REDEEM',
      direction: 'DEBIT',
      points,
      reference: options.reference,
      description: options.note ?? 'Points redeemed',
      actor: options.actor,
    });
    const redemption = await this.redemptions.create(
      {
        memberId,
        transactionId: applied.transactionId,
        reference: options.reference,
        points,
        note: options.note ?? null,
        walletTransactionId: null,
        processedBy: options.actor.userId,
      },
      tx,
    );
    await this.transactions.setRedemptionId(applied.transactionId, redemption.id, tx);
    return {
      redemptionId: redemption.id,
      transactionId: applied.transactionId,
      balanceAfter: applied.balanceAfter,
    };
  }

  // --- Points operations -----------------------------------------------------

  public async allocate(
    memberId: string,
    input: unknown,
    actor: RewardActor,
  ): Promise<RewardTransactionData> {
    const data = allocateSchema.parse(input);
    await this.requireMember(memberId);

    const { points, programId, ruleId } = await this.resolveAllocation(data);
    const expiresAt = await this.resolveExpiry(programId, data.expiresInDays);

    const result = await withTransaction(this.db, (tx) =>
      this.applyTransaction(tx, {
        memberId,
        type: 'EARN',
        direction: 'CREDIT',
        points,
        reference: data.reference ?? reference('RWD'),
        description: data.description ?? null,
        programId,
        ruleId,
        expiresAt,
        actor,
      }),
    );
    await this.history.record({
      memberId,
      action: 'reward.allocated',
      description: `Earned ${points} points`,
      actorId: actor.userId,
    });
    await this.events.publish({
      type: 'RewardAllocated',
      memberId,
      transactionId: result.transactionId,
      points,
      programId: programId ?? null,
      actorId: actor.userId,
      at: new Date(),
    });
    return this.requireTransaction(result.transactionId);
  }

  public async redeem(
    memberId: string,
    input: unknown,
    actor: RewardActor,
  ): Promise<RewardRedemptionData> {
    const data = redeemSchema.parse(input);
    await this.requireMember(memberId);

    const ref = data.reference ?? reference('RDM');
    const redemptionId = await withTransaction(this.db, async (tx) => {
      const applied = await this.applyTransaction(tx, {
        memberId,
        type: 'REDEEM',
        direction: 'DEBIT',
        points: data.points,
        reference: ref,
        description: data.note ?? 'Points redeemed',
        actor,
      });
      const redemption = await this.redemptions.create(
        {
          memberId,
          transactionId: applied.transactionId,
          reference: ref,
          points: data.points,
          note: data.note ?? null,
          walletTransactionId: null,
          processedBy: actor.userId,
        },
        tx,
      );
      await this.transactions.setRedemptionId(applied.transactionId, redemption.id, tx);
      return redemption.id;
    });

    // Optional wallet credit (integration point) — runs after the reward ledger
    // commits; the redemption remains the source of truth if this fails.
    if (data.walletCreditMinor != null && this.walletBridge) {
      const walletTransactionId = await this.walletBridge.creditMember(
        memberId,
        data.walletCreditMinor,
        actor,
      );
      if (walletTransactionId) {
        await this.linkWalletTransaction(redemptionId, walletTransactionId);
      }
    }

    await this.history.record({
      memberId,
      action: 'reward.redeemed',
      description: `Redeemed ${data.points} points`,
      actorId: actor.userId,
    });
    const redemption = await this.requireRedemption(redemptionId);
    await this.events.publish({
      type: 'RewardRedeemed',
      memberId,
      transactionId: redemption.transactionId,
      redemptionId,
      points: data.points,
      actorId: actor.userId,
      at: new Date(),
    });
    return redemption;
  }

  public async adjust(
    memberId: string,
    input: unknown,
    actor: RewardActor,
  ): Promise<RewardTransactionData> {
    const data = adjustSchema.parse(input);
    await this.requireMember(memberId);
    const ref = data.reference ?? reference('ADJ');

    const result = await withTransaction(this.db, async (tx) => {
      const applied = await this.applyTransaction(tx, {
        memberId,
        type: 'ADJUSTMENT',
        direction: data.direction,
        points: data.points,
        reference: ref,
        description: data.reason,
        actor,
      });
      await this.adjustments.create(
        {
          memberId,
          transactionId: applied.transactionId,
          direction: data.direction,
          points: data.points,
          reason: data.reason,
          approvedBy: actor.userId,
        },
        tx,
      );
      return applied;
    });
    await this.history.record({
      memberId,
      action: 'reward.adjusted',
      description: `${data.direction === 'CREDIT' ? '+' : '-'}${data.points} points (${data.reason})`,
      actorId: actor.userId,
    });
    await this.events.publish({
      type: 'RewardAdjusted',
      memberId,
      transactionId: result.transactionId,
      direction: data.direction,
      points: data.points,
      actorId: actor.userId,
      at: new Date(),
    });
    return this.requireTransaction(result.transactionId);
  }

  public async reverse(
    memberId: string,
    transactionId: string,
    actor: RewardActor,
  ): Promise<RewardTransactionData> {
    await this.requireMember(memberId);
    const original = await this.transactions.findById(transactionId);
    if (!original || original.memberId !== memberId) {
      throw new NotFoundError('Reward transaction not found.');
    }
    if (original.status === 'REVERSED') {
      throw new BusinessRuleError('Transaction has already been reversed.');
    }
    if (!['EARN', 'REDEEM', 'ADJUSTMENT'].includes(original.type)) {
      throw new BusinessRuleError('Only earn, redeem and adjustment entries can be reversed.');
    }

    const result = await withTransaction(this.db, async (tx) => {
      const applied = await this.applyTransaction(tx, {
        memberId,
        type: 'REVERSAL',
        direction: oppositeDirection(original.direction),
        points: original.points,
        reference: reference('REV'),
        description: `Reversal of ${original.reference}`,
        reversalOfId: original.id,
        actor,
      });
      await this.transactions.markReversed(original.id, tx);
      if (original.redemptionId) {
        await this.redemptions.markReversed(original.redemptionId, tx);
      }
      await this.audit.write(
        {
          entityType: 'reward_transaction',
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
    await this.history.record({
      memberId,
      action: 'reward.reversed',
      description: `Reversed ${original.type} ${original.reference}`,
      actorId: actor.userId,
    });
    await this.events.publish({
      type: 'RewardReversed',
      memberId,
      transactionId: original.id,
      reversalId: result.transactionId,
      actorId: actor.userId,
      at: new Date(),
    });
    return this.requireTransaction(result.transactionId);
  }

  // --- Expiry ----------------------------------------------------------------

  /** Processes point expiry across all members with expirable EARN lots. */
  public async processExpirations(input: unknown, actor: RewardActor): Promise<ExpiryRunResult> {
    const data = expireSchema.parse(input);
    const asOf = data.asOf ? new Date(data.asOf) : new Date();
    const memberIds = await this.transactions.membersWithExpirable(asOf);

    let expiredPoints = 0;
    let transactions = 0;
    let processedMembers = 0;

    for (const memberId of memberIds) {
      const expired = await this.expireMember(memberId, asOf, actor);
      if (expired > 0) {
        expiredPoints += expired;
        transactions += 1;
      }
      processedMembers += 1;
    }
    return { processedMembers, expiredPoints, transactions };
  }

  private async expireMember(memberId: string, asOf: Date, actor: RewardActor): Promise<number> {
    return withTransaction(this.db, async (tx) => {
      const account = await this.balances.ensure(memberId, actor.userId, tx);
      const lots = await this.transactions.listExpirableEarnLots(memberId, asOf, tx);
      if (lots.length === 0) {
        return 0;
      }
      const grossExpired = lots.reduce((sum, lot) => sum + lot.points, 0);
      const cap = Math.min(grossExpired, account.pointsBalance);
      await this.transactions.markExpired(
        lots.map((lot) => lot.id),
        asOf,
        tx,
      );
      if (cap <= 0) {
        return 0;
      }
      const applied = await this.applyTransaction(
        tx,
        {
          memberId,
          type: 'EXPIRE',
          direction: 'DEBIT',
          points: cap,
          reference: reference('EXP'),
          description: 'Points expired',
          actor,
        },
        account,
      );
      await this.events.publish({
        type: 'RewardExpired',
        memberId,
        transactionId: applied.transactionId,
        points: cap,
        at: new Date(),
      });
      return cap;
    });
  }

  // --- Integrity -------------------------------------------------------------

  public async validateBalance(memberId: string): Promise<RewardBalanceValidationResult> {
    await this.requireMember(memberId);
    const account = await this.balances.findByMemberId(memberId);
    const stored = account?.pointsBalance ?? 0;
    const derived = await this.deriveBalance(memberId);
    return {
      memberId,
      consistent: stored === derived,
      storedBalance: stored,
      derivedBalance: derived,
    };
  }

  public async deriveBalance(memberId: string): Promise<number> {
    const all = await this.transactions.listAllByMember(memberId);
    return all.reduce((sum, txn) => sum + pointsDelta(txn.type, txn.direction, txn.points), 0);
  }

  // --- Internals -------------------------------------------------------------

  private async applyTransaction(
    tx: Executor,
    params: ApplyParams,
    lockedAccount?: { pointsBalance: number; lifetimeEarned: number; lifetimeRedeemed: number },
  ): Promise<ApplyResult> {
    const account =
      lockedAccount ?? (await this.balances.ensure(params.memberId, params.actor.userId, tx));
    const delta = pointsDelta(params.type, params.direction, params.points);
    const nextBalance = account.pointsBalance + delta;

    if (nextBalance < 0) {
      throw new BusinessRuleError('Insufficient reward points for this operation.');
    }

    const lifetimeEarned = account.lifetimeEarned + (params.type === 'EARN' ? params.points : 0);
    const lifetimeRedeemed =
      account.lifetimeRedeemed + (params.type === 'REDEEM' ? params.points : 0);

    await this.balances.setBalance(
      params.memberId,
      { pointsBalance: nextBalance, lifetimeEarned, lifetimeRedeemed },
      params.actor.userId,
      tx,
    );

    const entry = await this.transactions.append(
      {
        memberId: params.memberId,
        programId: params.programId ?? null,
        ruleId: params.ruleId ?? null,
        reference: params.reference,
        type: params.type,
        direction: params.direction,
        points: params.points,
        balanceAfter: nextBalance,
        description: params.description ?? null,
        reversalOfId: params.reversalOfId ?? null,
        expiresAt: params.expiresAt ?? null,
        createdBy: params.actor.userId,
      },
      tx,
    );

    await this.audit.write(
      {
        entityType: 'reward_transaction',
        entityId: entry.id,
        action: 'CREATE',
        newValue: {
          memberId: params.memberId,
          type: params.type,
          direction: params.direction,
          points: params.points,
          balanceAfter: nextBalance,
        },
        userId: params.actor.userId,
        ipAddress: params.actor.ipAddress,
        userAgent: params.actor.userAgent,
        module: MODULE,
        correlationId: params.actor.correlationId,
      },
      tx,
    );

    return { transactionId: entry.id, balanceAfter: nextBalance };
  }

  private async resolveAllocation(
    data: AllocateInput,
  ): Promise<{ points: number; programId: string | null; ruleId: string | null }> {
    if (data.points != null) {
      return {
        points: data.points,
        programId: data.programId ?? null,
        ruleId: data.ruleId ?? null,
      };
    }
    if (!data.ruleId) {
      throw new ValidationError('Provide either points or a ruleId to allocate.');
    }
    const rule = await this.rules.findById(data.ruleId);
    if (!rule) {
      throw new NotFoundError('Reward rule not found.');
    }
    const computed = computeRulePoints({
      type: rule.type,
      points: rule.points,
      rateBasisPoints: rule.rateBasisPoints,
      baseValue: data.baseValue,
    });
    if (computed == null) {
      throw new ValidationError('The rule could not compute points from the given input.');
    }
    return { points: computed, programId: rule.programId, ruleId: rule.id };
  }

  private async resolveExpiry(
    programId: string | null,
    expiresInDays: number | undefined,
  ): Promise<Date | null> {
    if (expiresInDays != null) {
      return new Date(Date.now() + expiresInDays * DAY_MS);
    }
    if (!programId) {
      return null;
    }
    const rule = await this.expiryRules.findByProgram(programId);
    if (!rule || !rule.isActive || rule.policy === 'NEVER') {
      return null;
    }
    if (rule.policy === 'ROLLING' && rule.rollingDays != null) {
      return new Date(Date.now() + rule.rollingDays * DAY_MS);
    }
    if (rule.policy === 'FIXED_DATE' && rule.fixedDate) {
      return rule.fixedDate;
    }
    return null;
  }

  private async summariseProgram(program: RewardProgramRow): Promise<RewardProgramSummary> {
    const categoryCode = program.categoryId
      ? await this.categories.codeById(program.categoryId)
      : null;
    return toRewardProgramSummary(program, categoryCode);
  }

  private async assembleProgramDetail(program: RewardProgramRow): Promise<RewardProgramDetail> {
    const [categoryCode, rules, expiry] = await Promise.all([
      program.categoryId ? this.categories.codeById(program.categoryId) : Promise.resolve(null),
      this.rules.listByProgram(program.id),
      this.expiryRules.findByProgram(program.id),
    ]);
    return toRewardProgramDetail(program, categoryCode, rules, expiry);
  }

  private async resolveCategoryId(code: string | null | undefined): Promise<string | null> {
    if (!code) {
      return null;
    }
    const category = await this.categories.findByCode(code.toUpperCase());
    if (!category) {
      throw new ValidationError(`Unknown reward category: ${code}.`);
    }
    return category.id;
  }

  private async linkWalletTransaction(
    redemptionId: string,
    walletTransactionId: string,
  ): Promise<void> {
    await this.redemptions.setWalletTransactionId(redemptionId, walletTransactionId);
  }

  private async requireProgram(id: string): Promise<RewardProgramRow> {
    const program = await this.programs.findById(id);
    if (!program) {
      throw new NotFoundError('Reward program not found.');
    }
    return program;
  }

  private async requireMember(memberId: string): Promise<void> {
    const member = await this.memberLookup.findById(memberId);
    if (!member) {
      throw new NotFoundError('Member not found.');
    }
  }

  private async requireTransaction(id: string): Promise<RewardTransactionData> {
    const txn = await this.transactions.findById(id);
    if (!txn) {
      throw new NotFoundError('Reward transaction not found.');
    }
    return toRewardTransaction(txn);
  }

  private async requireRedemption(id: string): Promise<RewardRedemptionData> {
    const redemption = await this.redemptions.findById(id);
    if (!redemption) {
      throw new NotFoundError('Redemption not found.');
    }
    return toRewardRedemption(redemption);
  }
}
