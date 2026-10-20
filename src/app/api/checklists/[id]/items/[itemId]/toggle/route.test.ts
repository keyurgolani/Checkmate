/**
 * CHECKMATE-09.1 · slice 0 (#53), test plan item 1: the step toggle works for
 * the run owner. At 9019d17 it read `.data.checklist` off `getById`'s
 * `Result<Instance>` and answered 404.
 */

import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { OTHER_USER, OWNER, ownerRunFixture, sessionFor } from '@/test/run-fixture';

const { getServerAuth } = vi.hoisted(() => ({ getServerAuth: vi.fn() }));
vi.mock('@/lib/server-auth', () => ({ getServerAuth }));

import { PUT } from './route';

function toggle(stepId: string) {
  return PUT(new NextRequest(`http://localhost/api/checklists/run-1/items/${stepId}/toggle`, { method: 'PUT' }), {
    params: Promise.resolve({ id: 'run-1', itemId: stepId }),
  });
}

beforeEach(() => {
  getServerAuth.mockReset();
});

describe('PUT /api/checklists/[id]/items/[itemId]/toggle', () => {
  it("completes the owner's step and returns the step and progress", async () => {
    const fake = ownerRunFixture();
    getServerAuth.mockResolvedValue(sessionFor(OWNER, fake));

    const response = await toggle('step-1');

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      success: true,
      task: expect.objectContaining({ id: 'step-1', checklistId: 'run-1', isCompleted: true }),
      progress: { totalItems: 2, completedItems: 1, percentage: 50 },
    });
    expect(fake.records('instanceItems').find((step) => step.id === 'step-1')).toMatchObject({ isCompleted: true });
    expect(fake.records('instances')[0]).toMatchObject({ progress: 50, completedAt: null });
  });

  it('answers another user like a missing run and writes nothing', async () => {
    const fake = ownerRunFixture(OTHER_USER);
    getServerAuth.mockResolvedValue(sessionFor(OTHER_USER, fake));

    const response = await toggle('step-1');

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({
      success: false,
      error: { code: 'CHECKLIST_001', message: 'Checklist not found', timestamp: expect.any(String) },
    });
    expect(fake.writes()).toEqual([]);
  });
});
