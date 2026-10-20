/**
 * CHECKMATE-09.1 · slice 0 (#53), test plan item 1: the run print page works
 * for the run owner. At 9019d17 it read `.data.checklist` off `getById`'s
 * `Result<Instance>` and called `notFound()`.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { OTHER_USER, OWNER, ownerRunFixture, sessionFor } from '@/test/run-fixture';

const { getServerAuth } = vi.hoisted(() => ({ getServerAuth: vi.fn() }));
vi.mock('@/lib/server-auth', () => ({ getServerAuth }));

import ChecklistPrintPage from './page';

const props = () => ({ params: Promise.resolve({ id: 'run-1' }) });

beforeEach(() => {
  getServerAuth.mockReset();
});

describe('/checklists/[id]/print', () => {
  it("renders the owner's run with its template title and steps", async () => {
    const fake = ownerRunFixture();
    getServerAuth.mockResolvedValue(sessionFor(OWNER, fake));

    const page = await ChecklistPrintPage(props());

    expect(page.props.checklist).toMatchObject({
      id: 'run-1',
      name: 'Opening, Monday',
      blueprintTitle: 'Opening',
      completedItems: 0,
      totalItems: 2,
    });
    expect(page.props.tasks.map((task: { content: string }) => task.content)).toEqual([
      'Unlock the doors',
      'Count the till',
    ]);
  });

  it('is not found for another user', async () => {
    const fake = ownerRunFixture(OTHER_USER);
    getServerAuth.mockResolvedValue(sessionFor(OTHER_USER, fake));

    await expect(ChecklistPrintPage(props())).rejects.toMatchObject({ digest: 'NEXT_HTTP_ERROR_FALLBACK;404' });
  });
});
