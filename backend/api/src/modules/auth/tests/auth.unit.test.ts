import { describe, expect, it } from 'vitest';

import { TokenService } from '../strategies/jwt.strategy';
import { generateOpaqueToken, hashToken, safeEqualHex } from '../utils/tokens';

describe('token utils', () => {
  it('generates unique, URL-safe opaque tokens', () => {
    const a = generateOpaqueToken();
    const b = generateOpaqueToken();
    expect(a).not.toBe(b);
    expect(a).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it('hashes deterministically and never returns the raw token', () => {
    const raw = 'super-secret-token';
    const hash = hashToken(raw);
    expect(hash).toBe(hashToken(raw));
    expect(hash).not.toContain(raw);
    expect(hash).toHaveLength(64);
  });

  it('compares hex digests in constant time', () => {
    const hash = hashToken('a');
    expect(safeEqualHex(hash, hash)).toBe(true);
    expect(safeEqualHex(hash, hashToken('b'))).toBe(false);
    expect(safeEqualHex(hash, 'deadbeef')).toBe(false);
  });
});

describe('TokenService', () => {
  const service = new TokenService();

  it('signs and verifies an access token round-trip', async () => {
    const token = await service.signAccessToken({ sub: 'user-1', sid: 'session-1' });
    const claims = await service.verifyAccessToken(token);
    expect(claims.sub).toBe('user-1');
    expect(claims.sid).toBe('session-1');
    expect(claims.exp).toBeGreaterThan(claims.iat);
  });

  it('rejects a tampered token', async () => {
    const token = await service.signAccessToken({ sub: 'user-1', sid: 'session-1' });
    await expect(service.verifyAccessToken(`${token}tampered`)).rejects.toThrow();
  });
});
