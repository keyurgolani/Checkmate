// @vitest-environment jsdom

/**
 * CHECKMATE-09.1 · slice 0 (#53): on the run page, a failed step toggle shows
 * an inline error with Retry and announces nothing. At 9019d17 the page only
 * logged the toggle route's 404, and the tracker announced "marked as
 * complete" anyway.
 */

import { createElement } from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ChecklistTask } from '@/components/checklists/checklist-tracker';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));
vi.mock('@/lib/hooks/use-realtime', () => ({ useChecklistRealtime: vi.fn() }));
vi.mock('@/lib/confetti', () => ({ triggerConfetti: vi.fn() }));
vi.mock('./actions', () => ({ bulkToggleChecklistTasks: vi.fn(), bulkDeleteChecklistTasks: vi.fn() }));

import { ChecklistDetailClient } from './checklist-detail-client';

const CREATED = '2026-01-01T00:00:00.000Z';

const STEP: ChecklistTask = {
  id: 'step-1',
  checklistId: 'run-1',
  sourceItemId: 'item-1',
  parentId: null,
  path: '0001',
  content: 'Unlock the doors',
  description: null,
  resources: null,
  isCompleted: false,
  completedAt: null,
  isCustom: false,
  position: 0,
  itemType: 'task',
};

const RUN = {
  id: 'run-1',
  name: 'Opening, Monday',
  blueprintId: 'tpl-1',
  blueprintTitle: 'Opening',
  description: null,
  resources: null,
  progress: 0,
  totalItems: 1,
  completedItems: 0,
  completedAt: null,
  createdAt: CREATED,
  updatedAt: CREATED,
};

function respond(status: number, body: unknown) {
  return vi.fn(async () =>
    new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })
  );
}

function renderRunPage() {
  return render(createElement(ChecklistDetailClient, { checklist: RUN, tasks: [STEP] }));
}

const announcements = () => screen.getAllByRole('status').map((region) => region.textContent).join('');
const checkbox = () => screen.getByRole('checkbox', { name: 'Unlock the doors' });

/** Lets pending promises, renders and effects finish, so "nothing announced" can't pass early. */
const settle = () => act(() => new Promise<void>((resolve) => setTimeout(resolve, 0)));

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('run page step toggle', () => {
  it('shows Retry and announces nothing when the toggle route fails', async () => {
    const fetchMock = respond(404, { success: false, error: { code: 'CHECKLIST_001', message: 'Checklist not found' } });
    vi.stubGlobal('fetch', fetchMock);
    renderRunPage();

    fireEvent.click(checkbox());

    expect(await screen.findByRole('button', { name: /^Retry/ })).toBeTruthy();
    await settle();
    expect(announcements()).toBe('');
    expect(checkbox().getAttribute('aria-checked')).toBe('false');
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/checklists/run-1/items/step-1/toggle',
      expect.objectContaining({ method: 'PUT' })
    );
  });

  it('marks the step and announces it once the route confirms', async () => {
    vi.stubGlobal(
      'fetch',
      respond(200, {
        success: true,
        task: { ...STEP, checklistId: 'run-1', isCompleted: true, completedAt: CREATED },
        progress: { totalItems: 1, completedItems: 1, percentage: 100 },
      })
    );
    renderRunPage();

    fireEvent.click(checkbox());

    await waitFor(() => expect(announcements()).toBe('Unlock the doors marked as complete'));
    expect(checkbox().getAttribute('aria-checked')).toBe('true');
    expect(screen.queryByRole('button', { name: /^Retry/ })).toBeNull();
  });
});
