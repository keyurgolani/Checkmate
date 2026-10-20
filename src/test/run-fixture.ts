/**
 * A run and its steps on the structural PocketBase fake, for node tests of
 * the run routes and pages. Mock `@/lib/server-auth` in the test file and
 * resolve `getServerAuth` with `sessionFor(caller, fake)`.
 */

import { createFakePocketBase, type FakePocketBase, type FakeRecord } from './fake-pocketbase';

export const OWNER = { id: 'owner-1', email: 'owner@example.test' };
export const OTHER_USER = { id: 'other-1', email: 'other@example.test' };

const CREATED = '2026-01-01T00:00:00.000Z';

function step(id: string, content: string, position: number): FakeRecord {
  return {
    id,
    instance: 'run-1',
    sourceItem: `item-${position + 1}`,
    parent: null,
    path: String(position + 1).padStart(4, '0'),
    content,
    description: null,
    resources: null,
    isCompleted: false,
    completedAt: null,
    isCustom: false,
    position,
    itemType: 'task',
    created: CREATED,
    updated: CREATED,
  };
}

/** The owner's run of a two-step template, nothing done yet, seen through `caller`'s client. */
export function ownerRunFixture(caller: FakeRecord = OWNER): FakePocketBase {
  return createFakePocketBase(
    {
      blueprints: [{ id: 'tpl-1', title: 'Opening', owner: OWNER.id }],
      instances: [
        {
          id: 'run-1',
          blueprint: 'tpl-1',
          user: OWNER.id,
          name: 'Opening, Monday',
          progress: 0,
          completedAt: null,
          description: null,
          resources: null,
          created: CREATED,
          updated: CREATED,
        },
      ],
      instanceItems: [step('step-1', 'Unlock the doors', 0), step('step-2', 'Count the till', 1)],
    },
    { authRecord: caller }
  );
}

/** What the mocked `getServerAuth` resolves for a signed-in caller. */
export function sessionFor(caller: FakeRecord, fake: FakePocketBase) {
  return { isAuthenticated: true, user: caller, token: 'test-token', pb: fake.pb };
}
