import type { FastifyReply, FastifyRequest } from 'fastify';

import { requireAuth } from '@/modules/auth/guards';
import { sendSuccess } from '@/utils';

import type { ReportActor } from '../dto';
import type { ReportService } from '../services';
import { reportIdParamsSchema } from '../validators';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function actorFrom(request: FastifyRequest): ReportActor {
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

/** HTTP boundary for Reports & Analytics. Validation happens in the service (Zod). */
export class ReportController {
  public constructor(private readonly service: ReportService) {}

  // --- Catalog ---
  public listReports = async (
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<FastifyReply> => {
    return sendSuccess(reply, await this.service.listReports(request.query));
  };

  public listCategories = async (
    _request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<FastifyReply> => {
    return sendSuccess(reply, { items: await this.service.listCategories() });
  };

  public getReport = async (
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<FastifyReply> => {
    const { id } = reportIdParamsSchema.parse(request.params);
    return sendSuccess(reply, await this.service.getReport(id));
  };

  // --- Run ---
  public run = async (request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> => {
    return sendSuccess(reply, await this.service.runReport(request.body, actorFrom(request)));
  };

  // --- Exports ---
  public listExports = async (
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<FastifyReply> => {
    return sendSuccess(reply, await this.service.listExports(request.query));
  };

  public getExport = async (
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<FastifyReply> => {
    const { id } = reportIdParamsSchema.parse(request.params);
    return sendSuccess(reply, await this.service.getExport(id));
  };

  public createExport = async (
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<FastifyReply> => {
    return sendSuccess(
      reply,
      await this.service.createExport(request.body, actorFrom(request)),
      201,
    );
  };

  public downloadExport = async (
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<FastifyReply> => {
    const { id } = reportIdParamsSchema.parse(request.params);
    const file = await this.service.downloadExport(id);
    return reply
      .header('content-type', file.contentType)
      .header('content-disposition', `attachment; filename="${file.fileName}"`)
      .send(file.content);
  };

  // --- Schedules ---
  public listSchedules = async (
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<FastifyReply> => {
    return sendSuccess(reply, await this.service.listSchedules(request.query));
  };

  public createSchedule = async (
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<FastifyReply> => {
    return sendSuccess(
      reply,
      await this.service.createSchedule(request.body, actorFrom(request)),
      201,
    );
  };

  public updateSchedule = async (
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<FastifyReply> => {
    const { id } = reportIdParamsSchema.parse(request.params);
    return sendSuccess(
      reply,
      await this.service.updateSchedule(id, request.body, actorFrom(request)),
    );
  };

  public deleteSchedule = async (
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<FastifyReply> => {
    const { id } = reportIdParamsSchema.parse(request.params);
    await this.service.deleteSchedule(id, actorFrom(request));
    return sendSuccess(reply, { deleted: true });
  };

  // --- History ---
  public listHistory = async (
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<FastifyReply> => {
    return sendSuccess(reply, await this.service.listHistory(request.query));
  };

  // --- Dashboards ---
  public getDashboard = async (
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<FastifyReply> => {
    const context = requireAuth(request);
    return sendSuccess(reply, await this.service.getDashboard(context.userId));
  };

  public updateDashboardLayout = async (
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<FastifyReply> => {
    const context = requireAuth(request);
    return sendSuccess(reply, {
      layout: await this.service.updateDashboardLayout(
        context.userId,
        request.body,
        actorFrom(request),
      ),
    });
  };

  // --- Saved reports ---
  public listSavedReports = async (
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<FastifyReply> => {
    const context = requireAuth(request);
    return sendSuccess(reply, await this.service.listSavedReports(context.userId, request.query));
  };

  public saveReport = async (
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<FastifyReply> => {
    const context = requireAuth(request);
    return sendSuccess(
      reply,
      await this.service.saveReport(context.userId, request.body, actorFrom(request)),
      201,
    );
  };

  public deleteSavedReport = async (
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<FastifyReply> => {
    const context = requireAuth(request);
    const { id } = reportIdParamsSchema.parse(request.params);
    await this.service.deleteSavedReport(id, context.userId);
    return sendSuccess(reply, { deleted: true });
  };

  // --- Saved filters ---
  public listSavedFilters = async (
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<FastifyReply> => {
    const context = requireAuth(request);
    return sendSuccess(reply, { items: await this.service.listSavedFilters(context.userId) });
  };

  public createSavedFilter = async (
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<FastifyReply> => {
    const context = requireAuth(request);
    return sendSuccess(
      reply,
      await this.service.createSavedFilter(context.userId, request.body, actorFrom(request)),
      201,
    );
  };

  // --- Favorites ---
  public listFavorites = async (
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<FastifyReply> => {
    const context = requireAuth(request);
    return sendSuccess(reply, { items: await this.service.listFavorites(context.userId) });
  };

  public addFavorite = async (
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<FastifyReply> => {
    const context = requireAuth(request);
    return sendSuccess(reply, await this.service.addFavorite(context.userId, request.body), 201);
  };

  public removeFavorite = async (
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<FastifyReply> => {
    const context = requireAuth(request);
    const { code } = request.params as { code: string };
    return sendSuccess(reply, await this.service.removeFavorite(context.userId, code));
  };

  // --- Member portal (own data) ---
  public myWalletSummary = async (
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<FastifyReply> => {
    const context = requireAuth(request);
    return sendSuccess(reply, await this.service.memberWalletSummary(context.userId));
  };

  public myRewardSummary = async (
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<FastifyReply> => {
    const context = requireAuth(request);
    return sendSuccess(reply, await this.service.memberRewardSummary(context.userId));
  };
}
