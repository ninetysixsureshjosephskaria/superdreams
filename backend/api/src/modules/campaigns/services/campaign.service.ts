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

import { canTransition, evaluateEligibility, type EligibilityRule } from '../domain/campaign';
import type {
  CampaignActor,
  CampaignDetail,
  CampaignEnrollmentData,
  CampaignExecutionData,
  CampaignHistoryData,
  CampaignStatus,
  MemberCampaignView,
  PaginatedCampaigns,
  PaginatedEnrollments,
} from '../dto';
import type { CampaignEventBus } from '../events';
import {
  toCampaignDetail,
  toCampaignEnrollment,
  toCampaignExecution,
  toCampaignHistory,
  toCampaignReward,
  toCampaignSummary,
  type CampaignRow,
} from '../mappers';
import type {
  CampaignAuditRepository,
  CampaignEnrollmentRepository,
  CampaignExecutionRepository,
  CampaignHistoryRepository,
  CampaignRepository,
  CampaignRewardRepository,
  CampaignRuleRepository,
  CampaignScheduleRepository,
  CampaignTargetRepository,
  MemberLink,
  MemberLookupRepository,
} from '../repositories';
import {
  addTargetsSchema,
  changeCampaignStatusSchema,
  createCampaignSchema,
  executeCampaignSchema,
  listCampaignsQuerySchema,
  listEnrollmentsQuerySchema,
  scheduleCampaignSchema,
  updateCampaignSchema,
} from '../validators';

const MODULE = 'campaigns';

/** Adapter to the Rewards module for campaign reward issuance (public API only). */
export interface RewardBridge {
  allocate(
    memberId: string,
    params: { points: number; programId: string | null; description: string },
    actor: CampaignActor,
  ): Promise<string>;
}

/**
 * Campaign Management business logic: lifecycle state machine, audience/rules/
 * reward configuration, member enrollment with eligibility evaluation, and
 * execution that issues rewards through the Rewards module's public service.
 * Every mutation is audited and recorded in the campaign history.
 */
export class CampaignService {
  public constructor(
    private readonly db: Database,
    private readonly campaigns: CampaignRepository,
    private readonly rules: CampaignRuleRepository,
    private readonly rewards: CampaignRewardRepository,
    private readonly schedules: CampaignScheduleRepository,
    private readonly targets: CampaignTargetRepository,
    private readonly enrollments: CampaignEnrollmentRepository,
    private readonly executions: CampaignExecutionRepository,
    private readonly history: CampaignHistoryRepository,
    private readonly memberLookup: MemberLookupRepository,
    private readonly audit: CampaignAuditRepository,
    private readonly events: CampaignEventBus,
    private readonly rewardBridge?: RewardBridge,
  ) {}

  // --- Queries ---------------------------------------------------------------

  public async list(query: unknown): Promise<PaginatedCampaigns> {
    const parsed = listCampaignsQuerySchema.parse(query);
    const { rows, total } = await this.campaigns.search(parsed);
    return buildPaginatedResult(rows.map(toCampaignSummary), total, parsed.page, parsed.pageSize);
  }

  public async getDetail(id: string): Promise<CampaignDetail> {
    const campaign = await this.requireCampaign(id);
    return this.assembleDetail(campaign);
  }

  public async getHistory(id: string): Promise<CampaignHistoryData[]> {
    await this.requireCampaign(id);
    return (await this.history.listByCampaign(id)).map(toCampaignHistory);
  }

  public async getExecutions(id: string): Promise<CampaignExecutionData[]> {
    await this.requireCampaign(id);
    return (await this.executions.listByCampaign(id)).map(toCampaignExecution);
  }

  public async listEnrollments(id: string, query: unknown): Promise<PaginatedEnrollments> {
    await this.requireCampaign(id);
    const parsed = listEnrollmentsQuerySchema.parse(query);
    const { rows, total } = await this.enrollments.listByCampaign(id, parsed);
    return buildPaginatedResult(
      rows.map(toCampaignEnrollment),
      total,
      parsed.page,
      parsed.pageSize,
    );
  }

  public async getMemberCampaigns(memberId: string): Promise<CampaignEnrollmentData[]> {
    await this.requireMember(memberId);
    return (await this.enrollments.listByMember(memberId)).map(toCampaignEnrollment);
  }

  // --- Lifecycle -------------------------------------------------------------

  public async create(input: unknown, actor: CampaignActor): Promise<CampaignDetail> {
    const data = createCampaignSchema.parse(input);
    if (await this.campaigns.findByCode(data.code)) {
      throw new ConflictError('A campaign with this code already exists.');
    }
    const status: CampaignStatus = data.status ?? 'DRAFT';

    const campaign = await withTransaction(this.db, async (tx) => {
      const created = await this.campaigns.create(
        {
          code: data.code,
          name: data.name,
          description: data.description ?? null,
          type: data.type,
          status,
          audienceType: data.audienceType ?? 'ALL_MEMBERS',
          startsAt: data.startsAt ? new Date(data.startsAt) : null,
          endsAt: data.endsAt ? new Date(data.endsAt) : null,
          createdBy: actor.userId,
          updatedBy: actor.userId,
        },
        tx,
      );
      for (const rule of data.rules ?? []) {
        await this.rules.create(
          {
            campaignId: created.id,
            type: rule.type,
            value: rule.value ?? null,
            createdBy: actor.userId,
          },
          tx,
        );
      }
      if (data.reward) {
        await this.rewards.create(
          {
            campaignId: created.id,
            rewardProgramId: data.reward.rewardProgramId ?? null,
            points: data.reward.points,
            description: data.reward.description ?? null,
            createdBy: actor.userId,
          },
          tx,
        );
      }
      await this.history.record(
        {
          campaignId: created.id,
          action: 'campaign.created',
          description: 'Campaign created',
          actorId: actor.userId,
        },
        tx,
      );
      await this.writeAudit(
        tx,
        created.id,
        'CREATE',
        {
          code: created.code,
          name: created.name,
          type: created.type,
          status,
        },
        actor,
      );
      return created;
    });

    await this.events.publish({
      type: 'CampaignCreated',
      campaignId: campaign.id,
      actorId: actor.userId,
      at: new Date(),
    });
    return this.assembleDetail(campaign);
  }

  public async update(id: string, input: unknown, actor: CampaignActor): Promise<CampaignDetail> {
    const data = updateCampaignSchema.parse(input);
    const campaign = await this.requireCampaign(id);

    const values: Record<string, unknown> = { updatedBy: actor.userId };
    if (data.name !== undefined) values.name = data.name;
    if (data.description !== undefined) values.description = data.description;
    if (data.audienceType !== undefined) values.audienceType = data.audienceType;
    if (data.startsAt !== undefined)
      values.startsAt = data.startsAt ? new Date(data.startsAt) : null;
    if (data.endsAt !== undefined) values.endsAt = data.endsAt ? new Date(data.endsAt) : null;

    const updated = await withTransaction(this.db, async (tx) => {
      const next = (await this.campaigns.update(id, values, tx)) ?? campaign;
      if (data.rules !== undefined) {
        await this.rules.deleteByCampaign(id, tx);
        for (const rule of data.rules) {
          await this.rules.create(
            { campaignId: id, type: rule.type, value: rule.value ?? null, createdBy: actor.userId },
            tx,
          );
        }
      }
      if (data.reward !== undefined) {
        await this.rewards.deleteByCampaign(id, tx);
        if (data.reward) {
          await this.rewards.create(
            {
              campaignId: id,
              rewardProgramId: data.reward.rewardProgramId ?? null,
              points: data.reward.points,
              description: data.reward.description ?? null,
              createdBy: actor.userId,
            },
            tx,
          );
        }
      }
      await this.history.record(
        {
          campaignId: id,
          action: 'campaign.updated',
          description: 'Campaign updated',
          actorId: actor.userId,
        },
        tx,
      );
      await this.writeAudit(tx, id, 'UPDATE', { name: next.name }, actor);
      return next;
    });

    await this.events.publish({
      type: 'CampaignUpdated',
      campaignId: id,
      actorId: actor.userId,
      at: new Date(),
    });
    return this.assembleDetail(updated);
  }

  public async changeStatus(
    id: string,
    input: unknown,
    actor: CampaignActor,
  ): Promise<CampaignDetail> {
    const data = changeCampaignStatusSchema.parse(input);
    const campaign = await this.requireCampaign(id);
    const from = campaign.status;
    const to = data.status;

    if (from === to) {
      throw new ValidationError(`Campaign is already ${to}.`);
    }
    if (!canTransition(from, to)) {
      throw new ValidationError(`Cannot change campaign status from ${from} to ${to}.`);
    }

    const updated =
      (await this.campaigns.update(id, { status: to, updatedBy: actor.userId })) ?? campaign;
    await this.history.record({
      campaignId: id,
      action: 'campaign.status_changed',
      description: `Status ${from} → ${to}`,
      actorId: actor.userId,
    });
    await this.writeAudit(
      this.db,
      id,
      'UPDATE',
      { status: to, reason: data.reason ?? null },
      actor,
      {
        status: from,
      },
    );

    await this.events.publish({
      type: 'CampaignStatusChanged',
      campaignId: id,
      fromStatus: from,
      toStatus: to,
      actorId: actor.userId,
      at: new Date(),
    });
    if (to === 'ACTIVE') {
      await this.events.publish({
        type: 'CampaignActivated',
        campaignId: id,
        actorId: actor.userId,
        at: new Date(),
      });
    } else if (to === 'PAUSED') {
      await this.events.publish({
        type: 'CampaignPaused',
        campaignId: id,
        actorId: actor.userId,
        at: new Date(),
      });
    } else if (to === 'COMPLETED') {
      await this.events.publish({
        type: 'CampaignCompleted',
        campaignId: id,
        actorId: actor.userId,
        at: new Date(),
      });
    }
    return this.assembleDetail(updated);
  }

  public async schedule(id: string, input: unknown, actor: CampaignActor): Promise<CampaignDetail> {
    const data = scheduleCampaignSchema.parse(input);
    const campaign = await this.requireCampaign(id);
    if (campaign.status === 'COMPLETED' || campaign.status === 'ARCHIVED') {
      throw new BusinessRuleError('Cannot schedule a completed or archived campaign.');
    }

    await this.schedules.upsert({
      campaignId: id,
      scheduleType: data.scheduleType,
      startAt: data.startAt ? new Date(data.startAt) : null,
      endAt: data.endAt ? new Date(data.endAt) : null,
      recurrenceCron: data.recurrenceCron ?? null,
      timezone: data.timezone ?? null,
      createdBy: actor.userId,
    });

    // A future-dated schedule moves a DRAFT campaign to SCHEDULED.
    if (data.scheduleType !== 'IMMEDIATE' && campaign.status === 'DRAFT') {
      await this.campaigns.update(id, { status: 'SCHEDULED', updatedBy: actor.userId });
    }
    await this.history.record({
      campaignId: id,
      action: 'campaign.scheduled',
      description: `Scheduled (${data.scheduleType})`,
      actorId: actor.userId,
    });
    await this.writeAudit(this.db, id, 'UPDATE', { schedule: data.scheduleType }, actor);
    await this.events.publish({
      type: 'CampaignScheduled',
      campaignId: id,
      actorId: actor.userId,
      at: new Date(),
    });
    return this.getDetail(id);
  }

  // --- Audience & enrollment -------------------------------------------------

  public async addTargets(
    id: string,
    input: unknown,
    actor: CampaignActor,
  ): Promise<CampaignDetail> {
    const data = addTargetsSchema.parse(input);
    const campaign = await this.requireCampaign(id);

    for (const memberId of data.memberIds) {
      const member = await this.memberLookup.findById(memberId);
      if (!member) {
        throw new NotFoundError(`Member not found: ${memberId}.`);
      }
      await this.targets.add(id, memberId, actor.userId);
      await this.enrollments.upsertStatus({
        campaignId: id,
        memberId,
        status: 'ENROLLED',
        enrolledAt: new Date(),
        createdBy: actor.userId,
      });
      await this.events.publish({
        type: 'CampaignEnrolled',
        campaignId: id,
        memberId,
        actorId: actor.userId,
        at: new Date(),
      });
    }
    await this.history.record({
      campaignId: id,
      action: 'campaign.targets_added',
      description: `Added ${data.memberIds.length} target(s)`,
      actorId: actor.userId,
    });
    await this.writeAudit(this.db, id, 'UPDATE', { targetsAdded: data.memberIds.length }, actor);
    return this.assembleDetail(campaign);
  }

  /** Member self-enrollment (portal). Ownership is enforced by the caller. */
  public async enroll(
    id: string,
    memberId: string,
    actor: CampaignActor,
  ): Promise<CampaignEnrollmentData> {
    const campaign = await this.requireCampaign(id);
    const member = await this.requireMember(memberId);
    if (campaign.status !== 'ACTIVE') {
      throw new BusinessRuleError('This campaign is not open for enrollment.');
    }

    const existing = await this.enrollments.findByCampaignMember(id, memberId);
    if (campaign.audienceType === 'MANUAL' && !existing) {
      throw new ForbiddenError('This campaign is not available to you.');
    }
    if (existing && (existing.status === 'ENROLLED' || existing.status === 'REWARDED')) {
      return toCampaignEnrollment(existing);
    }

    await this.assertEligible(id, member);
    const enrollment = await this.enrollments.upsertStatus({
      campaignId: id,
      memberId,
      status: 'ENROLLED',
      enrolledAt: new Date(),
      createdBy: actor.userId,
    });
    await this.history.record({
      campaignId: id,
      action: 'campaign.enrolled',
      description: `Member ${memberId} enrolled`,
      actorId: actor.userId,
    });
    await this.events.publish({
      type: 'CampaignEnrolled',
      campaignId: id,
      memberId,
      actorId: actor.userId,
      at: new Date(),
    });
    return toCampaignEnrollment(enrollment);
  }

  // --- Execution -------------------------------------------------------------

  public async execute(
    id: string,
    input: unknown,
    actor: CampaignActor,
  ): Promise<CampaignExecutionData> {
    const data = executeCampaignSchema.parse(input);
    const campaign = await this.requireCampaign(id);
    if (campaign.status !== 'ACTIVE') {
      throw new BusinessRuleError('Only ACTIVE campaigns can be executed.');
    }
    const reward = await this.rewards.findByCampaign(id);
    if (!reward) {
      throw new BusinessRuleError('This campaign has no reward mapping to issue.');
    }
    if (!data.dryRun && !this.rewardBridge) {
      throw new ConflictError('Reward integration is not configured.');
    }

    const memberIds = await this.enrollments.listEnrolledMemberIds(id);
    let rewardsIssued = 0;
    let pointsIssued = 0;

    for (const memberId of memberIds) {
      const enrollment = await this.enrollments.findByCampaignMember(id, memberId);
      if (!enrollment || enrollment.status !== 'ENROLLED') {
        continue;
      }
      if (data.dryRun) {
        rewardsIssued += 1;
        pointsIssued += reward.points;
        continue;
      }
      const rewardTransactionId = await this.rewardBridge!.allocate(
        memberId,
        {
          points: reward.points,
          programId: reward.rewardProgramId,
          description: `Campaign ${campaign.code}`,
        },
        actor,
      );
      await this.enrollments.markRewarded(id, memberId, rewardTransactionId, actor.userId, this.db);
      rewardsIssued += 1;
      pointsIssued += reward.points;
      await this.events.publish({
        type: 'CampaignRewardIssued',
        campaignId: id,
        memberId,
        points: reward.points,
        rewardTransactionId,
        actorId: actor.userId,
        at: new Date(),
      });
    }

    const execution = await this.executions.create({
      campaignId: id,
      status: 'COMPLETED',
      membersTargeted: memberIds.length,
      rewardsIssued,
      pointsIssued,
      error: null,
      executedBy: actor.userId,
    });
    await this.history.record({
      campaignId: id,
      action: data.dryRun ? 'campaign.execute_dryrun' : 'campaign.executed',
      description: `Issued ${rewardsIssued} reward(s), ${pointsIssued} points`,
      actorId: actor.userId,
    });
    await this.writeAudit(
      this.db,
      id,
      'UPDATE',
      { rewardsIssued, pointsIssued, dryRun: data.dryRun ?? false },
      actor,
    );
    await this.events.publish({
      type: 'CampaignExecuted',
      campaignId: id,
      executionId: execution.id,
      rewardsIssued,
      pointsIssued,
      actorId: actor.userId,
      at: new Date(),
    });
    return toCampaignExecution(execution);
  }

  // --- Portal ----------------------------------------------------------------

  public async getMemberIdForUser(userId: string): Promise<string | null> {
    const member = await this.memberLookup.findByUserId(userId);
    return member?.id ?? null;
  }

  /** Active campaigns visible to a member, with eligibility + participation. */
  public async getAvailableForMember(memberId: string): Promise<MemberCampaignView[]> {
    const member = await this.requireMember(memberId);
    const active = await this.campaigns.listActive();
    const views: MemberCampaignView[] = [];
    for (const campaign of active) {
      const [reward, enrollment, eligibility] = await Promise.all([
        this.rewards.findByCampaign(campaign.id),
        this.enrollments.findByCampaignMember(campaign.id, memberId),
        this.evaluateEligibility(campaign.id, member),
      ]);
      if (campaign.audienceType === 'MANUAL' && !enrollment) {
        continue; // manual campaigns are only visible to targeted members
      }
      views.push({
        ...toCampaignSummary(campaign),
        reward: toCampaignReward(reward),
        participation: enrollment?.status ?? null,
        eligible: eligibility.eligible,
      });
    }
    return views;
  }

  public async getJoinedForMember(memberId: string): Promise<MemberCampaignView[]> {
    const member = await this.requireMember(memberId);
    const enrollments = await this.enrollments.listByMember(member.id);
    const views: MemberCampaignView[] = [];
    for (const enrollment of enrollments) {
      const campaign = await this.campaigns.findById(enrollment.campaignId);
      if (!campaign) {
        continue;
      }
      const reward = await this.rewards.findByCampaign(campaign.id);
      views.push({
        ...toCampaignSummary(campaign),
        reward: toCampaignReward(reward),
        participation: enrollment.status,
        eligible: true,
      });
    }
    return views;
  }

  // --- Internals -------------------------------------------------------------

  private async assembleDetail(campaign: CampaignRow): Promise<CampaignDetail> {
    const [rules, reward, schedule, stats] = await Promise.all([
      this.rules.listByCampaign(campaign.id),
      this.rewards.findByCampaign(campaign.id),
      this.schedules.findByCampaign(campaign.id),
      this.enrollments.stats(campaign.id),
    ]);
    return toCampaignDetail(campaign, rules, reward, schedule, stats);
  }

  private async evaluateEligibility(
    campaignId: string,
    member: MemberLink,
  ): Promise<{ eligible: boolean }> {
    const ruleRows = await this.rules.listByCampaign(campaignId);
    const rules: EligibilityRule[] = ruleRows.map((rule) => ({
      type: rule.type,
      value: rule.value,
      isActive: rule.isActive,
    }));
    return evaluateEligibility(rules, { status: member.status, joinedAt: member.joinedAt });
  }

  private async assertEligible(campaignId: string, member: MemberLink): Promise<void> {
    const result = await this.evaluateEligibility(campaignId, member);
    if (!result.eligible) {
      throw new ForbiddenError('You are not eligible for this campaign.');
    }
  }

  private async writeAudit(
    executor: Parameters<CampaignAuditRepository['write']>[1],
    campaignId: string,
    action: 'CREATE' | 'UPDATE',
    newValue: Record<string, unknown>,
    actor: CampaignActor,
    oldValue?: Record<string, unknown>,
  ): Promise<void> {
    await this.audit.write(
      {
        entityType: 'campaign',
        entityId: campaignId,
        action,
        oldValue: oldValue ?? null,
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

  private async requireCampaign(id: string): Promise<CampaignRow> {
    const campaign = await this.campaigns.findById(id);
    if (!campaign) {
      throw new NotFoundError('Campaign not found.');
    }
    return campaign;
  }

  private async requireMember(memberId: string): Promise<MemberLink> {
    const member = await this.memberLookup.findById(memberId);
    if (!member) {
      throw new NotFoundError('Member not found.');
    }
    return member;
  }
}
