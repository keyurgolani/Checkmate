/**
 * CHECKMATE-07.3 · stub removal (#49), test plan items 1 and 2.
 */

import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { NextRequest } from 'next/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createFakePocketBase, type FakePocketBase } from '@/test/fake-pocketbase';

const { getServerAuth } = vi.hoisted(() => ({ getServerAuth: vi.fn() }));
vi.mock('@/lib/server-auth', () => ({ getServerAuth }));

import { POST } from './route';
import { ChecklistService } from '@/lib/services/checklist';
import { proxy } from '@/proxy';

const OWNER = { id: 'owner-1', email: 'owner@example.test' };
const OTHER_USER = { id: 'other-1', email: 'other@example.test' };

/** A run made from a template that has since gained a step. */
function runWhoseTemplateGainedAStep(): FakePocketBase {
  return createFakePocketBase(
    {
      blueprints: [{ id: 'tpl-1', title: 'Opening', owner: OWNER.id }],
      items: [
        { id: 'item-1', blueprint: 'tpl-1', content: 'Unlock the doors', path: '0001', position: 0 },
        { id: 'item-2', blueprint: 'tpl-1', content: 'Count the till', path: '0002', position: 1 },
      ],
      instances: [
        { id: 'run-1', blueprint: 'tpl-1', user: OWNER.id, name: 'Opening, Monday', progress: 0, completedAt: null },
      ],
      instanceItems: [
        {
          id: 'step-1',
          instance: 'run-1',
          sourceItem: 'item-1',
          content: 'Unlock the doors',
          path: '0001',
          position: 0,
          isCompleted: false,
        },
      ],
    },
    { authRecord: OWNER }
  );
}

/**
 * Runs the template sync if this build still has one. The stub removal
 * deletes it; probing keeps this test identical on both sides of the change,
 * so it records the 9019d17 failure and fails again if a stub comes back.
 */
async function syncRun(service: ChecklistService, runId: string): Promise<{ success: boolean }> {
  const sync: unknown = Reflect.get(service, 'syncWithTemplate');
  if (typeof sync !== 'function') return { success: false };
  return (await sync.call(service, runId)) as { success: boolean };
}

type RouteContext = { params: Promise<{ id: string }> };

// Next calls a route handler with (request, context).
const postSync: (request: NextRequest, context: RouteContext) => Promise<Response> = POST;

function syncRequest(): NextRequest {
  return new NextRequest('http://localhost/api/checklists/run-1/sync', { method: 'POST' });
}

/** Drops the per-request fields the contract lets differ between callers. */
function withoutRequestFields(body: unknown): unknown {
  const copy = structuredClone(body) as { error?: Record<string, unknown> };
  delete copy.error?.timestamp;
  delete copy.error?.correlationId;
  return copy;
}

beforeEach(() => {
  getServerAuth.mockReset();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('run template sync (test plan item 1)', () => {
  it('does not report success for a run whose template gained a step', async () => {
    const fake = runWhoseTemplateGainedAStep();

    const outcome = await syncRun(new ChecklistService(fake.pb), 'run-1');

    expect({
      outcome,
      runSteps: fake.records('instanceItems').map((step) => step.sourceItem),
      writes: fake.writes(),
    }).toEqual({
      outcome: expect.objectContaining({ success: false }),
      runSteps: ['item-1'],
      writes: [],
    });
  });
});

describe('POST /api/checklists/[id]/sync (test plan item 2)', () => {
  it('answers every signed-in caller with the same 410 RUN_SYNC_REMOVED body, before any session or run lookup', async () => {
    const fake = runWhoseTemplateGainedAStep();
    const info = vi.spyOn(console, 'info').mockImplementation(() => {});
    const bodies: unknown[] = [];

    for (const caller of [OWNER, OTHER_USER]) {
      getServerAuth.mockResolvedValue({ isAuthenticated: true, user: caller, token: 'test-token', pb: fake.pb });
      const response = await postSync(syncRequest(), { params: Promise.resolve({ id: 'run-1' }) });
      expect(response.status).toBe(410);
      bodies.push(withoutRequestFields(await response.json()));
    }

    expect(bodies[0]).toEqual({
      success: false,
      error: { code: 'RUN_SYNC_REMOVED', message: expect.any(String) },
    });
    expect(bodies[1]).toEqual(bodies[0]);
    expect(getServerAuth).not.toHaveBeenCalled();
    expect(fake.calls).toEqual([]);
    expect(info).toHaveBeenCalledTimes(2);
    expect(info).toHaveBeenLastCalledWith(expect.stringContaining('run_sync.removed'));
  });

  it('leaves anonymous callers to the proxy, which answers 401', async () => {
    const response = await proxy(syncRequest());

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({
      error: { code: 'AUTH_004', message: 'Authentication required', timestamp: expect.any(String) },
    });
  });
});

describe('stub removal inventory (test plan item 2)', () => {
  const thisFile = fileURLToPath(import.meta.url);
  const repoRoot = path.resolve(path.dirname(thisFile), '../../../../../..');

  // #81 gate 1 retires these setup scripts. Until then they still declare the
  // column, which stays in pb_schema.json until #48's migration drops it.
  const schemaDefinitions = new Set(['scripts/create-collections.ts', 'scripts/setup-pocketbase.ts']);

  const removed: Array<[string, RegExp]> = [
    ['isSynced read or write', /\bisSynced\b/],
    ['sync service method', /\bsyncWithTemplate\b/],
    ['sync server action', /\bbulkSyncChecklists\b/],
    ['sync result type', /\bSync(?:Conflict|Result)\b/],
    ['sync menu or bulk entry', /Sync with Template/],
    ['"Modified" run badge', />\s*Modified\s*</],
  ];

  it('leaves no sync entry, isSynced read or write, or "Modified" badge in app code', () => {
    const offenders: string[] = [];

    for (const dir of ['src', 'scripts']) {
      const files = readdirSync(path.join(repoRoot, dir), { recursive: true, encoding: 'utf8' });
      for (const file of files) {
        if (!/\.tsx?$/.test(file)) continue;
        const relative = path.posix.join(dir, file.split(path.sep).join('/'));
        const absolute = path.join(repoRoot, relative);
        if (absolute === thisFile || schemaDefinitions.has(relative)) continue;

        const source = readFileSync(absolute, 'utf8');
        for (const [label, pattern] of removed) {
          if (pattern.test(source)) offenders.push(`${relative}: ${label}`);
        }
      }
    }

    expect(offenders).toEqual([]);
  });
});
