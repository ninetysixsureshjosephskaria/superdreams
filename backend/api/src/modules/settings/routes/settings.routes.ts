import type { FastifyInstance, FastifySchema, preHandlerAsyncHookHandler } from 'fastify';

import { PERMISSIONS, requirePermission, type GuardDeps } from '@/modules/rbac';

import { SettingsController } from '../controllers/settings.controller';
import type { SettingsService } from '../services';

const PREFIX = '/api/v1';
const secured = [{ bearerAuth: [] }];
const uuidParam = { type: 'string', format: 'uuid' } as const;
const idParams = { type: 'object', required: ['id'], properties: { id: uuidParam } } as const;

const listSchema: FastifySchema = {
  tags: ['Settings'],
  summary: 'List platform settings',
  security: secured,
  querystring: {
    type: 'object',
    properties: { category: { type: 'string' }, search: { type: 'string' } },
  },
};

const updateSchema: FastifySchema = {
  tags: ['Settings'],
  summary: 'Update platform settings',
  security: secured,
  body: {
    type: 'object',
    required: ['updates'],
    properties: { updates: { type: 'object', additionalProperties: true } },
  },
};

const brandingUpdateSchema: FastifySchema = {
  tags: ['Settings'],
  summary: 'Update branding settings',
  security: secured,
  body: {
    type: 'object',
    properties: {
      logoUrl: { type: 'string' },
      faviconUrl: { type: 'string' },
      primaryColor: { type: 'string' },
      secondaryColor: { type: 'string' },
      theme: { type: 'string' },
    },
  },
};

const historySchema: FastifySchema = {
  tags: ['Settings'],
  summary: 'Setting change history',
  security: secured,
  querystring: {
    type: 'object',
    properties: {
      page: { type: 'integer', minimum: 1 },
      pageSize: { type: 'integer', minimum: 1, maximum: 100 },
      key: { type: 'string' },
      category: { type: 'string' },
    },
  },
};

const createToggleSchema: FastifySchema = {
  tags: ['Settings'],
  summary: 'Create a feature toggle',
  security: secured,
  body: {
    type: 'object',
    required: ['key', 'name'],
    properties: {
      key: { type: 'string' },
      name: { type: 'string' },
      description: { type: 'string' },
      enabled: { type: 'boolean' },
      strategy: { type: 'object', additionalProperties: true },
    },
  },
};

const updateToggleSchema: FastifySchema = {
  tags: ['Settings'],
  summary: 'Update a feature toggle',
  security: secured,
  params: idParams,
  body: {
    type: 'object',
    properties: {
      name: { type: 'string' },
      description: { type: ['string', 'null'] },
      enabled: { type: 'boolean' },
      strategy: { type: ['object', 'null'], additionalProperties: true },
    },
  },
};

const maintenanceSchema: FastifySchema = {
  tags: ['Settings'],
  summary: 'Enable or disable maintenance mode',
  security: secured,
  body: {
    type: 'object',
    required: ['enabled'],
    properties: {
      enabled: { type: 'boolean' },
      title: { type: 'string' },
      message: { type: 'string' },
      allowAdminBypass: { type: 'boolean' },
      startsAt: { type: 'string' },
      endsAt: { type: 'string' },
    },
  },
};

const tagged: FastifySchema = { tags: ['Settings'], security: secured };

export interface RegisterSettingsRoutesOptions {
  service: SettingsService;
  authenticate: preHandlerAsyncHookHandler;
  guardDeps: GuardDeps;
}

/** Registers settings routes. All admin routes require RBAC; `/settings/public` is auth-only. */
export function registerSettingsRoutes(
  app: FastifyInstance,
  options: RegisterSettingsRoutesOptions,
): void {
  const { service, authenticate, guardDeps } = options;
  const controller = new SettingsController(service);

  const protect = (permission: string): preHandlerAsyncHookHandler[] => [
    authenticate,
    requirePermission(guardDeps, permission),
  ];
  const authed: preHandlerAsyncHookHandler[] = [authenticate];
  const P = PERMISSIONS;

  app.register(
    (instance, _options, done) => {
      // Static sub-routes first.
      instance.get(
        '/settings/categories',
        { schema: tagged, preHandler: protect(P.SETTINGS_READ) },
        controller.categories,
      );
      instance.get(
        '/settings/history',
        { schema: historySchema, preHandler: protect(P.SETTINGS_READ) },
        controller.history,
      );
      instance.get(
        '/settings/branding',
        { schema: tagged, preHandler: protect(P.SETTINGS_READ) },
        controller.getBranding,
      );
      instance.put(
        '/settings/branding',
        { schema: brandingUpdateSchema, preHandler: protect(P.SETTINGS_UPDATE) },
        controller.updateBranding,
      );
      instance.get(
        '/settings/feature-toggles',
        { schema: tagged, preHandler: protect(P.SETTINGS_READ) },
        controller.listFeatureToggles,
      );
      instance.post(
        '/settings/feature-toggles',
        { schema: createToggleSchema, preHandler: protect(P.SETTINGS_FEATURE_MANAGE) },
        controller.createFeatureToggle,
      );
      instance.patch(
        '/settings/feature-toggles/:id',
        { schema: updateToggleSchema, preHandler: protect(P.SETTINGS_FEATURE_MANAGE) },
        controller.updateFeatureToggle,
      );
      instance.get(
        '/settings/maintenance',
        { schema: tagged, preHandler: protect(P.SETTINGS_READ) },
        controller.getMaintenance,
      );
      instance.post(
        '/settings/maintenance',
        { schema: maintenanceSchema, preHandler: protect(P.SETTINGS_MAINTENANCE_MANAGE) },
        controller.setMaintenance,
      );
      instance.get(
        '/settings/public',
        { schema: tagged, preHandler: authed },
        controller.getPublic,
      );

      // Collection routes.
      instance.get(
        '/settings',
        { schema: listSchema, preHandler: protect(P.SETTINGS_READ) },
        controller.list,
      );
      instance.put(
        '/settings',
        { schema: updateSchema, preHandler: protect(P.SETTINGS_UPDATE) },
        controller.update,
      );

      done();
    },
    { prefix: PREFIX },
  );
}
