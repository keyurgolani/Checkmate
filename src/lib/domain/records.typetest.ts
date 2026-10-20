/**
 * CHECKMATE-01.1 · adapter (#29), test plan item 7: a wrong property read on
 * each record type fails to compile. `npx tsc --noEmit -p src/lib/domain/tsconfig.json`
 * checks this file in CI's unit job. Each `@ts-expect-error` line must still
 * find its error, or tsc reports the directive unused, which is how this test
 * fails against the RecordModel-based types in pocketbase-types.ts. Nothing
 * imports or runs it.
 */
import type { RecordModel } from 'pocketbase';
import type {
  ActivityEntryRecord,
  NotificationRecord,
  RECORD_SHAPES,
  RecordKind,
  Records,
  RunRecord,
  RunStepRecord,
  StoredRow,
  TemplateRecord,
  TemplateStepRecord,
  UnknownValue,
} from './records';
import type { ActivityAction, ActivityResourceType, NotificationType, StepItemType, TemplateVisibility } from './storage';

type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false;
type Expect<T extends true> = T;

/** Keys that may be absent. */
type OptionalKeys<T> = { [K in keyof T]-?: Record<never, never> extends Pick<T, K> ? K : never }[keyof T];
type HasIndexSignature<T> = string extends keyof T ? true : false;
type ShapeFields<K extends RecordKind> = (typeof RECORD_SHAPES)[K]['fields'][number];
type ShapeOptional<K extends RecordKind> = keyof (typeof RECORD_SHAPES)[K]['optional'];

declare function read(value: unknown): void;
declare function accept<T>(value: T): void;

declare const template: TemplateRecord;
declare const templateStep: TemplateStepRecord;
declare const run: RunRecord;
declare const runStep: RunStepRecord;
declare const notification: NotificationRecord;
declare const activityEntry: ActivityEntryRecord;
declare const model: RecordModel;
declare const storedRunStep: StoredRow<'runStep'>;

read(template.title);
// @ts-expect-error A misspelled field fails: no index signature.
read(template.titel);
// @ts-expect-error A record carries no response metadata.
read(template.collectionName);
// @ts-expect-error Expanded relations are not carried.
read(template.expand);

read(templateStep.template);
// @ts-expect-error `blueprint` is the storage name of `template`.
read(templateStep.blueprint);
// @ts-expect-error A misspelled field fails.
read(templateStep.contents);

read(run.template);
// @ts-expect-error `blueprint` is the storage name of `template`.
read(run.blueprint);
// @ts-expect-error A record carries no response metadata.
read(run.collectionId);

read(runStep.run);
read(runStep.sourceStep);
// @ts-expect-error `instance` is the storage name of `run`.
read(runStep.instance);
// @ts-expect-error `sourceItem` is the storage name of `sourceStep`.
read(runStep.sourceItem);

read(notification.isRead);
// @ts-expect-error A misspelled field fails.
read(notification.read);

read(activityEntry.resourceId);
// @ts-expect-error A misspelled field fails.
read(activityEntry.resource);

// @ts-expect-error A raw SDK record is not a record until fromStorage maps it.
accept<TemplateRecord>(model);
// @ts-expect-error A raw SDK record is not a record until fromStorage maps it.
accept<RunStepRecord>(model);
// @ts-expect-error Records are read-only.
template.title = 'Renamed';

read(storedRunStep.instance);
// @ts-expect-error A stored row uses storage names, so it has no `run`.
read(storedRunStep.run);

export type Checks = [
  // No record has an index signature.
  Expect<Equal<HasIndexSignature<TemplateRecord>, false>>,
  Expect<Equal<HasIndexSignature<TemplateStepRecord>, false>>,
  Expect<Equal<HasIndexSignature<RunRecord>, false>>,
  Expect<Equal<HasIndexSignature<RunStepRecord>, false>>,
  Expect<Equal<HasIndexSignature<NotificationRecord>, false>>,
  Expect<Equal<HasIndexSignature<ActivityEntryRecord>, false>>,

  // Each shape lists every field of its record, and marks exactly its optional ones.
  Expect<Equal<ShapeFields<'template'>, keyof TemplateRecord>>,
  Expect<Equal<ShapeFields<'templateStep'>, keyof TemplateStepRecord>>,
  Expect<Equal<ShapeFields<'run'>, keyof RunRecord>>,
  Expect<Equal<ShapeFields<'runStep'>, keyof RunStepRecord>>,
  Expect<Equal<ShapeFields<'notification'>, keyof NotificationRecord>>,
  Expect<Equal<ShapeFields<'activityEntry'>, keyof ActivityEntryRecord>>,
  Expect<Equal<ShapeOptional<'template'>, OptionalKeys<TemplateRecord>>>,
  Expect<Equal<ShapeOptional<'templateStep'>, OptionalKeys<TemplateStepRecord>>>,
  Expect<Equal<ShapeOptional<'run'>, OptionalKeys<RunRecord>>>,
  Expect<Equal<ShapeOptional<'runStep'>, OptionalKeys<RunStepRecord>>>,
  Expect<Equal<ShapeOptional<'notification'>, OptionalKeys<NotificationRecord>>>,
  Expect<Equal<ShapeOptional<'activityEntry'>, OptionalKeys<ActivityEntryRecord>>>,

  // Select fields read as canonical values, or `unknown`.
  Expect<Equal<TemplateRecord['visibility'], TemplateVisibility | UnknownValue>>,
  Expect<Equal<TemplateStepRecord['itemType'], StepItemType | UnknownValue>>,
  Expect<Equal<RunStepRecord['itemType'], StepItemType | UnknownValue | null | undefined>>,
  Expect<Equal<NotificationRecord['type'], NotificationType | UnknownValue>>,
  Expect<Equal<ActivityEntryRecord['resourceType'], ActivityResourceType | UnknownValue>>,
  Expect<Equal<ActivityEntryRecord['action'], ActivityAction | UnknownValue>>,

  // Stored rows put renamed fields back under their storage names and hold raw select strings.
  Expect<Equal<keyof StoredRow<'runStep'>, Exclude<keyof RunStepRecord, 'run' | 'sourceStep'> | 'instance' | 'sourceItem'>>,
  Expect<Equal<keyof StoredRow<'run'>, Exclude<keyof RunRecord, 'template'> | 'blueprint'>>,
  Expect<Equal<keyof StoredRow<'templateStep'>, Exclude<keyof TemplateStepRecord, 'template'> | 'blueprint'>>,
  Expect<Equal<keyof StoredRow<'template'>, keyof TemplateRecord>>,
  Expect<Equal<StoredRow<'runStep'>['sourceItem'], string | null>>,
  Expect<Equal<StoredRow<'runStep'>['itemType'], string | null | undefined>>,
  Expect<Equal<StoredRow<'notification'>['type'], string>>,
  Expect<Equal<OptionalKeys<StoredRow<'run'>>, OptionalKeys<RunRecord>>>,

  // The kind map covers the six record types #29 names.
  Expect<Equal<RecordKind, 'template' | 'templateStep' | 'run' | 'runStep' | 'notification' | 'activityEntry'>>,
  Expect<Equal<Records['run'], RunRecord>>,
];
