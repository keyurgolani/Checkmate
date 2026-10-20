/**
 * Setup file for the vitest `backend` project. Points both PocketBase URL
 * variables at the shared fixture, or fails every suite when there is none.
 */

import { inject } from 'vitest';

const pocketbase = inject('pocketbase');
if (!pocketbase?.url || !pocketbase.adminToken) {
  throw new Error(
    'No PocketBase fixture was provided. Backend suites run in the vitest "backend" project (npm run test:backend), whose global setup starts one.',
  );
}

process.env.POCKETBASE_URL = pocketbase.url;
process.env.NEXT_PUBLIC_POCKETBASE_URL = pocketbase.url;

// Values from a developer shell or CI must not reach the suites.
for (const name of ['TEST_POCKETBASE_URL', 'PB_ADMIN_EMAIL', 'PB_ADMIN_PASSWORD', 'POCKETBASE_ADMIN_EMAIL', 'POCKETBASE_ADMIN_PASSWORD']) {
  delete process.env[name];
}
