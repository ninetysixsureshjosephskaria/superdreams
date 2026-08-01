import type { AxiosInstance } from 'axios';

/**
 * Campaign Management API resource — the single, shared definition of the
 * campaign HTTP contract used by every application (no duplicated API logic).
 * JSON dates are strings over the wire.
 */

export type CampaignStatus = 'DRAFT' | 'SCHEDULED' | 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'ARCHIVED';
export type CampaignType = 'PROMOTIONAL' | 'REWARD' | 'REFERRAL' | 'SEASONAL' | 'ENGAGEMENT';
export type CampaignAudienceType = 'ALL_MEMBERS' | 'SEGMENT' | 'MANUAL' | 'STATUS' | 'JOIN_DATE';
export type CampaignRuleType =
  'MEMBER_STATUS' | 'JOIN_DATE_AFTER' | 'JOIN_DATE_BEFORE' | 'REWARD_ELIGIBILITY' | 'SEGMENT';
export type CampaignScheduleType = 'IMMEDIATE' | 'SCHEDULED' | 'RECURRING';
export type CampaignMemberStatus = 'ELIGIBLE' | 'ENROLLED' | 'REWARDED' | 'EXCLUDED';
export type CampaignExecutionStatus = 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';

export interface CampaignRuleData {
  id: string;
  type: CampaignRuleType;
  value: string | null;
  isActive: boolean;
}

export interface CampaignRewardData {
  id: string;
  rewardProgramId: string | null;
  points: number;
  description: string | null;
}

export interface CampaignScheduleData {
  scheduleType: CampaignScheduleType;
  startAt: string | null;
  endAt: string | null;
  recurrenceCron: string | null;
  timezone: string | null;
  nextRunAt: string | null;
}

export interface CampaignEnrollmentStats {
  eligible: number;
  enrolled: number;
  rewarded: number;
  excluded: number;
  total: number;
}

export interface CampaignSummary {
  id: string;
  code: string;
  name: string;
  description: string | null;
  type: CampaignType;
  status: CampaignStatus;
  audienceType: CampaignAudienceType;
  startsAt: string | null;
  endsAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CampaignDetail extends CampaignSummary {
  rules: CampaignRuleData[];
  reward: CampaignRewardData | null;
  schedule: CampaignScheduleData | null;
  enrollment: CampaignEnrollmentStats;
}

export interface CampaignEnrollmentData {
  id: string;
  campaignId: string;
  memberId: string;
  status: CampaignMemberStatus;
  enrolledAt: string | null;
  rewardedAt: string | null;
  rewardTransactionId: string | null;
  createdAt: string;
}

export interface CampaignHistoryData {
  id: string;
  action: string;
  description: string | null;
  actorId: string | null;
  createdAt: string;
}

export interface CampaignExecutionData {
  id: string;
  campaignId: string;
  status: CampaignExecutionStatus;
  membersTargeted: number;
  rewardsIssued: number;
  pointsIssued: number;
  error: string | null;
  startedAt: string;
  completedAt: string | null;
}

export interface MemberCampaignView extends CampaignSummary {
  reward: CampaignRewardData | null;
  participation: CampaignMemberStatus | null;
  eligible: boolean;
}

export interface PaginatedCampaigns {
  items: CampaignSummary[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface PaginatedEnrollments {
  items: CampaignEnrollmentData[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export type CampaignSortField = 'createdAt' | 'updatedAt' | 'name' | 'status' | 'startsAt';

export interface ListCampaignsParams {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: CampaignStatus;
  type?: CampaignType;
  dateFrom?: string;
  dateTo?: string;
  sortBy?: CampaignSortField;
  order?: 'asc' | 'desc';
}

export interface ListEnrollmentsParams {
  page?: number;
  pageSize?: number;
  status?: CampaignMemberStatus;
}

export interface CampaignRuleInput {
  type: CampaignRuleType;
  value?: string;
}

export interface CampaignRewardInput {
  rewardProgramId?: string;
  points: number;
  description?: string;
}

export interface CreateCampaignInput {
  code: string;
  name: string;
  description?: string;
  type: CampaignType;
  audienceType?: CampaignAudienceType;
  status?: 'DRAFT' | 'ACTIVE';
  startsAt?: string;
  endsAt?: string;
  rules?: CampaignRuleInput[];
  reward?: CampaignRewardInput;
}

export interface UpdateCampaignInput {
  name?: string;
  description?: string | null;
  audienceType?: CampaignAudienceType;
  startsAt?: string | null;
  endsAt?: string | null;
  rules?: CampaignRuleInput[];
  reward?: CampaignRewardInput | null;
}

export interface ChangeCampaignStatusInput {
  status: CampaignStatus;
  reason?: string;
}

export interface ScheduleCampaignInput {
  scheduleType: CampaignScheduleType;
  startAt?: string;
  endAt?: string;
  recurrenceCron?: string;
  timezone?: string;
}

export interface AddTargetsInput {
  memberIds: string[];
}

export interface ExecuteCampaignInput {
  dryRun?: boolean;
}

interface Envelope<T> {
  success: boolean;
  data: T;
}

interface ItemsEnvelope<T> {
  success: boolean;
  data: { items: T[] };
}

export interface CampaignsApi {
  list(params?: ListCampaignsParams): Promise<PaginatedCampaigns>;
  get(id: string): Promise<CampaignDetail>;
  create(input: CreateCampaignInput): Promise<CampaignDetail>;
  update(id: string, input: UpdateCampaignInput): Promise<CampaignDetail>;
  changeStatus(id: string, input: ChangeCampaignStatusInput): Promise<CampaignDetail>;
  schedule(id: string, input: ScheduleCampaignInput): Promise<CampaignDetail>;
  addTargets(id: string, input: AddTargetsInput): Promise<CampaignDetail>;
  execute(id: string, input?: ExecuteCampaignInput): Promise<CampaignExecutionData>;
  history(id: string): Promise<CampaignHistoryData[]>;
  executions(id: string): Promise<CampaignExecutionData[]>;
  enrollments(id: string, params?: ListEnrollmentsParams): Promise<PaginatedEnrollments>;
  memberCampaigns(memberId: string): Promise<CampaignEnrollmentData[]>;
  available(): Promise<MemberCampaignView[]>;
  mine(): Promise<MemberCampaignView[]>;
  enroll(id: string): Promise<CampaignEnrollmentData>;
}

/** Binds the campaigns resource to a configured API client. */
export function createCampaignsApi(client: AxiosInstance): CampaignsApi {
  const base = '/api/v1/campaigns';
  return {
    async list(params) {
      const response = await client.get<Envelope<PaginatedCampaigns>>(base, { params });
      return response.data.data;
    },
    async get(id) {
      const response = await client.get<Envelope<CampaignDetail>>(`${base}/${id}`);
      return response.data.data;
    },
    async create(input) {
      const response = await client.post<Envelope<CampaignDetail>>(base, input);
      return response.data.data;
    },
    async update(id, input) {
      const response = await client.put<Envelope<CampaignDetail>>(`${base}/${id}`, input);
      return response.data.data;
    },
    async changeStatus(id, input) {
      const response = await client.patch<Envelope<CampaignDetail>>(`${base}/${id}/status`, input);
      return response.data.data;
    },
    async schedule(id, input) {
      const response = await client.post<Envelope<CampaignDetail>>(`${base}/${id}/schedule`, input);
      return response.data.data;
    },
    async addTargets(id, input) {
      const response = await client.post<Envelope<CampaignDetail>>(`${base}/${id}/targets`, input);
      return response.data.data;
    },
    async execute(id, input) {
      const response = await client.post<Envelope<CampaignExecutionData>>(
        `${base}/${id}/execute`,
        input ?? {},
      );
      return response.data.data;
    },
    async history(id) {
      const response = await client.get<ItemsEnvelope<CampaignHistoryData>>(
        `${base}/${id}/history`,
      );
      return response.data.data.items;
    },
    async executions(id) {
      const response = await client.get<ItemsEnvelope<CampaignExecutionData>>(
        `${base}/${id}/executions`,
      );
      return response.data.data.items;
    },
    async enrollments(id, params) {
      const response = await client.get<Envelope<PaginatedEnrollments>>(
        `${base}/${id}/enrollments`,
        { params },
      );
      return response.data.data;
    },
    async memberCampaigns(memberId) {
      const response = await client.get<ItemsEnvelope<CampaignEnrollmentData>>(
        `${base}/member/${memberId}`,
      );
      return response.data.data.items;
    },
    async available() {
      const response = await client.get<ItemsEnvelope<MemberCampaignView>>(`${base}/me/available`);
      return response.data.data.items;
    },
    async mine() {
      const response = await client.get<ItemsEnvelope<MemberCampaignView>>(`${base}/me`);
      return response.data.data.items;
    },
    async enroll(id) {
      const response = await client.post<Envelope<CampaignEnrollmentData>>(`${base}/${id}/enroll`);
      return response.data.data;
    },
  };
}
