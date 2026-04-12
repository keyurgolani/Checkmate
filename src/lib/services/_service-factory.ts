import type PocketBase from 'pocketbase';
import { createPocketBaseClient } from '../pocketbase';

type ServiceCtor<T> = new (pb?: PocketBase) => T;

/**
 * Produces the standard `createXService` / `getXService` pair used by
 * every singleton-backed service in this directory. On the server we
 * always mint a fresh instance; on the client we cache one per module.
 */
export function makeServiceAccessor<T>(Ctor: ServiceCtor<T>) {
  let clientSingleton: T | null = null;
  const create = (): T => new Ctor(createPocketBaseClient());
  const get = (): T => {
    if (typeof window === 'undefined') return create();
    if (!clientSingleton) clientSingleton = new Ctor();
    return clientSingleton;
  };
  return { create, get };
}
