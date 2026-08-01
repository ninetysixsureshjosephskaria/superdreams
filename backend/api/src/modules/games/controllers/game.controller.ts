import type { FastifyReply, FastifyRequest } from 'fastify';

import { requireAuth } from '@/modules/auth/guards';
import { sendSuccess } from '@/utils';

import type { GameActor } from '../dto';
import type { GameService } from '../services';
import { gameIdParamsSchema } from '../validators';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function actorFrom(request: FastifyRequest): GameActor {
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

/** HTTP boundary for Games. All routes are member self-service (auth-only). */
export class GameController {
  public constructor(private readonly service: GameService) {}

  public listGames = async (_request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> =>
    sendSuccess(reply, { items: await this.service.listGames() });

  public start = async (request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> => {
    const { id } = gameIdParamsSchema.parse(request.params);
    const context = requireAuth(request);
    return sendSuccess(
      reply,
      await this.service.startForUser(context.userId, id, actorFrom(request)),
      201,
    );
  };

  public submitScore = async (
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<FastifyReply> => {
    const { id } = gameIdParamsSchema.parse(request.params);
    const context = requireAuth(request);
    return sendSuccess(
      reply,
      await this.service.submitScoreForUser(context.userId, id, request.body, actorFrom(request)),
      201,
    );
  };

  public myHistory = async (
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<FastifyReply> => {
    const context = requireAuth(request);
    return sendSuccess(reply, await this.service.getHistory(context.userId, request.query));
  };
}
