/**
 * CHECKMATE-01.1 · contracts (#29), test plan item 4: the progress cases
 * follow #29's rules. The oracle below restates the rules for this test
 * only; 05.2's `computeRunProgress` is the one product implementation and
 * must pass the same cases.
 */
import { describe, expect, it } from 'vitest';
import { DONE_STATES, STEP_INCLUSIONS, STEP_STATES } from './lifecycles';
import {
  PROGRESS_CASES,
  RUN_COMPLETION_CASES,
  type Progress,
  type ProgressStep,
  type RunCompletionCase,
  type RunOutcome,
} from './progress-cases';

function progressOf(steps: readonly ProgressStep[]): Progress {
  // Excluded and retired steps aren't in the run, so they never make their parent a container.
  const parents = new Set(steps.filter((step) => step.inclusion === 'included').map((step) => step.parent));
  const executable = steps.filter(
    (step) =>
      step.inclusion === 'included' &&
      (step.completion === 'checkable' || (step.completion === 'checkable-when-childless' && !parents.has(step.id))),
  );
  const done = executable.filter((step) => DONE_STATES.includes(step.state)).length;
  return {
    executable: executable.length,
    done,
    percentage: executable.length === 0 ? 0 : Math.floor((done * 100) / executable.length),
    complete: executable.length > 0 && done === executable.length,
  };
}

function outcomeOf(testCase: RunCompletionCase): { progress: Progress; run: RunOutcome } {
  const { change } = testCase;
  const before = testCase.steps.find((step) => step.id === change?.stepId);
  const steps = testCase.steps.map((step) =>
    change !== undefined && step.id === change.stepId
      ? { ...step, state: change.state ?? step.state, inclusion: change.inclusion ?? step.inclusion }
      : step,
  );
  const progress = progressOf(steps);
  // Only a step that actually moves to completed can complete the run; a re-sent completed is unchanged.
  const movedToCompleted = change?.state === 'completed' && before?.state !== 'completed';
  if (movedToCompleted && progress.complete) return { progress, run: 'completes' };
  return { progress, run: progress.done === progress.executable ? 'offers-complete' : 'stays-open' };
}

const ALL_CASES: readonly { id: string; steps: readonly ProgressStep[] }[] = [...PROGRESS_CASES, ...RUN_COMPLETION_CASES];

describe('progress cases', () => {
  it('covers every case #29 names', () => {
    const ids = PROGRESS_CASES.map((testCase) => testCase.id);
    for (const id of [
      '199-of-200',
      'zero-executable',
      'childless-reference',
      'reference-with-excluded-children',
      'reference-with-retired-children',
      'excluded',
      'excepted',
      'awaiting-approval',
      'invalidated',
    ]) {
      expect(ids).toContain(id);
    }
    const runIds = RUN_COMPLETION_CASES.map((testCase) => testCase.id);
    for (const id of ['last-completed-completes-run', 'last-excepted-offers-complete', 'resent-completed-is-unchanged']) {
      expect(runIds).toContain(id);
    }
  });

  it('uses unique case ids, unique step ids, and parents that exist', () => {
    const ids = ALL_CASES.map((testCase) => testCase.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const testCase of ALL_CASES) {
      const stepIds = testCase.steps.map((step) => step.id);
      expect(new Set(stepIds).size, testCase.id).toBe(stepIds.length);
      for (const step of testCase.steps) {
        if (step.parent !== null) expect(stepIds, `${testCase.id}: parent of ${step.id}`).toContain(step.parent);
      }
    }
  });

  it('uses only lifecycle states and inclusion values', () => {
    for (const testCase of ALL_CASES) {
      for (const step of testCase.steps) {
        expect(STEP_STATES).toContain(step.state);
        expect(STEP_INCLUSIONS).toContain(step.inclusion);
      }
    }
  });

  it.each(PROGRESS_CASES.map((testCase) => [testCase.id, testCase] as const))('%s follows the rules', (_id, testCase) => {
    expect(progressOf(testCase.steps)).toEqual(testCase.expected);
  });

  it('reports 100% exactly when complete', () => {
    for (const testCase of PROGRESS_CASES) {
      expect(testCase.expected.percentage === 100, testCase.id).toBe(testCase.expected.complete);
    }
    for (const testCase of RUN_COMPLETION_CASES) {
      expect(testCase.expected.progress.percentage === 100, testCase.id).toBe(testCase.expected.progress.complete);
    }
  });

  it('rounds 199 of 200 down, where baseline rounding reported 100%', () => {
    const testCase = PROGRESS_CASES.find((candidate) => candidate.id === '199-of-200');
    expect(testCase?.expected).toEqual({ executable: 200, done: 199, percentage: 99, complete: false });
    // checklist.ts at 9019d17 used Math.round, which turns 99.5 into 100.
    expect(Math.round((199 / 200) * 100)).toBe(100);
  });
});

describe('run completion cases', () => {
  it.each(RUN_COMPLETION_CASES.map((testCase) => [testCase.id, testCase] as const))('%s follows the rules', (_id, testCase) => {
    expect(outcomeOf(testCase)).toEqual(testCase.expected);
  });

  it('completes the run on a last completed step, and only offers CompleteRun on a last excepted one', () => {
    const run = (id: string) => RUN_COMPLETION_CASES.find((testCase) => testCase.id === id)?.expected.run;
    expect(run('last-completed-completes-run')).toBe('completes');
    expect(run('last-excepted-offers-complete')).toBe('offers-complete');
    expect(run('last-excluded-offers-complete')).toBe('offers-complete');
    expect(run('zero-executable-offers-complete')).toBe('offers-complete');
  });

  it('never completes a run unless the change moves a step to completed', () => {
    for (const testCase of RUN_COMPLETION_CASES) {
      if (testCase.expected.run !== 'completes') continue;
      expect(testCase.change?.state, testCase.id).toBe('completed');
      expect(testCase.steps.find((step) => step.id === testCase.change?.stepId)?.state, testCase.id).not.toBe('completed');
    }
    expect(RUN_COMPLETION_CASES.find((testCase) => testCase.id === 'resent-completed-is-unchanged')?.expected.run).toBe('offers-complete');
  });
});
