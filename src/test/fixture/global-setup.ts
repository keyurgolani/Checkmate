/**
 * Global setup for the vitest `backend` project: one shared PocketBase for
 * the run. Workers receive only `{ url, adminToken }` through `provide`.
 * Suites that restart, snapshot or destroy data start their own instance.
 */

import type { TestProject } from 'vitest/node';
import { startPocketBase } from './pocketbase';

declare module 'vitest' {
  export interface ProvidedContext {
    pocketbase: { url: string; adminToken: string };
  }
}

export default async function setup(project: TestProject): Promise<() => Promise<void>> {
  const fixture = await startPocketBase({ schema: 'baseline' });
  project.provide('pocketbase', { url: fixture.url, adminToken: fixture.adminToken });
  return () => fixture.stop();
}
