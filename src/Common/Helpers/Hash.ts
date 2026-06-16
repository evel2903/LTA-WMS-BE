import { createHash } from 'crypto';

/**
 * Deterministic SHA-256 hex digest. Used to store only a hash of high-entropy
 * secrets (e.g. refresh tokens) so the plaintext is never persisted while still
 * allowing exact-match lookups.
 */
export const Sha256Hex = (value: string): string => createHash('sha256').update(value).digest('hex');
