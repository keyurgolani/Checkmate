/**
 * Child process entry for `schema: 'baseline'`.
 *
 * schema-init reads POCKETBASE_URL and the superuser variables when it is
 * imported, so the fixture runs this file with a per-run env instead of
 * importing schema-init into the test process. Exits 0 only when
 * ensureSchemaInitialized, the server's start path, returns true.
 */

import { ensureSchemaInitialized } from '../../lib/services/schema-init';

ensureSchemaInitialized().then(
  (initialized) => {
    process.exitCode = initialized ? 0 : 1;
  },
  (error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  },
);
