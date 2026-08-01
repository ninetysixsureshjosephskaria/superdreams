import type { FastifyInstance, FastifySchema, preHandlerAsyncHookHandler } from 'fastify';

import { PERMISSIONS, requirePermission, type GuardDeps } from '@/modules/rbac';

import { NotificationController } from '../controllers';
import type { NotificationService } from '../services';

const PREFIX = '/api/v1';
const secured = [{ bearerAuth: [] }];
const uuidParam = { type: 'string', format: 'uuid' } as const;
const idParams = { type: 'object', required: ['id'], properties: { id: uuidParam } } as const;

const CHANNEL = ['IN_APP', 'EMAIL', 'SMS', 'PUSH'];
const STATUS = ['DRAFT', 'QUEUED', 'SENDING', 'SENT', 'DELIVERED', 'FAILED', 'CANCELLED'];
const TEMPLATE_STATUS = ['DRAFT', 'ACTIVE', 'INACTIVE'];

const templateBody = {
  type: 'object',
  properties: {
    code: { type: 'string' },
    name: { type: 'string' },
    channel: { type: 'string', enum: CHANNEL },
    groupCode: { type: 'string' },
    subject: { type: 'string' },
    body: { type: 'string' },
    locale: { type: 'string' },
    status: { type: 'string', enum: TEMPLATE_STATUS },
  },
} as const;

const listTemplatesSchema: FastifySchema = {
  tags: ['Notifications'],
  summary: 'List notification templates',
  security: secured,
  querystring: {
    type: 'object',
    properties: {
      page: { type: 'integer', minimum: 1 },
      pageSize: { type: 'integer', minimum: 1, maximum: 100 },
      search: { type: 'string' },
      channel: { type: 'string', enum: CHANNEL },
      status: { type: 'string', enum: TEMPLATE_STATUS },
      sortBy: { type: 'string', enum: ['createdAt', 'updatedAt', 'name', 'code'] },
      order: { type: 'string', enum: ['asc', 'desc'] },
    },
  },
};

const createTemplateSchema: FastifySchema = {
  tags: ['Notifications'],
  summary: 'Create a notification template',
  security: secured,
  body: { ...templateBody, required: ['code', 'name', 'channel', 'body'] },
};

const updateTemplateSchema: FastifySchema = {
  tags: ['Notifications'],
  summary: 'Update a notification template',
  security: secured,
  params: idParams,
  body: templateBody,
};

const previewSchema: FastifySchema = {
  tags: ['Notifications'],
  summary: 'Preview a template with variables',
  security: secured,
  params: idParams,
  body: {
    type: 'object',
    properties: { variables: { type: 'object', additionalProperties: true } },
  },
};

const notificationBody = {
  type: 'object',
  properties: {
    templateCode: { type: 'string' },
    channel: { type: 'string', enum: CHANNEL },
    subject: { type: 'string' },
    body: { type: 'string' },
    variables: { type: 'object', additionalProperties: true },
    groupCode: { type: 'string' },
    recipientUserId: uuidParam,
    recipientMemberId: uuidParam,
    scheduledAt: { type: 'string' },
  },
} as const;

const createNotificationSchema: FastifySchema = {
  tags: ['Notifications'],
  summary: 'Create a notification (draft)',
  security: secured,
  body: notificationBody,
};
const sendSchema: FastifySchema = {
  tags: ['Notifications'],
  summary: 'Send a notification now',
  security: secured,
  body: notificationBody,
};
const scheduleSchema: FastifySchema = {
  tags: ['Notifications'],
  summary: 'Schedule a notification',
  security: secured,
  body: notificationBody,
};

const listNotificationsSchema: FastifySchema = {
  tags: ['Notifications'],
  summary: 'List notifications (admin)',
  security: secured,
  querystring: {
    type: 'object',
    properties: {
      page: { type: 'integer', minimum: 1 },
      pageSize: { type: 'integer', minimum: 1, maximum: 100 },
      search: { type: 'string' },
      channel: { type: 'string', enum: CHANNEL },
      status: { type: 'string', enum: STATUS },
      recipientUserId: uuidParam,
      recipientMemberId: uuidParam,
      dateFrom: { type: 'string' },
      dateTo: { type: 'string' },
      sortBy: { type: 'string', enum: ['createdAt', 'scheduledAt', 'status'] },
      order: { type: 'string', enum: ['asc', 'desc'] },
    },
  },
};

const processSchema: FastifySchema = {
  tags: ['Notifications'],
  summary: 'Process the delivery queue',
  security: secured,
  body: {
    type: 'object',
    properties: { limit: { type: 'integer', minimum: 1, maximum: 500 }, asOf: { type: 'string' } },
  },
};

const inboxSchema: FastifySchema = {
  tags: ['Notifications'],
  summary: 'Member notification inbox',
  security: secured,
  querystring: {
    type: 'object',
    properties: {
      page: { type: 'integer', minimum: 1 },
      pageSize: { type: 'integer', minimum: 1, maximum: 100 },
      status: { type: 'string', enum: ['ALL', 'UNREAD', 'READ', 'ARCHIVED'] },
    },
  },
};

const preferencesBody: FastifySchema = {
  tags: ['Notifications'],
  summary: 'Update notification preferences',
  security: secured,
  body: {
    type: 'object',
    required: ['preferences'],
    properties: {
      preferences: {
        type: 'array',
        items: {
          type: 'object',
          required: ['channel', 'enabled'],
          properties: {
            channel: { type: 'string', enum: CHANNEL },
            groupCode: { type: ['string', 'null'] },
            enabled: { type: 'boolean' },
          },
        },
      },
    },
  },
};

const idOnly: FastifySchema = { tags: ['Notifications'], security: secured, params: idParams };
const meSchema: FastifySchema = { tags: ['Notifications'], security: secured };

export interface RegisterNotificationRoutesOptions {
  service: NotificationService;
  authenticate: preHandlerAsyncHookHandler;
  guardDeps: GuardDeps;
}

/** Registers notification routes. Admin routes require RBAC; `/me*` are auth-only. */
export function registerNotificationRoutes(
  app: FastifyInstance,
  options: RegisterNotificationRoutesOptions,
): void {
  const { service, authenticate, guardDeps } = options;
  const controller = new NotificationController(service);

  const protect = (permission: string): preHandlerAsyncHookHandler[] => [
    authenticate,
    requirePermission(guardDeps, permission),
  ];
  const authed: preHandlerAsyncHookHandler[] = [authenticate];
  const P = PERMISSIONS;

  app.register(
    (instance, _options, done) => {
      // Templates.
      instance.get(
        '/notification-templates',
        { schema: listTemplatesSchema, preHandler: protect(P.NOTIFICATION_READ) },
        controller.listTemplates,
      );
      instance.post(
        '/notification-templates',
        { schema: createTemplateSchema, preHandler: protect(P.NOTIFICATION_TEMPLATE_CREATE) },
        controller.createTemplate,
      );
      instance.get(
        '/notification-templates/:id',
        { schema: idOnly, preHandler: protect(P.NOTIFICATION_READ) },
        controller.getTemplate,
      );
      instance.put(
        '/notification-templates/:id',
        { schema: updateTemplateSchema, preHandler: protect(P.NOTIFICATION_TEMPLATE_UPDATE) },
        controller.updateTemplate,
      );
      instance.post(
        '/notification-templates/:id/preview',
        { schema: previewSchema, preHandler: protect(P.NOTIFICATION_READ) },
        controller.previewTemplate,
      );

      // Member self-service (static paths first).
      instance.get(
        '/notifications/me',
        { schema: inboxSchema, preHandler: authed },
        controller.inbox,
      );
      instance.get(
        '/notifications/me/unread-count',
        { schema: meSchema, preHandler: authed },
        controller.unreadCount,
      );
      instance.get(
        '/notifications/preferences',
        { schema: meSchema, preHandler: authed },
        controller.getPreferences,
      );
      instance.put(
        '/notifications/preferences',
        { schema: preferencesBody, preHandler: authed },
        controller.updatePreferences,
      );

      // Admin notifications.
      instance.get(
        '/notifications',
        { schema: listNotificationsSchema, preHandler: protect(P.NOTIFICATION_READ) },
        controller.list,
      );
      instance.post(
        '/notifications',
        { schema: createNotificationSchema, preHandler: protect(P.NOTIFICATION_SEND) },
        controller.create,
      );
      instance.post(
        '/notifications/send',
        { schema: sendSchema, preHandler: protect(P.NOTIFICATION_SEND) },
        controller.send,
      );
      instance.post(
        '/notifications/schedule',
        { schema: scheduleSchema, preHandler: protect(P.NOTIFICATION_SEND) },
        controller.schedule,
      );
      instance.post(
        '/notifications/process',
        { schema: processSchema, preHandler: protect(P.NOTIFICATION_QUEUE_MANAGE) },
        controller.process,
      );
      instance.get(
        '/notifications/queue',
        { schema: meSchema, preHandler: protect(P.NOTIFICATION_READ) },
        controller.queue,
      );
      instance.get(
        '/notifications/:id',
        { schema: idOnly, preHandler: protect(P.NOTIFICATION_READ) },
        controller.get,
      );
      instance.get(
        '/notifications/:id/deliveries',
        { schema: idOnly, preHandler: protect(P.NOTIFICATION_READ) },
        controller.deliveries,
      );
      instance.get(
        '/notifications/:id/logs',
        { schema: idOnly, preHandler: protect(P.NOTIFICATION_READ) },
        controller.logs,
      );
      instance.post(
        '/notifications/:id/retry',
        { schema: idOnly, preHandler: protect(P.NOTIFICATION_QUEUE_MANAGE) },
        controller.retry,
      );
      instance.post(
        '/notifications/:id/cancel',
        { schema: idOnly, preHandler: protect(P.NOTIFICATION_QUEUE_MANAGE) },
        controller.cancel,
      );

      // Member actions on own notifications (auth-only; ownership in service).
      instance.patch(
        '/notifications/:id/read',
        { schema: idOnly, preHandler: authed },
        controller.markRead,
      );
      instance.patch(
        '/notifications/:id/unread',
        { schema: idOnly, preHandler: authed },
        controller.markUnread,
      );
      instance.patch(
        '/notifications/:id/archive',
        { schema: idOnly, preHandler: authed },
        controller.archive,
      );

      done();
    },
    { prefix: PREFIX },
  );
}
