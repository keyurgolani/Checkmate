/**
 * CHECKMATE-01.1 (#29): Step Keys. A Step Key is an opaque string in its own
 * indexed column, never a record id, and unique within a template's draft and
 * within each revision. A run step is keyed by (include path, Step Key).
 *
 * Every Step Key is a lowercase UUID: version 4 when the server mints it,
 * version 8 when it is derived. Server-only, since it uses node:crypto.
 */
import { createHash, randomUUID } from 'node:crypto';

/** The text `deriveLegacyStepKey` hashes starts with this. Changing it is a major contract bump. */
export const LEGACY_STEP_KEY_NAMESPACE = 'checkmate-step-key:v1';

const STEP_KEY = /^[0-9a-f]{8}-[0-9a-f]{4}-[48][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

/** True for a Step Key: a lowercase UUID, version 4 or 8, RFC 9562 variant. */
export function isStepKey(value: unknown): value is string {
  return typeof value === 'string' && STEP_KEY.test(value);
}

/** A new Step Key, for a new or duplicated step. */
export function mintStepKey(): string {
  return randomUUID();
}

/**
 * The first 16 bytes of SHA-256 over `input` as a version-8 UUID (RFC 9562):
 * the version nibble becomes 8 and the variant bits become 10. 16.3's keyless
 * blueprint entries use the same construction over their own input.
 */
export function sha256UuidV8(input: string): string {
  const bytes = createHash('sha256').update(input, 'utf8').digest().subarray(0, 16);
  bytes[6] = ((bytes[6] ?? 0) & 0x0f) | 0x80;
  bytes[8] = ((bytes[8] ?? 0) & 0x3f) | 0x80;
  const hex = bytes.toString('hex');
  return [hex.slice(0, 8), hex.slice(8, 12), hex.slice(12, 16), hex.slice(16, 20), hex.slice(20, 32)].join('-');
}

/**
 * The Step Key of a baseline step: the first 16 bytes of SHA-256 over
 * `checkmate-step-key:v1:<templateId>:<itemId>`, as a version-8 UUID. 04.1's
 * backfill and 16.1's v1 reader call it. Neither id may be empty or contain a
 * colon, so two different pairs never hash the same text.
 */
export function deriveLegacyStepKey(templateId: string, itemId: string): string {
  for (const [name, value] of [
    ['templateId', templateId],
    ['itemId', itemId],
  ] as const) {
    if (typeof value !== 'string' || value === '' || value.includes(':')) {
      throw new TypeError(`deriveLegacyStepKey: ${name} must be a non-empty string without a colon`);
    }
  }
  return sha256UuidV8(`${LEGACY_STEP_KEY_NAMESPACE}:${templateId}:${itemId}`);
}
