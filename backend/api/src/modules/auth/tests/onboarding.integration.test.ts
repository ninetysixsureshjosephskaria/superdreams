import { PGlite } from '@electric-sql/pglite';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import type { Database } from '@/database/client';
import { users } from '@/database/schema';
import { EmailService, MockEmailProvider } from '@/email';
import { createIdentityModule } from '@/modules/identity';

import { createAuthModule, type AuthModule } from '..';
import { AuthEventBus } from '../events';

const CTX = { ipAddress: '127.0.0.1', userAgent: 'vitest' };
const EMAIL = 'newmember@onboarding.test';
const PASSWORD = 'Member123!';
const NEW_PASSWORD = 'NewPass456!';

describe('member onboarding (PGlite) — signup → activation → login → reset', () => {
  let client: PGlite;
  let db: Database;
  let mock: MockEmailProvider;
  let mod: AuthModule;

  beforeAll(async () => {
    client = new PGlite();
    const pglite = drizzle(client);
    await migrate(pglite, { migrationsFolder: 'drizzle' });
    db = pglite as unknown as Database;
    mock = new MockEmailProvider();
    mod = createAuthModule(
      db,
      createIdentityModule(db),
      new AuthEventBus(),
      new EmailService(mock, 'http://localhost:5173'),
    );
  });

  afterAll(async () => {
    await client.close();
  });

  async function statusOf(email: string): Promise<{ status: string; verified: boolean }> {
    const [row] = await db
      .select({ status: users.status, verifiedAt: users.emailVerifiedAt })
      .from(users)
      .where(eq(users.email, email));
    return { status: row!.status, verified: row!.verifiedAt !== null };
  }

  it('sign up creates a PENDING account and sends the activation email', async () => {
    const result = await mod.registration.register({
      email: EMAIL,
      password: PASSWORD,
      firstName: 'Nova',
      lastName: 'Reyes',
    });

    expect(result.email).toBe(EMAIL);
    expect(result.verificationToken).toBeTruthy();

    const state = await statusOf(EMAIL);
    expect(state.status).toBe('PENDING');
    expect(state.verified).toBe(false);

    // Activation email was sent, contains the activation link.
    const sent = mock.lastTo(EMAIL);
    expect(sent?.subject).toMatch(/activate/i);
    expect(sent?.html).toContain('/activate?token=');
  });

  it('blocks login before activation', async () => {
    await expect(mod.auth.login({ email: EMAIL, password: PASSWORD }, CTX)).rejects.toThrow(
      /verify your email/i,
    );
  });

  it('activation link works (verify) and promotes PENDING → ACTIVE', async () => {
    const token = mock.lastTo(EMAIL)!.html.match(/\/activate\?token=([^"'&]+)/)![1]!;
    await mod.emailVerification.verifyEmail(decodeURIComponent(token));

    const state = await statusOf(EMAIL);
    expect(state.status).toBe('ACTIVE');
    expect(state.verified).toBe(true);
  });

  it('login succeeds after activation', async () => {
    const result = await mod.auth.login({ email: EMAIL, password: PASSWORD }, CTX);
    expect(result.user.email).toBe(EMAIL);
    expect(result.tokens.accessToken).toBeTruthy();
  });

  it('resend activation is a no-op once verified (returns null, sends nothing)', async () => {
    const before = mock.sent.length;
    const token = await mod.registration.resendVerification({ email: EMAIL });
    expect(token).toBeNull();
    expect(mock.sent.length).toBe(before);
  });

  it('forgot password sends a reset email, and reset works', async () => {
    const token = await mod.password.forgotPassword({ email: EMAIL });
    expect(token).toBeTruthy();
    const sent = mock.lastTo(EMAIL);
    expect(sent?.subject).toMatch(/reset/i);
    expect(sent?.html).toContain('/reset-password?token=');

    await mod.password.resetPassword({ token: token!, password: NEW_PASSWORD });

    // Old password no longer works; new one does.
    await expect(mod.auth.login({ email: EMAIL, password: PASSWORD }, CTX)).rejects.toThrow();
    const relogin = await mod.auth.login({ email: EMAIL, password: NEW_PASSWORD }, CTX);
    expect(relogin.user.email).toBe(EMAIL);
  });
});
