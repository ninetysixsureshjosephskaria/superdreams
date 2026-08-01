import type { FastifyReply, FastifyRequest } from 'fastify';

import { NotFoundError } from '@/errors';
import { requireAuth } from '@/modules/auth/guards';
import { sendSuccess } from '@/utils';

import type { MemberActor } from '../dto';
import type { MemberService } from '../services';
import { memberIdParamsSchema } from '../validators';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function actorFrom(request: FastifyRequest): MemberActor {
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

/** HTTP boundary for Member Management. Validation happens in the service (Zod). */
export class MemberController {
  public constructor(private readonly service: MemberService) {}

  public list = async (request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> => {
    return sendSuccess(reply, await this.service.list(request.query));
  };

  public get = async (request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> => {
    const { id } = memberIdParamsSchema.parse(request.params);
    return sendSuccess(reply, await this.service.getDetail(id));
  };

  public create = async (request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> => {
    const detail = await this.service.create(request.body, actorFrom(request));
    return sendSuccess(reply, detail, 201);
  };

  public update = async (request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> => {
    const { id } = memberIdParamsSchema.parse(request.params);
    return sendSuccess(reply, await this.service.update(id, request.body, actorFrom(request)));
  };

  public changeStatus = async (
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<FastifyReply> => {
    const { id } = memberIdParamsSchema.parse(request.params);
    return sendSuccess(
      reply,
      await this.service.changeStatus(id, request.body, actorFrom(request)),
    );
  };

  public remove = async (request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> => {
    const { id } = memberIdParamsSchema.parse(request.params);
    await this.service.archive(id, actorFrom(request));
    return sendSuccess(reply, { archived: true });
  };

  public listActivity = async (
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<FastifyReply> => {
    const { id } = memberIdParamsSchema.parse(request.params);
    return sendSuccess(reply, { items: await this.service.listActivity(id) });
  };

  public listStatusHistory = async (
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<FastifyReply> => {
    const { id } = memberIdParamsSchema.parse(request.params);
    return sendSuccess(reply, { items: await this.service.listStatusHistory(id) });
  };

  public listNotes = async (
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<FastifyReply> => {
    const { id } = memberIdParamsSchema.parse(request.params);
    return sendSuccess(reply, { items: await this.service.listNotes(id) });
  };

  public addNote = async (request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> => {
    const { id } = memberIdParamsSchema.parse(request.params);
    const note = await this.service.addNote(id, request.body, actorFrom(request));
    return sendSuccess(reply, note, 201);
  };

  public listDocuments = async (
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<FastifyReply> => {
    const { id } = memberIdParamsSchema.parse(request.params);
    return sendSuccess(reply, { items: await this.service.listDocuments(id) });
  };

  public addDocument = async (
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<FastifyReply> => {
    const { id } = memberIdParamsSchema.parse(request.params);
    const document = await this.service.addDocument(id, request.body, actorFrom(request));
    return sendSuccess(reply, document, 201);
  };

  // --- Portal self-service (ownership-scoped; no admin permission required) ---

  public getMe = async (request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> => {
    const context = requireAuth(request);
    const detail = await this.service.getByUserId(context.userId);
    if (!detail) {
      throw new NotFoundError('No member record is linked to your account.');
    }
    return sendSuccess(reply, detail);
  };

  public updateMe = async (request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> => {
    const context = requireAuth(request);
    const detail = await this.service.getByUserId(context.userId);
    if (!detail) {
      throw new NotFoundError('No member record is linked to your account.');
    }
    const updated = await this.service.updateOwnProfile(
      detail.id,
      request.body,
      actorFrom(request),
    );
    return sendSuccess(reply, updated);
  };
}
