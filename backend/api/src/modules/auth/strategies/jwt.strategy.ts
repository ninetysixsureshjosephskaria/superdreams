import { SignJWT, jwtVerify, type JWTPayload } from 'jose';

import { config } from '@/config';

export interface AccessTokenClaims {
  /** User id. */
  sub: string;
  /** Session id. */
  sid: string;
}

export interface VerifiedAccessToken extends AccessTokenClaims {
  iat: number;
  exp: number;
}

const encodedSecret = new TextEncoder().encode(config.jwt.secret);

/**
 * Centralized JWT signing and verification (HS256). This is the **only** place
 * access tokens are minted or verified. Refresh tokens are opaque and handled
 * separately (never JWTs).
 */
export class TokenService {
  public async signAccessToken(claims: AccessTokenClaims): Promise<string> {
    const now = Math.floor(Date.now() / 1000);
    return new SignJWT({ sid: claims.sid })
      .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
      .setSubject(claims.sub)
      .setIssuer(config.auth.issuer)
      .setAudience(config.auth.audience)
      .setIssuedAt(now)
      .setExpirationTime(now + config.auth.accessTtlSeconds)
      .sign(encodedSecret);
  }

  public async verifyAccessToken(token: string): Promise<VerifiedAccessToken> {
    const { payload } = await jwtVerify(token, encodedSecret, {
      issuer: config.auth.issuer,
      audience: config.auth.audience,
    });
    return TokenService.toVerified(payload);
  }

  private static toVerified(payload: JWTPayload): VerifiedAccessToken {
    const sub = payload.sub;
    const sid = payload['sid'];
    if (
      typeof sub !== 'string' ||
      typeof sid !== 'string' ||
      typeof payload.iat !== 'number' ||
      typeof payload.exp !== 'number'
    ) {
      throw new Error('Invalid access token payload.');
    }
    return { sub, sid, iat: payload.iat, exp: payload.exp };
  }
}
