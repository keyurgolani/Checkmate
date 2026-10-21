// @vitest-environment jsdom

/**
 * CHECKMATE-09.1 · slice 0 (#53): on the run page, a failed step toggle shows
 * an inline error with Retry and announces nothing. At 9019d17 the page only
 * logged the toggle route's 404, and the tracker announced "marked as
 * complete" anyway.
 */

import { createElement } from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
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

function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}

function respond(status: number, body: unknown) {
  return vi.fn(async () => jsonResponse(status, body));
}

const TOGGLE_URL = '/api/checklists/run-1/items/step-1/toggle';
const RUN_READ_URL = '/api/checklists/run-1?includeItems=true';
const SERVER_ERROR = { success: false, error: { code: 'CHECKLIST_999', message: 'An unexpected error occurred' } };
const CONFIRMED_TOGGLE = {
  success: true,
  task: { ...STEP, isCompleted: true, completedAt: CREATED },
  progress: { totalItems: 1, completedItems: 1, percentage: 100 },
};

/** The run as `GET /api/checklists/[id]?includeItems=true` returns it. */
function savedRun(isCompleted: boolean) {
  return {
    success: true,
    checklist: { id: 'run-1', name: RUN.name },
    checklistItems: [{ ...STEP, isCompleted, completedAt: isCompleted ? CREATED : null }],
  };
}

function renderRunPage() {
  return render(createElement(ChecklistDetailClient, { checklist: RUN, tasks: [STEP] }));
}

const announcements = () => screen.getAllByRole('status').map((region) => region.textContent).join('');
const checkbox = () => screen.getByRole('checkbox', { name: 'Unlock the doors' });

/** Lets pending promises, renders and effects finish, so "nothing announced" can't pass early. */
const settle = () => act(() => new Promise<void>((resolve) => setTimeout(resolve, 0)));

let consoleError: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(async () => {
  // A confirmed toggle starts import('@/lib/confetti') without awaiting it. If
  // it is still loading when the next test starts its own, vitest hands the
  // second import the real module, and canvas-confetti throws in jsdom.
  await vi.dynamicImportSettled();
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('run page step toggle', () => {
  it('shows Retry, announces nothing, and logs only the status and step when the toggle route fails', async () => {
    const fetchMock = respond(404, { success: false, error: { code: 'CHECKLIST_001', message: 'Checklist not found' } });
    vi.stubGlobal('fetch', fetchMock);
    renderRunPage();

    fireEvent.click(checkbox());

    expect(await screen.findByRole('button', { name: /^Retry/ })).toBeTruthy();
    await settle();
    expect(announcements()).toBe('');
    expect(checkbox().getAttribute('aria-checked')).toBe('false');
    expect(fetchMock).toHaveBeenCalledWith(TOGGLE_URL, expect.objectContaining({ method: 'PUT' }));
    expect(consoleError.mock.calls).toEqual([['Step toggle failed', { stepId: 'step-1', status: 404 }]]);
  });

  it('reads the saved step on Retry and does not flip a step the failed toggle already saved', async () => {
    // The toggle saved the step, then failed on the run's progress.
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(500, SERVER_ERROR))
      .mockResolvedValueOnce(jsonResponse(200, savedRun(true)));
    vi.stubGlobal('fetch', fetchMock);
    renderRunPage();

    fireEvent.click(checkbox());
    fireEvent.click(await screen.findByRole('button', { name: /^Retry/ }));

    await waitFor(() => expect(announcements()).toBe('Unlock the doors marked as complete'));
    expect(checkbox().getAttribute('aria-checked')).toBe('true');
    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([TOGGLE_URL, RUN_READ_URL]);
  });

  it('sends the toggle again on Retry when the saved step still needs it', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(500, SERVER_ERROR))
      .mockResolvedValueOnce(jsonResponse(200, savedRun(false)))
      .mockResolvedValueOnce(jsonResponse(200, CONFIRMED_TOGGLE));
    vi.stubGlobal('fetch', fetchMock);
    renderRunPage();

    fireEvent.click(checkbox());
    fireEvent.click(await screen.findByRole('button', { name: /^Retry/ }));

    await waitFor(() => expect(announcements()).toBe('Unlock the doors marked as complete'));
    expect(checkbox().getAttribute('aria-checked')).toBe('true');
    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([TOGGLE_URL, RUN_READ_URL, TOGGLE_URL]);
  });

  it('marks the step and announces it once the route confirms', async () => {
    vi.stubGlobal('fetch', respond(200, CONFIRMED_TOGGLE));
    renderRunPage();

    fireEvent.click(checkbox());

    await waitFor(() => expect(announcements()).toBe('Unlock the doors marked as complete'));
    expect(checkbox().getAttribute('aria-checked')).toBe('true');
    expect(screen.queryByRole('button', { name: /^Retry/ })).toBeNull();
    expect(consoleError).not.toHaveBeenCalled();
  });
});
