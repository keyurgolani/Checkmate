// @vitest-environment jsdom

/**
 * CHECKMATE-09.1 · slice 0 (#53), test plan item 2: a failed step toggle
 * shows an inline error with Retry and announces nothing. Only a change the
 * server confirmed is announced. At 9019d17 the tracker announced "marked as
 * complete" whenever the toggle promise settled without throwing, and showed
 * nothing when it threw.
 */

import { createElement } from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { ChecklistTracker, type ChecklistTask } from './checklist-tracker';

function step(id: string, content: string, position: number): ChecklistTask {
  return {
    id,
    checklistId: 'run-1',
    sourceItemId: null,
    parentId: null,
    path: String(position + 1).padStart(4, '0'),
    content,
    description: null,
    resources: null,
    isCompleted: false,
    completedAt: null,
    isCustom: false,
    position,
    itemType: 'task',
  };
}

const STEPS = [step('step-1', 'Unlock the doors', 0), step('step-2', 'Count the till', 1)];

type OnToggleTask = (taskId: string) => Promise<{ isCompleted: boolean } | null>;

function renderTracker(onToggleTask: OnToggleTask, extra: Record<string, unknown> = {}) {
  return render(createElement(ChecklistTracker, { tasks: STEPS, onToggleTask, ...extra }));
}

const liveRegion = () => screen.getByRole('status');
const checkbox = (name: string) => screen.getByRole('checkbox', { name });
const retryButton = () => screen.findByRole('button', { name: /^Retry/ });

/** Lets pending promises, renders and effects finish, so "nothing announced" can't pass early. */
const settle = () => act(() => new Promise<void>((resolve) => setTimeout(resolve, 0)));

beforeAll(() => {
  // Radix positions the context menu with ResizeObserver, which jsdom lacks.
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
});

afterEach(() => {
  cleanup();
});

describe('ChecklistTracker step toggle', () => {
  it('shows an inline error with Retry and announces nothing when the toggle fails', async () => {
    renderTracker(vi.fn<OnToggleTask>().mockRejectedValue(new Error('Toggle failed with status 500')));

    fireEvent.click(checkbox('Unlock the doors'));

    expect(await retryButton()).toBeTruthy();
    await settle();
    expect(screen.getByText("Couldn't mark this step complete.")).toBeTruthy();
    expect(liveRegion().textContent).toBe('');
    expect(checkbox('Unlock the doors').getAttribute('aria-checked')).toBe('false');
    const describedBy = checkbox('Unlock the doors').getAttribute('aria-describedby') ?? '';
    expect(document.getElementById(describedBy)?.textContent).toBe("Couldn't mark this step complete.");
  });

  it('announces the state the server confirmed', async () => {
    renderTracker(vi.fn<OnToggleTask>().mockResolvedValue({ isCompleted: true }));

    fireEvent.click(checkbox('Unlock the doors'));

    await waitFor(() => expect(liveRegion().textContent).toBe('Unlock the doors marked as complete'));
    expect(screen.queryByRole('button', { name: /^Retry/ })).toBeNull();
  });

  it('announces nothing when no toggle was sent', async () => {
    const onToggleTask = vi.fn<OnToggleTask>().mockResolvedValue(null);
    renderTracker(onToggleTask);

    fireEvent.click(checkbox('Unlock the doors'));
    await settle();

    expect(onToggleTask).toHaveBeenCalledWith('step-1');
    expect(liveRegion().textContent).toBe('');
    expect(screen.queryByRole('button', { name: /^Retry/ })).toBeNull();
  });

  it('retries the same step and clears the error once the server confirms', async () => {
    const onToggleTask = vi
      .fn<OnToggleTask>()
      .mockRejectedValueOnce(new Error('Toggle failed with status 503'))
      .mockResolvedValueOnce({ isCompleted: true });
    renderTracker(onToggleTask);

    fireEvent.click(checkbox('Unlock the doors'));
    fireEvent.click(await retryButton());

    await waitFor(() => expect(liveRegion().textContent).toBe('Unlock the doors marked as complete'));
    expect(screen.queryByRole('button', { name: /^Retry/ })).toBeNull();
    expect(onToggleTask.mock.calls).toEqual([['step-1'], ['step-1']]);
  });

  it('gives focus back to the step when a retry is confirmed', async () => {
    const onToggleTask = vi
      .fn<OnToggleTask>()
      .mockRejectedValueOnce(new Error('Toggle failed with status 503'))
      .mockResolvedValueOnce({ isCompleted: true });
    renderTracker(onToggleTask);

    fireEvent.click(checkbox('Unlock the doors'));
    const retry = await retryButton();
    retry.focus();
    fireEvent.click(retry);

    await waitFor(() => expect(screen.queryByRole('button', { name: /^Retry/ })).toBeNull());
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Unlock the doors' }));
  });

  it('drops the error once the step reaches that state another way', async () => {
    const onToggleTask = vi.fn<OnToggleTask>().mockRejectedValue(new Error('Toggle failed with status 500'));
    const { rerender } = renderTracker(onToggleTask);

    fireEvent.click(checkbox('Unlock the doors'));
    await retryButton();

    // A realtime update or the bulk bar completes the step.
    const completed = [{ ...STEPS[0]!, isCompleted: true }, STEPS[1]!];
    rerender(createElement(ChecklistTracker, { tasks: completed, onToggleTask }));

    expect(screen.queryByRole('button', { name: /^Retry/ })).toBeNull();
    expect(screen.queryByText("Couldn't mark this step complete.")).toBeNull();
  });

  it('keeps Retry from sending while steps are being selected', async () => {
    const onToggleTask = vi.fn<OnToggleTask>().mockRejectedValue(new Error('Toggle failed with status 500'));
    const { rerender } = renderTracker(onToggleTask);

    fireEvent.click(checkbox('Unlock the doors'));
    await retryButton();
    rerender(createElement(ChecklistTracker, { tasks: STEPS, onToggleTask, isSelectionMode: true }));
    const retry = await retryButton();
    fireEvent.click(retry);
    await settle();

    expect(retry.getAttribute('aria-disabled')).toBe('true');
    expect(onToggleTask).toHaveBeenCalledTimes(1);
  });

  it('gives a toggle from the context menu the same inline error', async () => {
    const onToggleTask = vi.fn<OnToggleTask>().mockRejectedValue(new Error('Toggle failed with status 500'));
    renderTracker(onToggleTask, { contextMenuItems: [] });

    fireEvent.contextMenu(screen.getByText('Count the till'));
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Mark Complete' }));

    expect(await retryButton()).toBeTruthy();
    await settle();
    expect(onToggleTask).toHaveBeenCalledWith('step-2');
    expect(liveRegion().textContent).toBe('');
  });
});
