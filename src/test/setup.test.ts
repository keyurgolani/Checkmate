/**
 * Test Setup Verification
 * Verifies that the testing infrastructure is working correctly
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  validTitleArb,
  invalidTitleArb,
  validEmailArb,
  visibilityArb,
  checklistItemArb,
  testDataFactory,
} from './index';

describe('Test Infrastructure', () => {
  it('should run basic tests', () => {
    expect(true).toBe(true);
  });

  it('should have fast-check available', () => {
    expect(fc).toBeDefined();
    expect(fc.assert).toBeDefined();
  });
});

describe('Test Data Factory', () => {
  it('should generate unique emails', () => {
    const email1 = testDataFactory.email();
    const email2 = testDataFactory.email();
    expect(email1).not.toBe(email2);
    expect(email1).toContain('@test.local');
  });

  it('should generate valid passwords', () => {
    const password = testDataFactory.password();
    expect(password.length).toBeGreaterThanOrEqual(8);
  });

  it('should generate blueprint data', () => {
    const blueprint = testDataFactory.blueprint();
    expect(blueprint.title).toBeDefined();
    expect(blueprint.visibility).toBe('private');
  });

  it('should allow blueprint overrides', () => {
    const blueprint = testDataFactory.blueprint({ visibility: 'public' });
    expect(blueprint.visibility).toBe('public');
  });
});

describe('Property Test Generators', () => {
  it('should generate valid titles', () => {
    fc.assert(
      fc.property(validTitleArb, (title) => {
        return title.trim().length > 0 && title.length <= 200;
      }),
      { numRuns: 50 }
    );
  });

  it('should generate invalid titles', () => {
    fc.assert(
      fc.property(invalidTitleArb, (title) => {
        return title.trim().length === 0 || title.length > 200;
      }),
      { numRuns: 50 }
    );
  });

  it('should generate valid emails', () => {
    fc.assert(
      fc.property(validEmailArb, (email) => {
        return email.includes('@') && email.length > 0;
      }),
      { numRuns: 50 }
    );
  });

  it('should generate valid visibility values', () => {
    fc.assert(
      fc.property(visibilityArb, (visibility) => {
        return ['private', 'public', 'shared'].includes(visibility);
      }),
      { numRuns: 20 }
    );
  });

  it('should generate valid checklist items', () => {
    fc.assert(
      fc.property(checklistItemArb, (item) => {
        return (
          ['task', 'reference'].includes(item.type) &&
          item.content.length >= 1 &&
          item.position >= 0
        );
      }),
      { numRuns: 50 }
    );
  });
});
