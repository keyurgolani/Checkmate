import { describe, expect, it } from 'vitest';
import { isLatest, parseRelease } from './is-latest.mjs';

const tags = ['v0.2.0', 'v0.2.1', 'v0.3.0', 'baseline-0.1.0', 'v0.4.0-rc.1'];

describe('is-latest', () => {
  it('keeps latest on v0.3.0 when v0.2.1 is pushed after it', () => {
    expect(isLatest('v0.2.1', tags)).toBe(false);
  });

  it('moves latest for the highest release', () => {
    expect(isLatest('v0.3.0', tags)).toBe(true);
    expect(isLatest('v0.3.1', tags)).toBe(true);
  });

  it('compares numerically, not as text', () => {
    expect(isLatest('v0.10.0', ['v0.9.0', 'v0.10.0'])).toBe(true);
    expect(isLatest('v0.9.0', ['v0.9.0', 'v0.10.0'])).toBe(false);
  });

  it('ignores pre-releases and never tags one latest', () => {
    expect(isLatest('v0.4.0-rc.1', tags)).toBe(false);
    expect(isLatest('v0.3.0', [...tags, 'v9.0.0-beta.1'])).toBe(true);
  });

  it.each(['baseline-0.1.0', 'v1', 'v1.2', 'v01.2.3', 'vX.Y.Z', 'refs/tags/v1.2.3'])('treats %s as no release', (tag) => {
    expect(parseRelease(tag)).toBeNull();
    expect(isLatest(tag, [])).toBe(false);
  });
});
