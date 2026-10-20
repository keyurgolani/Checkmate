import { expect, it } from 'vitest';

// Planted to show that a failing test turns the aggregate check red. Reverted in the next commit.
it('planted failure for the aggregate check', () => {
  expect(1 + 1).toBe(3);
});
