/**
 * CHECKMATE-01.1 (#29): Step Keys. A Step Key is an opaque string in its own
 * indexed column, never a record id, and unique within a template's draft and
 * within each revision. A run step is keyed by (include path, Step Key).
 *
 * The server mints a version-4 UUID for a new step, and baseline steps get a
 * derived version-8 UUID. Keys that people write in blueprint files (16.3) or
 * that imports keep (16.1, 16.2) may be any opaque string that `isStepKey`
 * accepts. These are async functions on Web Crypto with no `node:` import, so
 * the browser and the server run the same code.
 */

/** The text `deriveLegacyStepKey` hashes starts with this. Changing it is a major contract bump. */
export const LEGACY_STEP_KEY_NAMESPACE = 'checkmate-step-key:v1';

/** The longest Step Key accepted. */
export const STEP_KEY_MAX_LENGTH = 128;

/** A PocketBase record id at its default: 15 lowercase letters and digits. */
const RECORD_ID = /^[a-z0-9]{15}$/;

/** True for a Step Key: a non-empty string of at most 128 characters that is not a record id. */
export function isStepKey(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && value.length <= STEP_KEY_MAX_LENGTH && !RECORD_ID.test(value);
}

/** A new Step Key, a version-4 UUID, for a new or duplicated step. */
export function mintStepKey(): string {
  return globalThis.crypto.randomUUID();
}

/**
 * The first 16 bytes of SHA-256 over `input` as a version-8 UUID (RFC 9562):
 * the version nibble becomes 8 and the variant bits become 10. 16.3's keyless
 * blueprint entries use the same construction over their own input.
 */
export async function sha256UuidV8(input: string): Promise<string> {
  const digest = await globalThis.crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
  const bytes = new Uint8Array(digest, 0, 16);
  bytes[6] = ((bytes[6] ?? 0) & 0x0f) | 0x80;
  bytes[8] = ((bytes[8] ?? 0) & 0x3f) | 0x80;
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
  return [hex.slice(0, 8), hex.slice(8, 12), hex.slice(12, 16), hex.slice(16, 20), hex.slice(20, 32)].join('-');
}

/**
 * The Step Key of a baseline step: the first 16 bytes of SHA-256 over
 * `checkmate-step-key:v1:<templateId>:<itemId>`, as a version-8 UUID. 04.1's
 * backfill and 16.1's v1 reader call it. Neither id may be empty or contain a
 * colon, so two different pairs never hash the same text.
 */
export async function deriveLegacyStepKey(templateId: string, itemId: string): Promise<string> {
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
