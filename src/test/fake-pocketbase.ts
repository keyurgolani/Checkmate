/**
 * Structural PocketBase fake for node tests.
 *
 * Keeps records in memory per collection and logs every call, so a test can
 * assert what a route or service read and wrote without a live PocketBase.
 * It covers what the run routes and services call: getOne, getFullList,
 * create, update and delete, filters of `field = "value"` terms joined by
 * `&&`, and comma-separated sorts. Anything else throws, so a test fails
 * loudly instead of passing on a guess. Access rules and `expand` are not
 * modelled; the routes under test do their own owner checks.
 */

import type PocketBase from 'pocketbase';
import { ClientResponseError } from 'pocketbase';

export type FakeRecord = { id: string } & Record<string, unknown>;

export type FakeMethod = 'getOne' | 'getFullList' | 'create' | 'update' | 'delete';

export interface FakeCall {
  collection: string;
  method: FakeMethod;
  id?: string;
  data?: Record<string, unknown>;
  filter?: string;
}

export interface FakePocketBase {
  /** Pass this wherever a route or service expects a PocketBase client. */
  pb: PocketBase;
  /** Every call, in order. */
  calls: FakeCall[];
  /** Only the create, update and delete calls. */
  writes(): FakeCall[];
  /** Current records of a collection, in insertion order. */
  records(collection: string): FakeRecord[];
}

const WRITE_METHODS: ReadonlySet<FakeMethod> = new Set(['create', 'update', 'delete']);

function notFound(): ClientResponseError {
  return new ClientResponseError({
    status: 404,
    response: { code: 404, message: "The requested resource wasn't found.", data: {} },
  });
}

function parseFilter(filter: string): Array<[string, string]> {
  return filter.split('&&').map((term) => {
    const match = /^\s*([\w.]+)\s*=\s*"([^"]*)"\s*$/.exec(term);
    if (!match || match[1] === undefined || match[2] === undefined) {
      throw new Error(`fake-pocketbase: unsupported filter ${JSON.stringify(filter)}`);
    }
    return [match[1], match[2]];
  });
}

function compareBy(sort: string) {
  const keys = sort
    .split(',')
    .map((key) => key.trim())
    .filter(Boolean)
    .map((key) => (key.startsWith('-') ? { field: key.slice(1), dir: -1 } : { field: key, dir: 1 }));

  return (a: FakeRecord, b: FakeRecord): number => {
    for (const { field, dir } of keys) {
      const left = a[field];
      const right = b[field];
      if (left === right) continue;
      if (left === undefined || left === null) return -dir;
      if (right === undefined || right === null) return dir;
      return (left < right ? -1 : 1) * dir;
    }
    return 0;
  };
}

export function createFakePocketBase(
  seed: Record<string, FakeRecord[]>,
  options: { authRecord?: FakeRecord | null } = {}
): FakePocketBase {
  const store = new Map<string, FakeRecord[]>();
  for (const [name, records] of Object.entries(seed)) {
    store.set(name, records.map((record) => structuredClone(record)));
  }

  const calls: FakeCall[] = [];
  let nextId = 1;
  const tick = () => new Date(Date.UTC(2026, 0, 1, 0, 0, nextId)).toISOString();
  const rows = (name: string): FakeRecord[] => {
    let list = store.get(name);
    if (!list) {
      list = [];
      store.set(name, list);
    }
    return list;
  };

  const collection = (name: string) => ({
    async getOne(id: string) {
      calls.push({ collection: name, method: 'getOne', id });
      const record = rows(name).find((row) => row.id === id);
      if (!record) throw notFound();
      return structuredClone(record);
    },

    async getFullList(queryOptions: { filter?: string; sort?: string } = {}) {
      calls.push({ collection: name, method: 'getFullList', filter: queryOptions.filter });
      const terms = queryOptions.filter ? parseFilter(queryOptions.filter) : [];
      const matches = rows(name).filter((row) =>
        terms.every(([field, value]) => String(row[field] ?? '') === value)
      );
      if (queryOptions.sort) matches.sort(compareBy(queryOptions.sort));
      return matches.map((row) => structuredClone(row));
    },

    async create(data: Record<string, unknown>) {
      calls.push({ collection: name, method: 'create', data: structuredClone(data) });
      const now = tick();
      const record: FakeRecord = {
        ...structuredClone(data),
        id: `${name}-${nextId++}`,
        collectionName: name,
        created: now,
        updated: now,
      };
      rows(name).push(record);
      return structuredClone(record);
    },

    async update(id: string, data: Record<string, unknown>) {
      calls.push({ collection: name, method: 'update', id, data: structuredClone(data) });
      const list = rows(name);
      const index = list.findIndex((row) => row.id === id);
      const current = list[index];
      if (!current) throw notFound();
      const defined = Object.fromEntries(Object.entries(data).filter(([, value]) => value !== undefined));
      const updated: FakeRecord = { ...current, ...structuredClone(defined), id, updated: tick() };
      list[index] = updated;
      return structuredClone(updated);
    },

    async delete(id: string) {
      calls.push({ collection: name, method: 'delete', id });
      const list = rows(name);
      const index = list.findIndex((row) => row.id === id);
      if (index === -1) throw notFound();
      list.splice(index, 1);
      return true;
    },
  });

  const authRecord = options.authRecord ?? null;
  const pb = {
    authStore: {
      record: authRecord,
      token: authRecord ? 'test-token' : '',
      isValid: authRecord !== null,
    },
    collection,
  };

  return {
    pb: pb as unknown as PocketBase,
    calls,
    writes: () => calls.filter((call) => WRITE_METHODS.has(call.method)),
    records: (name) => rows(name).map((row) => structuredClone(row)),
  };
}
