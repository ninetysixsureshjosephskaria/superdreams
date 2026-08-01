import type { FastifyReply, FastifyRequest } from 'fastify';

import { requireAuth } from '@/modules/auth/guards';
import { sendSuccess } from '@/utils';

import type { NotificationActor } from '../dto';
import type { NotificationService } from '../services';
import { notificationIdParamsSchema, templateIdParamsSchema } from '../validators';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function actorFrom(request: FastifyRequest): NotificationActor {
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

/** HTTP boundary for the Notification Center. Validation happens in the service (Zod). */
export class NotificationController {
  public constructor(private readonly service: NotificationService) {}

  // --- Templates ---

  public listTemplates = async (
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<FastifyReply> => {
    return sendSuccess(reply, await this.service.listTemplates(request.query));
  };

  public getTemplate = async (
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<FastifyReply> => {
    const { id } = templateIdParamsSchema.parse(request.params);
    return sendSuccess(reply, await this.service.getTemplate(id));
  };

  public createTemplate = async (
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<FastifyReply> => {
    return sendSuccess(
      reply,
      await this.service.createTemplate(request.body, actorFrom(request)),
      201,
    );
  };

  public updateTemplate = async (
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<FastifyReply> => {
    const { id } = templateIdParamsSchema.parse(request.params);
    return sendSuccess(
      reply,
      await this.service.updateTemplate(id, request.body, actorFrom(request)),
    );
  };

  public previewTemplate = async (
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<FastifyReply> => {
    const { id } = templateIdParamsSchema.parse(request.params);
    return sendSuccess(reply, await this.service.previewTemplate(id, request.body));
  };

  // --- Notifications (admin) ---

  public list = async (request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> => {
    return sendSuccess(reply, await this.service.list(request.query));
  };

  public get = async (request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> => {
    const { id } = notificationIdParamsSchema.parse(request.params);
    return sendSuccess(reply, await this.service.get(id));
  };

  public create = async (request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> => {
    return sendSuccess(
      reply,
      await this.service.createDraft(request.body, actorFrom(request)),
      201,
    );
  };

  public send = async (request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> => {
    return sendSuccess(reply, await this.service.send(request.body, actorFrom(request)), 201);
  };

  public schedule = async (request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> => {
    return sendSuccess(reply, await this.service.schedule(request.body, actorFrom(request)), 201);
  };

  public retry = async (request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> => {
    const { id } = notificationIdParamsSchema.parse(request.params);
    return sendSuccess(reply, await this.service.retry(id, actorFrom(request)));
  };

  public cancel = async (request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> => {
    const { id } = notificationIdParamsSchema.parse(request.params);
    return sendSuccess(reply, await this.service.cancel(id, actorFrom(request)));
  };

  public process = async (request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> => {
    return sendSuccess(
      reply,
      await this.service.processQueue(request.body ?? {}, actorFrom(request)),
    );
  };

  public deliveries = async (
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<FastifyReply> => {
    const { id } = notificationIdParamsSchema.parse(request.params);
    return sendSuccess(reply, { items: await this.service.getDeliveries(id) });
  };

  public logs = async (request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> => {
    const { id } = notificationIdParamsSchema.parse(request.params);
    return sendSuccess(reply, { items: await this.service.getLogs(id) });
  };

  public queue = async (request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> => {
    const status =
      typeof (request.query as { status?: string }).status === 'string'
        ? (request.query as { status?: string }).status
        : undefined;
    return sendSuccess(reply, await this.service.getQueue(status));
  };

  // --- Member inbox & preferences ---

  public inbox = async (request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> => {
    const context = requireAuth(request);
    return sendSuccess(reply, await this.service.getInbox(context.userId, request.query));
  };

  public unreadCount = async (
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<FastifyReply> => {
    const context = requireAuth(request);
    return sendSuccess(reply, { unread: await this.service.unreadCount(context.userId) });
  };

  public markRead = async (request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> => {
    const context = requireAuth(request);
    const { id } = notificationIdParamsSchema.parse(request.params);
    return sendSuccess(reply, await this.service.markRead(id, context.userId, true));
  };

  public markUnread = async (
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<FastifyReply> => {
    const context = requireAuth(request);
    const { id } = notificationIdParamsSchema.parse(request.params);
    return sendSuccess(reply, await this.service.markRead(id, context.userId, false));
  };

  public archive = async (request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> => {
    const context = requireAuth(request);
    const { id } = notificationIdParamsSchema.parse(request.params);
    return sendSuccess(reply, await this.service.archive(id, context.userId));
  };

  public getPreferences = async (
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<FastifyReply> => {
    const context = requireAuth(request);
    return sendSuccess(reply, { items: await this.service.getPreferences(context.userId) });
  };

  public updatePreferences = async (
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<FastifyReply> => {
    const context = requireAuth(request);
    return sendSuccess(reply, {
      items: await this.service.updatePreferences(context.userId, request.body, actorFrom(request)),
    });
  };
}
