import type { FastifyReply, FastifyRequest } from 'fastify';

import { NotFoundError } from '@/errors';
import { requireAuth } from '@/modules/auth/guards';
import { sendSuccess } from '@/utils';

import type { WalletActor, WalletDetail } from '../dto';
import type { WalletService } from '../services';
import {
  holdParamsSchema,
  meWalletQuerySchema,
  transactionParamsSchema,
  walletIdParamsSchema,
} from '../validators';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function actorFrom(request: FastifyRequest): WalletActor {
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

/** HTTP boundary for Wallet Management. Validation happens in the service (Zod). */
export class WalletController {
  public constructor(private readonly service: WalletService) {}

  public list = async (request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> => {
    return sendSuccess(reply, await this.service.list(request.query));
  };

  public get = async (request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> => {
    const { id } = walletIdParamsSchema.parse(request.params);
    return sendSuccess(reply, await this.service.getDetail(id));
  };

  public getBalance = async (
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<FastifyReply> => {
    const { id } = walletIdParamsSchema.parse(request.params);
    return sendSuccess(reply, await this.service.getBalance(id));
  };

  public listTransactions = async (
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<FastifyReply> => {
    const { id } = walletIdParamsSchema.parse(request.params);
    return sendSuccess(reply, await this.service.listTransactions(id, request.query));
  };

  public listHolds = async (
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<FastifyReply> => {
    const { id } = walletIdParamsSchema.parse(request.params);
    return sendSuccess(reply, { items: await this.service.listHolds(id) });
  };

  public listStatements = async (
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<FastifyReply> => {
    const { id } = walletIdParamsSchema.parse(request.params);
    return sendSuccess(reply, { items: await this.service.listStatements(id) });
  };

  public create = async (request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> => {
    const detail = await this.service.create(request.body, actorFrom(request));
    return sendSuccess(reply, detail, 201);
  };

  public changeStatus = async (
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<FastifyReply> => {
    const { id } = walletIdParamsSchema.parse(request.params);
    return sendSuccess(
      reply,
      await this.service.changeStatus(id, request.body, actorFrom(request)),
    );
  };

  public credit = async (request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> => {
    const { id } = walletIdParamsSchema.parse(request.params);
    const txn = await this.service.credit(id, request.body, actorFrom(request));
    return sendSuccess(reply, txn, 201);
  };

  public debit = async (request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> => {
    const { id } = walletIdParamsSchema.parse(request.params);
    const txn = await this.service.debit(id, request.body, actorFrom(request));
    return sendSuccess(reply, txn, 201);
  };

  public adjust = async (request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> => {
    const { id } = walletIdParamsSchema.parse(request.params);
    const txn = await this.service.adjust(id, request.body, actorFrom(request));
    return sendSuccess(reply, txn, 201);
  };

  public placeHold = async (
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<FastifyReply> => {
    const { id } = walletIdParamsSchema.parse(request.params);
    const hold = await this.service.placeHold(id, request.body, actorFrom(request));
    return sendSuccess(reply, hold, 201);
  };

  public releaseHold = async (
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<FastifyReply> => {
    const { id, holdId } = holdParamsSchema.parse(request.params);
    const hold = await this.service.releaseHold(id, holdId, actorFrom(request));
    return sendSuccess(reply, hold);
  };

  public reverse = async (request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> => {
    const { id, transactionId } = transactionParamsSchema.parse(request.params);
    const txn = await this.service.reverse(id, transactionId, actorFrom(request));
    return sendSuccess(reply, txn, 201);
  };

  public generateStatement = async (
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<FastifyReply> => {
    const { id } = walletIdParamsSchema.parse(request.params);
    const statement = await this.service.generateStatement(id, request.body, actorFrom(request));
    return sendSuccess(reply, statement, 201);
  };

  public validateBalance = async (
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<FastifyReply> => {
    const { id } = walletIdParamsSchema.parse(request.params);
    return sendSuccess(reply, await this.service.validateBalance(id));
  };

  // --- Portal self-service (ownership-scoped; no admin permission required) ---

  public getMine = async (request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> => {
    const wallet = await this.mineOrThrow(request);
    return sendSuccess(reply, wallet);
  };

  public getMyBalance = async (
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<FastifyReply> => {
    const wallet = await this.mineOrThrow(request);
    return sendSuccess(reply, await this.service.getBalance(wallet.id));
  };

  public listMyTransactions = async (
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<FastifyReply> => {
    const wallet = await this.mineOrThrow(request);
    return sendSuccess(reply, await this.service.listTransactions(wallet.id, request.query));
  };

  public listMyStatements = async (
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<FastifyReply> => {
    const wallet = await this.mineOrThrow(request);
    return sendSuccess(reply, { items: await this.service.listStatements(wallet.id) });
  };

  public listMyHolds = async (
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<FastifyReply> => {
    const wallet = await this.mineOrThrow(request);
    return sendSuccess(reply, { items: await this.service.listHolds(wallet.id) });
  };

  private async mineOrThrow(request: FastifyRequest): Promise<WalletDetail> {
    const context = requireAuth(request);
    const { kind } = meWalletQuerySchema.parse(request.query);
    const wallet = await this.service.getByUserId(context.userId, kind);
    if (!wallet) {
      throw new NotFoundError('No wallet is linked to your account.');
    }
    return wallet;
  }
}
