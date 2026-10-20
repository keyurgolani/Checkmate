/**
 * CHECKMATE-01.1 · contracts (#29), test plan item 5: `deriveLegacyStepKey`
 * golden values and the Step Key form. The golden keys were computed outside
 * this code, with Python's hashlib and checked against shasum.
 */
import { describe, expect, it } from 'vitest';
import { deriveLegacyStepKey, isStepKey, LEGACY_STEP_KEY_NAMESPACE, mintStepKey, sha256UuidV8 } from './step-key';

const GOLDEN: readonly (readonly [templateId: string, itemId: string, stepKey: string])[] = [
  ['ab12cd34ef56gh7', 'zy98xw76vu54ts3', 'c6474031-2755-8076-af48-0ef489cf0c2a'],
  ['zy98xw76vu54ts3', 'ab12cd34ef56gh7', '37e1837f-6bed-81c4-a403-ea853fd0170f'],
  ['ab12cd34ef56gh7', 'q1w2e3r4t5y6u7i', 'ff691b1e-fdcc-8ccc-9f23-740eceaa87ea'],
  ['t5w8m2k4q7x1z3a', 'i9c6e3g0b2d4f6h', '29498283-c810-8ba0-a38f-c8a0cca956e9'],
];

const UUID_V8 = /^[0-9a-f]{8}-[0-9a-f]{4}-8[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

describe('deriveLegacyStepKey', () => {
  it.each(GOLDEN)('derives the golden key for template %s, item %s', (templateId, itemId, stepKey) => {
    expect(deriveLegacyStepKey(templateId, itemId)).toBe(stepKey);
  });

  it('hashes `checkmate-step-key:v1:<templateId>:<itemId>`', () => {
    expect(LEGACY_STEP_KEY_NAMESPACE).toBe('checkmate-step-key:v1');
    for (const [templateId, itemId] of GOLDEN) {
      expect(deriveLegacyStepKey(templateId, itemId)).toBe(sha256UuidV8(`checkmate-step-key:v1:${templateId}:${itemId}`));
    }
  });

  it('formats a version-8 UUID with the RFC 9562 variant', () => {
    for (const [templateId, itemId] of GOLDEN) expect(deriveLegacyStepKey(templateId, itemId)).toMatch(UUID_V8);
  });

  it('returns the same key on every call and a different key when the ids swap', () => {
    expect(deriveLegacyStepKey('ab12cd34ef56gh7', 'zy98xw76vu54ts3')).toBe(deriveLegacyStepKey('ab12cd34ef56gh7', 'zy98xw76vu54ts3'));
    expect(deriveLegacyStepKey('zy98xw76vu54ts3', 'ab12cd34ef56gh7')).not.toBe(deriveLegacyStepKey('ab12cd34ef56gh7', 'zy98xw76vu54ts3'));
  });

  it('gives every item of one template its own key', () => {
    const keys = Array.from({ length: 500 }, (_, i) => deriveLegacyStepKey('ab12cd34ef56gh7', `item${i}`));
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('refuses an empty id or one with a colon, so no two pairs hash the same text', () => {
    expect(() => deriveLegacyStepKey('', 'zy98xw76vu54ts3')).toThrow(TypeError);
    expect(() => deriveLegacyStepKey('ab12cd34ef56gh7', '')).toThrow(TypeError);
    // Without the guard, ('a:b', 'c') and ('a', 'b:c') would hash the same text.
    expect(() => deriveLegacyStepKey('a:b', 'c')).toThrow(/templateId/);
    expect(() => deriveLegacyStepKey('a', 'b:c')).toThrow(/itemId/);
  });
});

describe('Step Key form', () => {
  it('mints distinct version-4 UUIDs', () => {
    const keys = Array.from({ length: 200 }, () => mintStepKey());
    expect(new Set(keys).size).toBe(keys.length);
    for (const key of keys) {
      expect(key).toMatch(UUID_V4);
      expect(isStepKey(key)).toBe(true);
    }
  });

  it('accepts minted and derived keys', () => {
    expect(isStepKey(mintStepKey())).toBe(true);
    expect(isStepKey(deriveLegacyStepKey('ab12cd34ef56gh7', 'zy98xw76vu54ts3'))).toBe(true);
  });

  it('rejects record ids and anything else that is not a lowercase version-4 or version-8 UUID', () => {
    for (const value of [
      'ab12cd34ef56gh7',
      '',
      'C6474031-2755-8076-AF48-0EF489CF0C2A',
      '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
      '0190d3c2-8c1e-7b4a-9f1e-3c5d7a9b1e2f',
      'c6474031-2755-8076-0f48-0ef489cf0c2a',
      'c6474031275580766f480ef489cf0c2a',
      undefined,
      42,
    ]) {
      expect(isStepKey(value), String(value)).toBe(false);
    }
  });
});
