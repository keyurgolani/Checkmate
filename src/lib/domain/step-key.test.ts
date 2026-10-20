/**
 * CHECKMATE-01.1 · contracts (#29), test plan item 5: `deriveLegacyStepKey`
 * golden values and the Step Key rules. The golden keys were computed outside
 * this code, with Python's hashlib and checked against shasum.
 */
import fs from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';
import {
  deriveLegacyStepKey,
  isStepKey,
  LEGACY_STEP_KEY_NAMESPACE,
  mintStepKey,
  sha256UuidV8,
  STEP_KEY_MAX_LENGTH,
} from './step-key';

const GOLDEN: readonly (readonly [templateId: string, itemId: string, stepKey: string])[] = [
  ['ab12cd34ef56gh7', 'zy98xw76vu54ts3', 'c6474031-2755-8076-af48-0ef489cf0c2a'],
  ['zy98xw76vu54ts3', 'ab12cd34ef56gh7', '37e1837f-6bed-81c4-a403-ea853fd0170f'],
  ['ab12cd34ef56gh7', 'q1w2e3r4t5y6u7i', 'ff691b1e-fdcc-8ccc-9f23-740eceaa87ea'],
  ['t5w8m2k4q7x1z3a', 'i9c6e3g0b2d4f6h', '29498283-c810-8ba0-a38f-c8a0cca956e9'],
];

const UUID_V8 = /^[0-9a-f]{8}-[0-9a-f]{4}-8[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

describe('deriveLegacyStepKey', () => {
  it.each(GOLDEN)('derives the golden key for template %s, item %s', async (templateId, itemId, stepKey) => {
    await expect(deriveLegacyStepKey(templateId, itemId)).resolves.toBe(stepKey);
  });

  it('hashes `checkmate-step-key:v1:<templateId>:<itemId>`', async () => {
    expect(LEGACY_STEP_KEY_NAMESPACE).toBe('checkmate-step-key:v1');
    for (const [templateId, itemId, stepKey] of GOLDEN) {
      await expect(sha256UuidV8(`checkmate-step-key:v1:${templateId}:${itemId}`)).resolves.toBe(stepKey);
    }
  });

  it('formats a version-8 UUID with the RFC 9562 variant', async () => {
    for (const [templateId, itemId] of GOLDEN) await expect(deriveLegacyStepKey(templateId, itemId)).resolves.toMatch(UUID_V8);
  });

  it('returns the same key on every call and a different key when the ids swap', async () => {
    const key = await deriveLegacyStepKey('ab12cd34ef56gh7', 'zy98xw76vu54ts3');
    await expect(deriveLegacyStepKey('ab12cd34ef56gh7', 'zy98xw76vu54ts3')).resolves.toBe(key);
    await expect(deriveLegacyStepKey('zy98xw76vu54ts3', 'ab12cd34ef56gh7')).resolves.not.toBe(key);
  });

  it('gives every item of one template its own key', async () => {
    const keys = await Promise.all(Array.from({ length: 500 }, (_, i) => deriveLegacyStepKey('ab12cd34ef56gh7', `item${i}`)));
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('refuses an empty id or one with a colon, so no two pairs hash the same text', async () => {
    await expect(deriveLegacyStepKey('', 'zy98xw76vu54ts3')).rejects.toThrow(TypeError);
    await expect(deriveLegacyStepKey('ab12cd34ef56gh7', '')).rejects.toThrow(TypeError);
    // Without the guard, ('a:b', 'c') and ('a', 'b:c') would hash the same text.
    await expect(deriveLegacyStepKey('a:b', 'c')).rejects.toThrow(/templateId/);
    await expect(deriveLegacyStepKey('a', 'b:c')).rejects.toThrow(/itemId/);
  });
});

describe('Step Key rules', () => {
  it('mints distinct version-4 UUIDs', () => {
    const keys = Array.from({ length: 200 }, () => mintStepKey());
    expect(new Set(keys).size).toBe(keys.length);
    for (const key of keys) {
      expect(key).toMatch(UUID_V4);
      expect(isStepKey(key)).toBe(true);
    }
  });

  it('accepts minted, derived and authored keys', async () => {
    expect(isStepKey(mintStepKey())).toBe(true);
    expect(isStepKey(await deriveLegacyStepKey('ab12cd34ef56gh7', 'zy98xw76vu54ts3'))).toBe(true);
    // A key someone wrote in a blueprint file, or one an import kept.
    for (const authored of ['check-the-lights', 'Step 1', 'x', 'a'.repeat(STEP_KEY_MAX_LENGTH)]) {
      expect(isStepKey(authored), authored).toBe(true);
    }
  });

  it('rejects an empty or overlong key, a record id, and anything that is not a string', () => {
    expect(STEP_KEY_MAX_LENGTH).toBe(128);
    for (const value of ['', 'a'.repeat(STEP_KEY_MAX_LENGTH + 1), 'ab12cd34ef56gh7', undefined, null, 42]) {
      expect(isStepKey(value), String(value)).toBe(false);
    }
  });

  it('imports nothing from Node, so browser code can use it', () => {
    const source = fs.readFileSync(path.resolve(__dirname, 'step-key.ts'), 'utf8');
    expect(source).not.toMatch(/from ['"](node:|crypto['"])/);
    expect(source).not.toMatch(/require\(/);
  });
});
