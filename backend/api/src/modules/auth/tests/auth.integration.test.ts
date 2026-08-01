import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { config } from '@/config';
import type { Database } from '@/database/client';
import { createIdentityModule, type IdentityModule } from '@/modules/identity';

import { createAuthModule, type AuthModule } from '../index';

const CONTEXT = { ipAddress: '127.0.0.1', userAgent: 'vitest' };

async function createActiveUser(
  identity: IdentityModule,
  email: string,
  password: string,
): Promise<string> {
  const user = await identity.users.createUser({ email, password });
  await identity.users.changeStatus(user.id, 'ACTIVE');
  return user.id;
}

describe('auth module (PGlite)', () => {
  let client: PGlite;
  let db: Database;
  let identity: IdentityModule;
  let auth: AuthModule;

  beforeAll(async () => {
    client = new PGlite();
    const pgliteDb = drizzle(client);
    await migrate(pgliteDb, { migrationsFolder: 'drizzle' });
    db = pgliteDb as unknown as Database;
    identity = createIdentityModule(db);
    auth = createAuthModule(db, identity);
  });

  afterAll(async () => {
    await client.close();
  });

  it('logs in with valid credentials and issues verifiable tokens', async () => {
    await createActiveUser(identity, 'login@acme.test', 'Str0ngPass1');

    const result = await auth.auth.login(
      { email: 'login@acme.test', password: 'Str0ngPass1' },
      CONTEXT,
    );

    expect(result.user.email).toBe('login@acme.test');
    expect(result.tokens.accessToken.split('.')).toHaveLength(3);
    expect(result.tokens.refreshToken.length).toBeGreaterThan(20);

    const claims = await auth.tokens.verifyAccessToken(result.tokens.accessToken);
    expect(claims.sub).toBe(result.user.id);
    expect(claims.sid).toBe(result.session.id);
  });

  it('rejects invalid credentials', async () => {
    await expect(
      auth.auth.login({ email: 'login@acme.test', password: 'wrong-password' }, CONTEXT),
    ).rejects.toThrow(/invalid email or password/i);
  });

  it('rotates the refresh token and detects reuse', async () => {
    await createActiveUser(identity, 'rotate@acme.test', 'Str0ngPass1');
    const { tokens, session } = await auth.auth.login(
      { email: 'rotate@acme.test', password: 'Str0ngPass1' },
      CONTEXT,
    );

    const rotated = await auth.sessions.rotateRefreshToken(tokens.refreshToken);
    expect(rotated.tokens.refreshToken).not.toBe(tokens.refreshToken);
    expect(rotated.sessionId).toBe(session.id);

    // Presenting the already-used token triggers theft detection + session revocation.
    await expect(auth.sessions.rotateRefreshToken(tokens.refreshToken)).rejects.toThrow(/reuse/i);
    expect(await auth.sessions.validateSession(session.id)).toBeNull();
    // The rotated (now-orphaned) token is also revoked.
    await expect(auth.sessions.rotateRefreshToken(rotated.tokens.refreshToken)).rejects.toThrow();
  });

  it('locks the account after too many failed attempts', async () => {
    await createActiveUser(identity, 'lock@acme.test', 'Str0ngPass1');
    for (let attempt = 0; attempt < config.auth.lockout.maxAttempts; attempt += 1) {
      await expect(
        auth.auth.login({ email: 'lock@acme.test', password: 'wrong' }, CONTEXT),
      ).rejects.toThrow();
    }
    // Even with the correct password, the account is now temporarily locked.
    await expect(
      auth.auth.login({ email: 'lock@acme.test', password: 'Str0ngPass1' }, CONTEXT),
    ).rejects.toThrow(/locked/i);
  });

  it('runs the forgot/reset password flow (single-use token, sessions revoked)', async () => {
    const userId = await createActiveUser(identity, 'reset@acme.test', 'Str0ngPass1');
    const login = await auth.auth.login(
      { email: 'reset@acme.test', password: 'Str0ngPass1' },
      CONTEXT,
    );

    const token = await auth.password.forgotPassword({ email: 'reset@acme.test' });
    expect(token).not.toBeNull();

    await auth.password.resetPassword({ token: token ?? '', password: 'N3wStrongPass' });

    // Old sessions are revoked after a password reset.
    expect(await auth.sessions.validateSession(login.session.id)).toBeNull();
    // The reset token cannot be reused.
    await expect(
      auth.password.resetPassword({ token: token ?? '', password: 'An0therPass9' }),
    ).rejects.toThrow(/invalid or expired/i);

    // The new password works; the old one does not.
    const relogin = await auth.auth.login(
      { email: 'reset@acme.test', password: 'N3wStrongPass' },
      CONTEXT,
    );
    expect(relogin.user.id).toBe(userId);
  });

  it('changes password, rejecting reuse of the current password', async () => {
    const userId = await createActiveUser(identity, 'change@acme.test', 'Str0ngPass1');

    await expect(
      auth.password.changePassword(userId, {
        currentPassword: 'Str0ngPass1',
        newPassword: 'Str0ngPass1',
      }),
    ).rejects.toThrow(/different/i);

    await auth.password.changePassword(userId, {
      currentPassword: 'Str0ngPass1',
      newPassword: 'Ch4ngedPass2',
    });

    const relogin = await auth.auth.login(
      { email: 'change@acme.test', password: 'Ch4ngedPass2' },
      CONTEXT,
    );
    expect(relogin.user.id).toBe(userId);
  });

  it('verifies an email via a verification token', async () => {
    const userId = await createActiveUser(identity, 'verify@acme.test', 'Str0ngPass1');
    const before = await identity.users.getById(userId);
    expect(before?.emailVerifiedAt ?? null).toBeNull();

    const token = await auth.emailVerification.requestVerification(userId);
    await auth.emailVerification.verifyEmail(token);

    const after = await identity.users.getById(userId);
    expect(after?.emailVerifiedAt ?? null).not.toBeNull();

    await expect(auth.emailVerification.verifyEmail(token)).rejects.toThrow(/invalid or expired/i);
  });
});
