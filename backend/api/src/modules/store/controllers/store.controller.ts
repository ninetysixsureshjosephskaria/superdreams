import type { FastifyReply, FastifyRequest } from 'fastify';

import { requireAuth } from '@/modules/auth/guards';
import { sendSuccess } from '@/utils';

import type { StoreActor } from '../dto';
import type { StoreService } from '../services';
import { storeIdParamsSchema } from '../validators';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function actorFrom(request: FastifyRequest): StoreActor {
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

/** HTTP boundary for the Dream Store. Validation happens in the service (Zod). */
export class StoreController {
  public constructor(private readonly service: StoreService) {}

  // --- Products (admin) ---
  public listProducts = async (
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<FastifyReply> => sendSuccess(reply, await this.service.listProducts(request.query));

  public getProduct = async (
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<FastifyReply> => {
    const { id } = storeIdParamsSchema.parse(request.params);
    return sendSuccess(reply, await this.service.getProduct(id));
  };

  public createProduct = async (
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<FastifyReply> =>
    sendSuccess(reply, await this.service.createProduct(request.body, actorFrom(request)), 201);

  public updateProduct = async (
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<FastifyReply> => {
    const { id } = storeIdParamsSchema.parse(request.params);
    return sendSuccess(
      reply,
      await this.service.updateProduct(id, request.body, actorFrom(request)),
    );
  };

  public deleteProduct = async (
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<FastifyReply> => {
    const { id } = storeIdParamsSchema.parse(request.params);
    await this.service.archiveProduct(id, actorFrom(request));
    return sendSuccess(reply, { archived: true });
  };

  // --- Categories (admin) ---
  public listCategories = async (
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<FastifyReply> =>
    sendSuccess(reply, { items: await this.service.listCategories(request.query) });

  public createCategory = async (
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<FastifyReply> =>
    sendSuccess(reply, await this.service.createCategory(request.body, actorFrom(request)), 201);

  public updateCategory = async (
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<FastifyReply> => {
    const { id } = storeIdParamsSchema.parse(request.params);
    return sendSuccess(
      reply,
      await this.service.updateCategory(id, request.body, actorFrom(request)),
    );
  };

  public deleteCategory = async (
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<FastifyReply> => {
    const { id } = storeIdParamsSchema.parse(request.params);
    await this.service.deleteCategory(id, actorFrom(request));
    return sendSuccess(reply, { deleted: true });
  };

  // --- Inventory (admin) ---
  public listInventory = async (
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<FastifyReply> => sendSuccess(reply, await this.service.listInventory(request.query));

  public adjustStock = async (
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<FastifyReply> => {
    const { id } = storeIdParamsSchema.parse(request.params);
    return sendSuccess(reply, await this.service.adjustStock(id, request.body, actorFrom(request)));
  };

  public inventoryHistory = async (
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<FastifyReply> => {
    const { id } = storeIdParamsSchema.parse(request.params);
    return sendSuccess(reply, { items: await this.service.getInventoryHistory(id) });
  };

  // --- Orders (admin) ---
  public listOrders = async (request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> =>
    sendSuccess(reply, await this.service.listOrders(request.query));

  public getOrder = async (request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> => {
    const { id } = storeIdParamsSchema.parse(request.params);
    return sendSuccess(reply, await this.service.getOrder(id));
  };

  public cancelOrder = async (
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<FastifyReply> => {
    const { id } = storeIdParamsSchema.parse(request.params);
    return sendSuccess(reply, await this.service.cancelOrder(id, actorFrom(request)));
  };

  // --- Member self-service (auth-only) ---
  public catalog = async (request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> =>
    sendSuccess(reply, await this.service.listCatalog(request.query));

  public redeem = async (request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> => {
    const context = requireAuth(request);
    return sendSuccess(
      reply,
      await this.service.redeemForUser(context.userId, request.body, actorFrom(request)),
      201,
    );
  };

  public myOrders = async (request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> => {
    const context = requireAuth(request);
    return sendSuccess(reply, await this.service.listMemberOrders(context.userId, request.query));
  };
}
