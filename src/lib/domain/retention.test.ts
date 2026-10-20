/**
 * CHECKMATE-01.1 · contracts (#29), test plan item 5: a retention class for
 * every pb_schema.json collection (three of them `tombstone`), a row for every
 * baseline and planned relation, and the purge cases. The schema checks read
 * docker/pocketbase/pb_schema.json, so a leaf that adds a collection or a
 * relation fails here until it adds its row.
 */
import fs from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';
import { leafIssue } from './contract';
import {
  CLASS_RULES,
  COLLECTIONS,
  PURGES,
  RELATIONS,
  RETENTION_CLASSES,
  classOf,
  mayDeleteRevision,
  type PurgeKind,
  type RelationRetention,
} from './retention';

interface SchemaRelation {
  readonly relation: string;
  readonly references: string;
  readonly required: boolean;
  readonly cascade: boolean;
}

interface RawField {
  name?: unknown;
  type?: unknown;
  required?: unknown;
  collectionId?: unknown;
  cascadeDelete?: unknown;
  options?: { collectionId?: unknown; cascadeDelete?: unknown };
}

interface RawCollection {
  id?: unknown;
  name?: unknown;
  fields?: RawField[];
  schema?: RawField[];
}

/**
 * Reads collection names and relation fields from pb_schema.json. Accepts the
 * 9019d17 shape (`schema`, relation options, collection names as ids) and
 * PocketBase's own export (`fields`, collection ids). 18.2 regenerates the
 * file; if its shape changes again, teach this reader the new one.
 */
function readSchema(): { collections: string[]; relations: SchemaRelation[] } {
  const file = path.resolve(__dirname, '../../../docker/pocketbase/pb_schema.json');
  const raw: unknown = JSON.parse(fs.readFileSync(file, 'utf8'));
  const list = Array.isArray(raw) ? raw : (raw as { collections?: unknown }).collections;
  if (!Array.isArray(list)) throw new Error('pb_schema.json: expected an array of collections; update readSchema for the new shape');
  const collections = list as RawCollection[];

  const names = new Map<string, string>([['_pb_users_auth_', 'users']]);
  for (const collection of collections) {
    if (typeof collection.name !== 'string') throw new Error('pb_schema.json: a collection has no name');
    names.set(collection.name, collection.name);
    if (typeof collection.id === 'string') names.set(collection.id, collection.name);
  }

  const relations: SchemaRelation[] = [];
  for (const collection of collections) {
    const fields = collection.fields ?? collection.schema;
    if (!Array.isArray(fields)) throw new Error(`pb_schema.json: ${String(collection.name)} has neither fields nor schema; update readSchema`);
    for (const field of fields) {
      if (field.type !== 'relation') continue;
      const target = field.collectionId ?? field.options?.collectionId;
      const references = typeof target === 'string' ? names.get(target) : undefined;
      if (references === undefined) throw new Error(`pb_schema.json: ${String(collection.name)}.${String(field.name)} points at an unknown collection`);
      relations.push({
        relation: `${String(collection.name)}.${String(field.name)}`,
        references,
        required: field.required === true,
        cascade: (field.cascadeDelete ?? field.options?.cascadeDelete) === true,
      });
    }
  }
  return { collections: collections.map((collection) => String(collection.name)), relations };
}

const schema = readSchema();
const PURGE_KINDS = Object.keys(PURGES) as PurgeKind[];
const rowFor = (relation: string) => RELATIONS.find((row) => row.relation === relation);
const sourceOf = (row: RelationRetention) => row.relation.split('.')[0] ?? '';

/** PocketBase's behavior for a relation's flags, in the matrix's words. */
function behaviorOf(relation: SchemaRelation): 'cascade' | 'required' | 'optional' {
  if (relation.cascade) return 'cascade';
  return relation.required ? 'required' : 'optional';
}

/** Whether the schema already has a relation the way #29's target wants it. */
function matchesTarget(row: RelationRetention, relation: SchemaRelation): boolean {
  switch (row.target) {
    case 'cascade':
      return relation.cascade;
    case 'restrict':
      return !relation.cascade;
    case 'detach':
      return !relation.cascade && !relation.required;
    case 'text-id':
      return false;
  }
}

describe('collections', () => {
  it('classes the nine baseline collections, three as tombstone', () => {
    const baseline = COLLECTIONS.filter((row) => row.status === 'baseline');
    expect(baseline.map((row) => [row.collection, row.class])).toEqual([
      ['users', 'tombstone'],
      ['workspaces', 'tombstone'],
      ['blueprints', 'tombstone'],
      ['items', 'operational'],
      ['collaborators', 'operational'],
      ['instances', 'history'],
      ['instanceItems', 'history'],
      ['notifications', 'operational'],
      ['activityLog', 'operational'],
    ]);
  });

  it('classes every collection in pb_schema.json', () => {
    for (const collection of schema.collections) expect(classOf(collection), collection).toBeDefined();
    expect(new Set(COLLECTIONS.map((row) => row.collection)).size).toBe(COLLECTIONS.length);
  });

  it('classes the planned collections the planned relations point at', () => {
    for (const row of COLLECTIONS.filter((candidate) => candidate.status === 'planned')) {
      const leaf = row.addedBy;
      expect(leaf, row.collection).toBeDefined();
      if (leaf) expect(() => leafIssue(leaf)).not.toThrow();
    }
    expect(classOf('templateRevisions')).toBe('proof');
    expect(classOf('runSources')).toBe('proof');
    expect(classOf('completionRecords')).toBe('proof');
  });
});

describe('relations', () => {
  it('has a row for every relation in pb_schema.json, pointing at the same collection', () => {
    for (const relation of schema.relations) {
      expect(rowFor(relation.relation)?.references, relation.relation).toBe(relation.references);
    }
    expect(new Set(RELATIONS.map((row) => row.relation)).size).toBe(RELATIONS.length);
  });

  it('covers the 15 baseline relations, instances.workspace and the planned ones', () => {
    const baseline = RELATIONS.filter((row) => ['cascade', 'required', 'optional'].includes(row.baseline));
    expect(baseline).toHaveLength(15);
    expect(RELATIONS.filter((row) => row.baseline === 'new').map((row) => row.relation)).toEqual(['instances.workspace']);
    expect(RELATIONS.filter((row) => row.baseline === 'planned').map((row) => [row.relation, row.executor])).toEqual([
      ['templateRevisions.template', '04.1'],
      ['blueprints.currentRevision', '04.1'],
      ['blueprints.baseRevision', '04.1'],
      ['instances.templateRevision', '04.1'],
      ['instances.currentRunSource', '07.2'],
      ['completionRecords.run', '10.3'],
      ['completionRecords.workspace', '10.3'],
    ]);
  });

  it("matches each relation in pb_schema.json as it was at baseline, or as #29's target once its executor has run", () => {
    for (const relation of schema.relations) {
      const row = rowFor(relation.relation);
      if (row === undefined) continue;
      const asBaseline = row.baseline === behaviorOf(relation);
      expect(asBaseline || matchesTarget(row, relation), `${relation.relation} is ${behaviorOf(relation)}`).toBe(true);
    }
  });

  it('has every baseline relation in pb_schema.json until a migration changes it', () => {
    const inSchema = new Set(schema.relations.map((relation) => relation.relation));
    for (const row of RELATIONS.filter((candidate) => ['cascade', 'required', 'optional'].includes(candidate.baseline))) {
      expect(inSchema.has(row.relation), row.relation).toBe(true);
    }
    for (const row of RELATIONS.filter((candidate) => candidate.target === 'text-id')) {
      expect(inSchema.has(row.relation), `${row.relation} is a text id, never a relation`).toBe(false);
    }
  });

  it('takes each changed relation where #29 says, through the leaf #29 names', () => {
    const changed = RELATIONS.filter((row) => row.baseline !== 'planned' && row.executor !== null);
    expect(changed.map((row) => [row.relation, row.baseline, row.target, row.snapshot ?? null, row.executor])).toEqual([
      ['workspaces.owner', 'cascade', 'restrict', null, '02.1'],
      ['blueprints.workspace', 'cascade', 'restrict', null, '03.1'],
      ['blueprints.owner', 'required', 'detach', 'actor', '02.1'],
      ['instances.user', 'cascade', 'detach', 'actor', '02.1'],
      ['instances.blueprint', 'required', 'detach', 'title', '07.2'],
      ['items.reference', 'optional', 'detach', 'display', '04.3'],
      ['instanceItems.sourceItem', 'optional', 'detach', 'display', '07.2'],
      ['instances.workspace', 'new', 'restrict', null, '18.2'],
    ]);
  });

  it('keeps the other eight baseline relations as cascade', () => {
    const unchanged = RELATIONS.filter((row) => row.executor === null);
    expect(unchanged).toHaveLength(8);
    for (const row of unchanged) expect([row.baseline, row.target], row.relation).toEqual(['cascade', 'cascade']);
  });

  it('classes both ends of every relation', () => {
    for (const row of RELATIONS) {
      expect(classOf(sourceOf(row)), row.relation).toBeDefined();
      expect(classOf(row.references), row.relation).toBeDefined();
    }
  });
});

describe('purge rules', () => {
  it('gives each class a purge rule and an effect for every purge', () => {
    expect(Object.keys(CLASS_RULES).sort()).toEqual([...RETENTION_CLASSES].sort());
    for (const name of RETENTION_CLASSES) {
      expect(CLASS_RULES[name].purge.length, name).toBeGreaterThan(0);
      expect(Object.keys(CLASS_RULES[name].onPurge).sort(), name).toEqual([...PURGE_KINDS].sort());
    }
  });

  it('starts each purge from its soft delete', () => {
    expect(Object.fromEntries(PURGE_KINDS.map((kind) => [kind, [PURGES[kind].after, PURGES[kind].owner]]))).toEqual({
      account: ['DeleteAccount', '02.1'],
      workspace: ['DeleteWorkspace', '03.1'],
      template: ['ArchiveTemplate', '04.3'],
    });
  });

  it('never deletes a restrict target', () => {
    for (const row of RELATIONS.filter((candidate) => candidate.target === 'restrict')) {
      const targetClass = classOf(row.references);
      expect(targetClass, row.relation).toBeDefined();
      if (targetClass === undefined) continue;
      for (const kind of PURGE_KINDS) expect(CLASS_RULES[targetClass].onPurge[kind], `${row.relation}, ${kind} purge`).not.toBe('delete');
    }
  });

  it('never deletes a revision outside ephemeral, and keeps referenced and installed ephemeral ones', () => {
    expect(classOf('templateRevisions')).toBe('proof');
    for (const revisionClass of RETENTION_CLASSES) {
      for (const referenced of [false, true]) {
        for (const installed of [false, true]) {
          const expected = revisionClass === 'ephemeral' && !referenced && !installed;
          expect(mayDeleteRevision(revisionClass, { referenced, installed }), `${revisionClass} ${referenced} ${installed}`).toBe(expected);
        }
      }
    }
  });

  it('deletes operational rows and turns tombstone rows into tombstones', () => {
    for (const kind of PURGE_KINDS) {
      expect(CLASS_RULES.operational.onPurge[kind]).toBe('delete');
      expect(CLASS_RULES.tombstone.onPurge[kind]).toBe('tombstone');
    }
    expect(COLLECTIONS.filter((row) => row.class === 'tombstone').map((row) => row.collection)).toEqual(['users', 'workspaces', 'blueprints']);
  });

  it('only detaches history on account and template purges, and keeps proof', () => {
    expect(CLASS_RULES.history.onPurge).toEqual({ account: 'detach', workspace: 'delete', template: 'detach' });
    expect(CLASS_RULES.proof.onPurge).toEqual({ account: 'keep', workspace: 'keep', template: 'keep' });
  });

  it('never cascades a history or proof relation outside its run', () => {
    for (const row of RELATIONS) {
      const source = classOf(sourceOf(row));
      if ((source === 'history' || source === 'proof') && row.target === 'cascade') {
        expect(row.withinRun, `${row.relation} cascades outside its run`).toBe(true);
      }
    }
    expect(RELATIONS.filter((row) => row.withinRun).map((row) => row.relation)).toEqual(['instanceItems.instance', 'instanceItems.parent']);
  });

  it('names a filed executor for every changed relation', () => {
    for (const { executor } of RELATIONS) if (executor !== null) expect(() => leafIssue(executor)).not.toThrow();
  });
});
