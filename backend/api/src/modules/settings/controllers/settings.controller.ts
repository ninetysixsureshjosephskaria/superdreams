import type { FastifyReply, FastifyRequest } from 'fastify';

import { requireAuth } from '@/modules/auth/guards';
import { sendSuccess } from '@/utils';

import type { SettingActor } from '../dto';
import type { SettingsService } from '../services';
import { settingIdParamsSchema } from '../validators';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function actorFrom(request: FastifyRequest): SettingActor {
  const context = requireAuth(request);
  const userAgent = request.headers['user-agent'];
  const requestId = request.requestContext?.requestId;
  return {
    userId: context.userId,
    ipAddress: request.ip.length > 0 ? request.ip : null,
    userAgent: typeof userAgent === 'string' ? userAgent : null,
    correlationId: requestId && UUID_RE.test(requestId) ? requestId : null,
  };
}

/** HTTP boundary for Settings & Administration. Validation happens in the service (Zod). */
export class SettingsController {
  public constructor(private readonly service: SettingsService) {}

  public list = async (request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> => {
    return sendSuccess(reply, await this.service.listSettings(request.query));
  };

  public update = async (request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> => {
    return sendSuccess(reply, {
      items: await this.service.updateSettings(request.body, actorFrom(request)),
    });
  };

  public categories = async (
    _request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<FastifyReply> => {
    return sendSuccess(reply, { items: await this.service.getCategories() });
  };

  public history = async (request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> => {
    return sendSuccess(reply, await this.service.getHistory(request.query));
  };

  public getBranding = async (
    _request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<FastifyReply> => {
    return sendSuccess(reply, { items: await this.service.getBranding() });
  };

  public updateBranding = async (
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<FastifyReply> => {
    return sendSuccess(reply, {
      items: await this.service.updateBranding(request.body, actorFrom(request)),
    });
  };

  public listFeatureToggles = async (
    _request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<FastifyReply> => {
    return sendSuccess(reply, { items: await this.service.listFeatureToggles() });
  };

  public createFeatureToggle = async (
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<FastifyReply> => {
    return sendSuccess(
      reply,
      await this.service.createFeatureToggle(request.body, actorFrom(request)),
      201,
    );
  };

  public updateFeatureToggle = async (
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<FastifyReply> => {
    const { id } = settingIdParamsSchema.parse(request.params);
    return sendSuccess(
      reply,
      await this.service.updateFeatureToggle(id, request.body, actorFrom(request)),
    );
  };

  public getMaintenance = async (
    _request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<FastifyReply> => {
    return sendSuccess(reply, await this.service.getMaintenance());
  };

  public setMaintenance = async (
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<FastifyReply> => {
    return sendSuccess(reply, await this.service.setMaintenance(request.body, actorFrom(request)));
  };

  public getPublic = async (
    _request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<FastifyReply> => {
    return sendSuccess(reply, await this.service.getPublicSettings());
  };
}
