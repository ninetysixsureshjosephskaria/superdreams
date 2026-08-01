import { hash, verify } from '@node-rs/argon2';

/**
 * Hashes a plaintext password using **Argon2id** (the DNA-07 preferred
 * algorithm). Reusable by the authentication phase; contains no auth flow.
 */
export async function hashPassword(plain: string): Promise<string> {
  return hash(plain);
}

/** Verifies a plaintext password against an Argon2id hash. */
export async function verifyPassword(hashValue: string, plain: string): Promise<boolean> {
  return verify(hashValue, plain);
}
