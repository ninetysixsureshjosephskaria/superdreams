import cookie from '@fastify/cookie';
import type { FastifyInstance } from 'fastify';

/**
 * Registers cookie parsing/serialization. The authentication module uses this to
 * store the refresh token in an httpOnly, Secure, SameSite cookie.
 */
export async function registerCookie(app: FastifyInstance): Promise<void> {
  await app.register(cookie);
}
