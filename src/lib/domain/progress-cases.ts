/**
 * CHECKMATE-01.1 (#29): the cases 05.2's `computeRunProgress` must pass.
 * 05.2 slice 1 is the only implementation of these rules:
 *
 * 1. An executable step is an `included` run step whose kind is `checkable`,
 *    or `checkable-when-childless` and without child steps (05.1's completion
 *    classes). Sections and include containers never count.
 * 2. Done is `completed` or `excepted`.
 * 3. Progress is done over executable, rounded down. It is 0 when nothing is
 *    executable.
 * 4. Complete means executable > 0 and done equals executable.
 * 5. A failed read changes nothing.
 *
 * A run completes by itself only in the transaction where a step moves to
 * `completed` and done reaches executable. When excepting, excluding or an
 * upgrade brings done to executable, or the run has no executable steps, the
 * run offers `CompleteRun` instead.
 */
import type { StepInclusion, StepState } from './lifecycles';

/** 05.1's `completion` field of a step kind. */
export type Completion = 'checkable' | 'container' | 'checkable-when-childless' | 'none';

export interface ProgressStep {
  readonly id: string;
  readonly parent: string | null;
  readonly completion: Completion;
  readonly inclusion: StepInclusion;
  readonly state: StepState;
}

export interface Progress {
  readonly executable: number;
  readonly done: number;
  readonly percentage: number;
  readonly complete: boolean;
}

export interface ProgressCase {
  readonly id: string;
  readonly description: string;
  readonly steps: readonly ProgressStep[];
  readonly expected: Progress;
}

/**
 * What a step change does to an open run. `completes`: `CompleteRun` fires in
 * the same transaction. `offers-complete`: done equals executable, and the run
 * waits for someone to run `CompleteRun`. `stays-open`: work is left.
 */
export type RunOutcome = 'completes' | 'offers-complete' | 'stays-open';

export interface StepChange {
  readonly stepId: string;
  readonly state?: StepState;
  readonly inclusion?: StepInclusion;
}

export interface RunCompletionCase {
  readonly id: string;
  readonly description: string;
  readonly steps: readonly ProgressStep[];
  /** The change under test. Without one, the case is the run as it stands. */
  readonly change?: StepChange;
  /** Progress after the change, and what it does to the run. */
  readonly expected: { readonly progress: Progress; readonly run: RunOutcome };
}

interface StepOptions {
  readonly parent?: string;
  readonly inclusion?: StepInclusion;
}

function step(id: string, completion: Completion, state: StepState = 'pending', options: StepOptions = {}): ProgressStep {
  return { id, parent: options.parent ?? null, completion, inclusion: options.inclusion ?? 'included', state };
}

/** `count` checkable steps, the first `done` of them completed. */
function checkables(count: number, done: number): ProgressStep[] {
  return Array.from({ length: count }, (_, i) => step(`s${i + 1}`, 'checkable', i < done ? 'completed' : 'pending'));
}

export const PROGRESS_CASES: readonly ProgressCase[] = [
  {
    id: '199-of-200',
    description: '199 of 200 done is 99% and not complete. Baseline rounding called it 100%.',
    steps: checkables(200, 199),
    expected: { executable: 200, done: 199, percentage: 99, complete: false },
  },
  {
    id: 'all-done',
    description: 'Every executable step done is 100% and complete.',
    steps: checkables(3, 3),
    expected: { executable: 3, done: 3, percentage: 100, complete: true },
  },
  {
    id: 'no-steps',
    description: 'A run with no steps has nothing executable, so it is 0% and not complete.',
    steps: [],
    expected: { executable: 0, done: 0, percentage: 0, complete: false },
  },
  {
    id: 'zero-executable',
    description: 'A section holding only an instruction has nothing executable.',
    steps: [step('section', 'container'), step('note', 'none', 'pending', { parent: 'section' })],
    expected: { executable: 0, done: 0, percentage: 0, complete: false },
  },
  {
    id: 'sections-never-count',
    description: 'A section never counts, so it never blocks completion.',
    steps: [
      step('section', 'container'),
      step('a', 'checkable', 'completed', { parent: 'section' }),
      step('b', 'checkable', 'completed', { parent: 'section' }),
    ],
    expected: { executable: 2, done: 2, percentage: 100, complete: true },
  },
  {
    id: 'include-container',
    description: 'A module include container never counts; its steps do.',
    steps: [
      step('include', 'container'),
      step('a', 'checkable', 'completed', { parent: 'include' }),
      step('b', 'checkable', 'pending', { parent: 'include' }),
    ],
    expected: { executable: 2, done: 1, percentage: 50, complete: false },
  },
  {
    id: 'childless-reference',
    description: 'A legacy reference with no child steps counts as one executable step.',
    steps: [step('reference', 'checkable-when-childless'), step('a', 'checkable', 'completed')],
    expected: { executable: 2, done: 1, percentage: 50, complete: false },
  },
  {
    id: 'childless-reference-done',
    description: 'A completed childless legacy reference counts as done.',
    steps: [step('reference', 'checkable-when-childless', 'completed'), step('a', 'checkable', 'completed')],
    expected: { executable: 2, done: 2, percentage: 100, complete: true },
  },
  {
    id: 'reference-with-children',
    description: 'A legacy reference with child steps is a container; only its children count.',
    steps: [
      step('reference', 'checkable-when-childless'),
      step('a', 'checkable', 'completed', { parent: 'reference' }),
      step('b', 'checkable', 'pending', { parent: 'reference' }),
    ],
    expected: { executable: 2, done: 1, percentage: 50, complete: false },
  },
  {
    id: 'instruction',
    description: 'An instruction has nothing to check off and never counts.',
    steps: [step('note', 'none'), step('a', 'checkable', 'completed')],
    expected: { executable: 1, done: 1, percentage: 100, complete: true },
  },
  {
    id: 'excluded',
    description: 'An excluded step never counts.',
    steps: [step('a', 'checkable', 'completed'), step('b', 'checkable', 'completed'), step('c', 'checkable', 'pending', { inclusion: 'excluded' })],
    expected: { executable: 2, done: 2, percentage: 100, complete: true },
  },
  {
    id: 'retired',
    description: 'A retired step never counts, even when it was completed.',
    steps: [step('a', 'checkable', 'completed', { inclusion: 'retired' }), step('b', 'checkable', 'pending'), step('c', 'checkable', 'completed')],
    expected: { executable: 2, done: 1, percentage: 50, complete: false },
  },
  {
    id: 'excepted',
    description: 'An excepted step counts as done.',
    steps: [step('a', 'checkable', 'completed'), step('b', 'checkable', 'excepted'), step('c', 'checkable', 'pending')],
    expected: { executable: 3, done: 2, percentage: 66, complete: false },
  },
  {
    id: 'excepted-all-done',
    description: 'Completed and excepted steps together make the run complete.',
    steps: [step('a', 'checkable', 'completed'), step('b', 'checkable', 'excepted')],
    expected: { executable: 2, done: 2, percentage: 100, complete: true },
  },
  {
    id: 'awaiting-approval',
    description: 'A step awaiting approval is not done.',
    steps: [step('a', 'checkable', 'completed'), step('b', 'checkable', 'completed'), step('gate', 'checkable', 'awaiting_approval')],
    expected: { executable: 3, done: 2, percentage: 66, complete: false },
  },
  {
    id: 'invalidated',
    description: 'An invalidated step is not done.',
    steps: [step('a', 'checkable', 'completed'), step('b', 'checkable', 'invalidated')],
    expected: { executable: 2, done: 1, percentage: 50, complete: false },
  },
];

export const RUN_COMPLETION_CASES: readonly RunCompletionCase[] = [
  {
    id: 'last-completed-completes-run',
    description: 'Completing the last open step completes the run in the same transaction.',
    steps: [step('a', 'checkable', 'completed'), step('b', 'checkable')],
    change: { stepId: 'b', state: 'completed' },
    expected: { progress: { executable: 2, done: 2, percentage: 100, complete: true }, run: 'completes' },
  },
  {
    id: 'approval-completes-run',
    description: 'An approval that completes the last open step completes the run.',
    steps: [step('a', 'checkable', 'completed'), step('gate', 'checkable', 'awaiting_approval')],
    change: { stepId: 'gate', state: 'completed' },
    expected: { progress: { executable: 2, done: 2, percentage: 100, complete: true }, run: 'completes' },
  },
  {
    id: 'last-excepted-offers-complete',
    description: 'Excepting the last open step never completes the run. The run offers CompleteRun.',
    steps: [step('a', 'checkable', 'completed'), step('b', 'checkable')],
    change: { stepId: 'b', state: 'excepted' },
    expected: { progress: { executable: 2, done: 2, percentage: 100, complete: true }, run: 'offers-complete' },
  },
  {
    id: 'last-excluded-offers-complete',
    description: 'Excluding the last open step never completes the run. The run offers CompleteRun.',
    steps: [step('a', 'checkable', 'completed'), step('b', 'checkable')],
    change: { stepId: 'b', inclusion: 'excluded' },
    expected: { progress: { executable: 1, done: 1, percentage: 100, complete: true }, run: 'offers-complete' },
  },
  {
    id: 'zero-executable-offers-complete',
    description: 'A run with no executable steps offers CompleteRun.',
    steps: [step('section', 'container')],
    expected: { progress: { executable: 0, done: 0, percentage: 0, complete: false }, run: 'offers-complete' },
  },
  {
    id: 'completed-with-work-left',
    description: 'Completing a step while others are open leaves the run open.',
    steps: [step('a', 'checkable'), step('b', 'checkable')],
    change: { stepId: 'a', state: 'completed' },
    expected: { progress: { executable: 2, done: 1, percentage: 50, complete: false }, run: 'stays-open' },
  },
];
