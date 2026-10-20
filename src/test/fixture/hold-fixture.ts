/**
 * Test helper for the cleanup-after-kill case: starts a fixture, prints its
 * run directory and PocketBase PID as one JSON line, then waits to be killed.
 */

import { startPocketBase } from './pocketbase';

startPocketBase({ schema: 'none' }).then(
  (fixture) => {
    console.log(JSON.stringify({ runDir: fixture.runDir, pid: fixture.pid, url: fixture.url }));
    setInterval(() => {}, 60_000);
  },
  (error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  },
);
