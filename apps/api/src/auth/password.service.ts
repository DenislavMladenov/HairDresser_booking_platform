import { Injectable } from '@nestjs/common';
import { Algorithm, hash, verify } from '@node-rs/argon2';

/**
 * Argon2id parameters follow the OWASP password storage recommendation
 * (19 MiB memory, 2 iterations, 1 degree of parallelism). Comfortable on a
 * 4 GB VM while still expensive to attack offline.
 */
const ARGON2_OPTIONS = {
  algorithm: Algorithm.Argon2id,
  memoryCost: 19_456,
  timeCost: 2,
  parallelism: 1,
} as const;

@Injectable()
export class PasswordService {
  hash(plainPassword: string): Promise<string> {
    return hash(plainPassword, ARGON2_OPTIONS);
  }

  /** Never throws: a malformed stored hash simply means "does not match". */
  async verify(storedHash: string, plainPassword: string): Promise<boolean> {
    try {
      return await verify(storedHash, plainPassword, ARGON2_OPTIONS);
    } catch {
      return false;
    }
  }
}
