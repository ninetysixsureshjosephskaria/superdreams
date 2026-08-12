import { randomUUID } from 'node:crypto';

import type { Database } from '@/database/client';
import { buildPaginatedResult } from '@/database/helpers';
import { withTransaction } from '@/database/helpers/transaction';
import type { Executor } from '@/database/types';
import { BusinessRuleError, NotFoundError } from '@/errors';
import type { PartnerReferralService } from '@/modules/partner-referral';
import type { RewardService } from '@/modules/rewards';

import type { GameActor, GameData, PaginatedHistory, PlayResult, ScoreResult } from '../dto';
import type { GameEventBus } from '../events';
import { toGame, toHistoryItem, toSession } from '../mappers';
import type {
  AuditActionType,
  GameAuditRepository,
  GameRepository,
  SessionRepository,
} from '../repositories';
import { listHistoryQuerySchema, submitScoreSchema } from '../validators';

const MODULE = 'games';

function ref(prefix: string): string {
  return `${prefix}-${randomUUID().split('-')[0]!.toUpperCase()}`;
}

/**
 * Games business logic. Starting a game creates a session and (if the game has an
 * entry cost) debits reward points via the Rewards ledger. Submitting a score
 * completes the session and awards reward points scaled by the score — again via
 * the Rewards ledger (no duplicated point logic). All movements are transactional
 * and audited.
 */
export class GameService {
  public constructor(
    private readonly db: Database,
    private readonly games: GameRepository,
    private readonly sessions: SessionRepository,
    private readonly audit: GameAuditRepository,
    private readonly rewards: RewardService,
    private readonly events: GameEventBus,
    private readonly partnerReferral?: PartnerReferralService,
  ) {}

  public async listGames(): Promise<GameData[]> {
    return (await this.games.listActive()).map(toGame);
  }

  public async startForUser(userId: string, gameId: string, actor: GameActor): Promise<PlayResult> {
    const memberId = await this.requireMemberId(userId);
    const game = await this.games.findActiveById(gameId);
    if (!game) {
      throw new NotFoundError('Game not found.');
    }

    const outcome = await withTransaction(this.db, async (tx) => {
      let entryTransactionId: string | null = null;
      let balanceAfter: number | null = null;
      if (game.entryCost > 0) {
        const spend = await this.rewards.spendPointsWithin(tx, memberId, game.entryCost, {
          reference: ref('GM-ENTRY'),
          description: `Entry: ${game.name}`,
          actor,
        });
        entryTransactionId = spend.transactionId;
        balanceAfter = spend.balanceAfter;
      }
      const session = await this.sessions.create(
        {
          gameId: game.id,
          memberId,
          status: 'STARTED',
          entryTransactionId,
          createdBy: actor.userId,
          updatedBy: actor.userId,
        },
        tx,
      );
      await this.writeAudit(
        session.id,
        'CREATE',
        { type: 'start', gameId: game.id, memberId },
        actor,
        tx,
      );
      return { session, balanceAfter };
    });

    await this.events.publish({
      type: 'GameStarted',
      sessionId: outcome.session.id,
      gameId: game.id,
      memberId,
      at: new Date(),
    });

    const balanceAfter =
      outcome.balanceAfter ?? (await this.rewards.getMemberBalance(memberId)).pointsBalance;
    return {
      session: toSession(outcome.session, game.name, game.entryCost),
      entryCharged: game.entryCost,
      balanceAfter,
    };
  }

  public async submitScoreForUser(
    userId: string,
    sessionId: string,
    input: unknown,
    actor: GameActor,
  ): Promise<ScoreResult> {
    const memberId = await this.requireMemberId(userId);
    const data = submitScoreSchema.parse(input);

    // P3: resolve the earner's eligible direct Partner BEFORE the transaction
    // (reads only — the earning transaction performs writes exclusively, which
    // keeps every read off the transaction's single connection).
    const resolvedPartner = this.partnerReferral
      ? await this.partnerReferral.resolveEarner(memberId)
      : null;

    const outcome = await withTransaction(this.db, async (tx) => {
      const session = await this.sessions.lockById(sessionId, tx);
      if (!session || session.memberId !== memberId) {
        throw new NotFoundError('Session not found.');
      }
      if (session.status !== 'STARTED') {
        throw new BusinessRuleError('This session has already been completed.');
      }
      // Use the transaction executor for every read/write while the session row
      // is locked — a query on the pooled db here would deadlock.
      const game = await this.games.findById(session.gameId, tx);
      if (!game) {
        throw new NotFoundError('Game not found.');
      }
      const clamped = Math.max(0, Math.min(data.score, game.maxScore));
      const ratio = game.maxScore > 0 ? clamped / game.maxScore : 0;
      const points = Math.round(game.minReward + (game.maxReward - game.minReward) * ratio);

      await this.sessions.recordScore(
        { sessionId, gameId: game.id, memberId, score: data.score },
        tx,
      );

      let rewardTransactionId: string | null = null;
      let balanceAfter: number | null = null;
      if (points > 0) {
        const award = await this.rewards.awardPointsWithin(tx, memberId, points, {
          reference: ref('GM-WIN'),
          description: `Won ${points} points in ${game.name}`,
          actor,
        });
        rewardTransactionId = award.transactionId;
        balanceAfter = award.balanceAfter;
        // P3: credit the member's direct active Partner their referral share in
        // THIS SAME transaction (no-op when there is no eligible partner or the
        // floored result is 0). Any failure here rolls back the member's win too.
        if (this.partnerReferral) {
          await this.partnerReferral.creditWithin(tx, {
            resolved: resolvedPartner,
            sourceTransactionId: award.transactionId,
            earnerMemberId: memberId,
            sourcePoints: points,
            actor,
          });
        }
      }
      await this.sessions.recordReward(
        { sessionId, gameId: game.id, memberId, points, rewardTransactionId },
        tx,
      );
      await this.sessions.update(sessionId, { status: 'COMPLETED', endedAt: new Date() }, tx);
      await this.writeAudit(
        sessionId,
        'UPDATE',
        { type: 'score', score: data.score, points },
        actor,
        tx,
      );
      return { gameId: game.id, gameName: game.name, points, balanceAfter };
    });

    const balanceAfter =
      outcome.balanceAfter ?? (await this.rewards.getMemberBalance(memberId)).pointsBalance;

    await this.events.publish({
      type: 'GameCompleted',
      sessionId,
      gameId: outcome.gameId,
      memberId,
      score: data.score,
      pointsAwarded: outcome.points,
      at: new Date(),
    });

    return {
      sessionId,
      gameId: outcome.gameId,
      gameName: outcome.gameName,
      score: data.score,
      pointsAwarded: outcome.points,
      balanceAfter,
    };
  }

  public async getHistory(userId: string, query: unknown): Promise<PaginatedHistory> {
    const memberId = await this.requireMemberId(userId);
    const parsed = listHistoryQuerySchema.parse(query);
    const { rows, total } = await this.sessions.history(memberId, parsed);
    return buildPaginatedResult(rows.map(toHistoryItem), total, parsed.page, parsed.pageSize);
  }

  private async requireMemberId(userId: string): Promise<string> {
    const memberId = await this.rewards.getMemberIdForUser(userId);
    if (!memberId) {
      throw new NotFoundError('No member profile is linked to this account.');
    }
    return memberId;
  }

  private async writeAudit(
    entityId: string,
    action: AuditActionType,
    newValue: Record<string, unknown>,
    actor: GameActor,
    executor: Executor,
  ): Promise<void> {
    await this.audit.write(
      {
        entityType: 'game_session',
        entityId,
        action,
        newValue,
        userId: actor.userId,
        ipAddress: actor.ipAddress,
        userAgent: actor.userAgent,
        module: MODULE,
        correlationId: actor.correlationId,
      },
      executor,
    );
  }
}
