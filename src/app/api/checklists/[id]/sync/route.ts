/**
 * Checklist Sync API Route (removed)
 *
 * POST /api/checklists/[id]/sync - 410 RUN_SYNC_REMOVED
 *
 * Template sync reported success without changing the run, so it was
 * removed. The route answers before any session or run lookup, so every
 * signed-in caller gets the same body apart from the timestamp. The proxy
 * still answers anonymous callers with 401.
 */

import { apiError } from '@/lib/api/route-helpers';

const RUN_SYNC_REMOVED = 'RUN_SYNC_REMOVED';

export async function POST() {
  console.info('[run_sync.removed] POST /api/checklists/[id]/sync answered 410');
  return apiError(
    RUN_SYNC_REMOVED,
    'Template sync was removed. A run keeps the steps it was created with.',
    410
  );
}
