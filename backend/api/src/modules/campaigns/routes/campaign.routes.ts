import type { FastifyInstance, FastifySchema, preHandlerAsyncHookHandler } from 'fastify';

import { PERMISSIONS, requirePermission, type GuardDeps } from '@/modules/rbac';

import { CampaignController } from '../controllers';
import type { CampaignService } from '../services';

const CAMPAIGNS_PREFIX = '/api/v1/campaigns';
const secured = [{ bearerAuth: [] }];
const uuidParam = { type: 'string', format: 'uuid' } as const;
const idParams = { type: 'object', required: ['id'], properties: { id: uuidParam } } as const;
const memberParams = {
  type: 'object',
  required: ['memberId'],
  properties: { memberId: uuidParam },
} as const;

const STATUS = ['DRAFT', 'SCHEDULED', 'ACTIVE', 'PAUSED', 'COMPLETED', 'ARCHIVED'];
const TYPE = ['PROMOTIONAL', 'REWARD', 'REFERRAL', 'SEASONAL', 'ENGAGEMENT'];
const AUDIENCE = ['ALL_MEMBERS', 'SEGMENT', 'MANUAL', 'STATUS', 'JOIN_DATE'];
const RULE_TYPE = [
  'MEMBER_STATUS',
  'JOIN_DATE_AFTER',
  'JOIN_DATE_BEFORE',
  'REWARD_ELIGIBILITY',
  'SEGMENT',
];
const SCHEDULE_TYPE = ['IMMEDIATE', 'SCHEDULED', 'RECURRING'];

const rewardBody = {
  type: 'object',
  required: ['points'],
  properties: {
    rewardProgramId: uuidParam,
    points: { type: 'integer', minimum: 1 },
    description: { type: 'string' },
  },
} as const;

const rulesBody = {
  type: 'array',
  items: {
    type: 'object',
    required: ['type'],
    properties: { type: { type: 'string', enum: RULE_TYPE }, value: { type: 'string' } },
  },
} as const;

const listSchema: FastifySchema = {
  tags: ['Campaigns'],
  summary: 'List campaigns (search, filter, sort, paginate)',
  security: secured,
  querystring: {
    type: 'object',
    properties: {
      page: { type: 'integer', minimum: 1 },
      pageSize: { type: 'integer', minimum: 1, maximum: 100 },
      search: { type: 'string' },
      status: { type: 'string', enum: STATUS },
      type: { type: 'string', enum: TYPE },
      dateFrom: { type: 'string' },
      dateTo: { type: 'string' },
      sortBy: { type: 'string', enum: ['createdAt', 'updatedAt', 'name', 'status', 'startsAt'] },
      order: { type: 'string', enum: ['asc', 'desc'] },
    },
  },
};

const createSchema: FastifySchema = {
  tags: ['Campaigns'],
  summary: 'Create a campaign',
  security: secured,
  body: {
    type: 'object',
    required: ['code', 'name', 'type'],
    properties: {
      code: { type: 'string' },
      name: { type: 'string' },
      description: { type: 'string' },
      type: { type: 'string', enum: TYPE },
      audienceType: { type: 'string', enum: AUDIENCE },
      status: { type: 'string', enum: ['DRAFT', 'ACTIVE'] },
      startsAt: { type: 'string' },
      endsAt: { type: 'string' },
      rules: rulesBody,
      reward: rewardBody,
    },
  },
};

const updateSchema: FastifySchema = {
  tags: ['Campaigns'],
  summary: 'Update a campaign',
  security: secured,
  params: idParams,
  body: {
    type: 'object',
    properties: {
      name: { type: 'string' },
      description: { type: ['string', 'null'] },
      audienceType: { type: 'string', enum: AUDIENCE },
      startsAt: { type: ['string', 'null'] },
      endsAt: { type: ['string', 'null'] },
      rules: rulesBody,
      reward: { anyOf: [rewardBody, { type: 'null' }] },
    },
  },
};

const statusSchema: FastifySchema = {
  tags: ['Campaigns'],
  summary: 'Change campaign status',
  security: secured,
  params: idParams,
  body: {
    type: 'object',
    required: ['status'],
    properties: { status: { type: 'string', enum: STATUS }, reason: { type: 'string' } },
  },
};

const scheduleSchema: FastifySchema = {
  tags: ['Campaigns'],
  summary: 'Schedule a campaign',
  security: secured,
  params: idParams,
  body: {
    type: 'object',
    required: ['scheduleType'],
    properties: {
      scheduleType: { type: 'string', enum: SCHEDULE_TYPE },
      startAt: { type: 'string' },
      endAt: { type: 'string' },
      recurrenceCron: { type: 'string' },
      timezone: { type: 'string' },
    },
  },
};

const targetsSchema: FastifySchema = {
  tags: ['Campaigns'],
  summary: 'Add member targets to a campaign',
  security: secured,
  params: idParams,
  body: {
    type: 'object',
    required: ['memberIds'],
    properties: { memberIds: { type: 'array', items: uuidParam } },
  },
};

const executeSchema: FastifySchema = {
  tags: ['Campaigns'],
  summary: 'Execute a campaign (issue rewards to enrolled members)',
  security: secured,
  params: idParams,
  body: { type: 'object', properties: { dryRun: { type: 'boolean' } } },
};

const enrollmentsSchema: FastifySchema = {
  tags: ['Campaigns'],
  summary: 'List campaign enrollments',
  security: secured,
  params: idParams,
  querystring: {
    type: 'object',
    properties: {
      page: { type: 'integer', minimum: 1 },
      pageSize: { type: 'integer', minimum: 1, maximum: 100 },
      status: { type: 'string', enum: ['ELIGIBLE', 'ENROLLED', 'REWARDED', 'EXCLUDED'] },
    },
  },
};

const idOnlySchema: FastifySchema = { tags: ['Campaigns'], security: secured, params: idParams };
const memberSchema: FastifySchema = {
  tags: ['Campaigns'],
  security: secured,
  params: memberParams,
};
const meSchema: FastifySchema = { tags: ['Campaigns'], security: secured };

export interface RegisterCampaignRoutesOptions {
  service: CampaignService;
  authenticate: preHandlerAsyncHookHandler;
  guardDeps: GuardDeps;
}

/**
 * Registers campaign routes under `/api/v1/campaigns`. Admin routes run
 * authentication then an RBAC permission guard; self-service `/me*` routes run
 * authentication only (ownership is enforced in the controller/service).
 */
export function registerCampaignRoutes(
  app: FastifyInstance,
  options: RegisterCampaignRoutesOptions,
): void {
  const { service, authenticate, guardDeps } = options;
  const controller = new CampaignController(service);

  const protect = (permission: string): preHandlerAsyncHookHandler[] => [
    authenticate,
    requirePermission(guardDeps, permission),
  ];
  const authed: preHandlerAsyncHookHandler[] = [authenticate];

  app.register(
    (instance, _options, done) => {
      // Self-service (static paths first).
      instance.get('/me', { schema: meSchema, preHandler: authed }, controller.mine);
      instance.get('/me/available', { schema: meSchema, preHandler: authed }, controller.available);

      // Admin.
      instance.get(
        '/',
        { schema: listSchema, preHandler: protect(PERMISSIONS.CAMPAIGN_READ) },
        controller.list,
      );
      instance.post(
        '/',
        { schema: createSchema, preHandler: protect(PERMISSIONS.CAMPAIGN_CREATE) },
        controller.create,
      );
      instance.get(
        '/member/:memberId',
        { schema: memberSchema, preHandler: protect(PERMISSIONS.CAMPAIGN_READ) },
        controller.memberCampaigns,
      );
      instance.get(
        '/:id',
        { schema: idOnlySchema, preHandler: protect(PERMISSIONS.CAMPAIGN_READ) },
        controller.get,
      );
      instance.put(
        '/:id',
        { schema: updateSchema, preHandler: protect(PERMISSIONS.CAMPAIGN_UPDATE) },
        controller.update,
      );
      instance.patch(
        '/:id/status',
        { schema: statusSchema, preHandler: protect(PERMISSIONS.CAMPAIGN_STATUS) },
        controller.changeStatus,
      );
      instance.post(
        '/:id/schedule',
        { schema: scheduleSchema, preHandler: protect(PERMISSIONS.CAMPAIGN_SCHEDULE) },
        controller.schedule,
      );
      instance.post(
        '/:id/targets',
        { schema: targetsSchema, preHandler: protect(PERMISSIONS.CAMPAIGN_UPDATE) },
        controller.addTargets,
      );
      instance.post(
        '/:id/execute',
        { schema: executeSchema, preHandler: protect(PERMISSIONS.CAMPAIGN_EXECUTE) },
        controller.execute,
      );
      instance.get(
        '/:id/history',
        { schema: idOnlySchema, preHandler: protect(PERMISSIONS.CAMPAIGN_READ) },
        controller.history,
      );
      instance.get(
        '/:id/executions',
        { schema: idOnlySchema, preHandler: protect(PERMISSIONS.CAMPAIGN_READ) },
        controller.executions,
      );
      instance.get(
        '/:id/enrollments',
        { schema: enrollmentsSchema, preHandler: protect(PERMISSIONS.CAMPAIGN_READ) },
        controller.enrollments,
      );

      // Member self-enroll (authed; ownership in controller).
      instance.post('/:id/enroll', { schema: idOnlySchema, preHandler: authed }, controller.enroll);

      done();
    },
    { prefix: CAMPAIGNS_PREFIX },
  );
}
