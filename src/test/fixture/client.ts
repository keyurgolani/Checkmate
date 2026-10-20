/**
 * Clients for a running fixture. Used by the fixture handle and by test
 * workers, which receive only `{ url, adminToken }` from the global setup.
 */

import { randomBytes } from 'node:crypto';
import PocketBase, { type RecordModel } from 'pocketbase';

export interface SeedUserOptions {
  email?: string;
  password?: string;
  displayName?: string;
  verified?: boolean;
}

export interface SeededUser {
  id: string;
  email: string;
  password: string;
  record: RecordModel;
  /** Signs the user in on `client` (a fresh client by default) and returns it. */
  signIn(client?: PocketBase): Promise<PocketBase>;
}

/** A client authenticated as the fixture's per-run superuser. */
export function adminClient(url: string, adminToken: string): PocketBase {
  const pb = new PocketBase(url);
  pb.autoCancellation(false);
  pb.authStore.save(adminToken);
  return pb;
}

/**
 * Creates a user through the superuser, so it works whatever the users
 * collection's create rule allows.
 */
export async function seedUser(url: string, adminToken: string, options: SeedUserOptions = {}): Promise<SeededUser> {
  const email = options.email ?? `user-${randomBytes(6).toString('hex')}@fixture.test`;
  const password = options.password ?? randomBytes(18).toString('base64url');
  const record = await adminClient(url, adminToken)
    .collection('users')
    .create({
      email,
      password,
      passwordConfirm: password,
      displayName: options.displayName ?? 'Fixture User',
      verified: options.verified ?? true,
    });

  return {
    id: record.id,
    email,
    password,
    record,
    async signIn(client = new PocketBase(url)) {
      await client.collection('users').authWithPassword(email, password);
      return client;
    },
  };
}
