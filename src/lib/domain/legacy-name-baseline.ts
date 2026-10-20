/**
 * Legacy storage names, deprecated aliases and deprecated members per file,
 * outside src/lib/domain/ and the permanent entries, as legacy-names.ts
 * defines them.
 *
 * This is the merge-time count of CHECKMATE-01.1 · adapter (#29). It only
 * shrinks: legacy-names.test.ts fails when a file's count differs from its
 * entry here, so lower or drop an entry when a use goes, and
 * scripts/ci/check-shrinking-lists.mjs fails a change that raises an entry or
 * adds one. A file git sees moved keeps its count under the new path. #38
 * (04.1), #42 (05.2) and #47 (07.1) start moving these onto the adapter.
 */
export const LEGACY_NAME_BASELINE: Readonly<Record<string, number>> = {
  'src/app/(dashboard)/checklists/[id]/actions.ts': 3,
  'src/app/(dashboard)/checklists/[id]/checklist-detail-client.tsx': 2,
  'src/app/(dashboard)/checklists/[id]/page.tsx': 6,
  'src/app/(dashboard)/checklists/page.tsx': 5,
  'src/app/(dashboard)/dashboard/dashboard-view.tsx': 1,
  'src/app/(dashboard)/dashboard/page.tsx': 3,
  'src/app/(dashboard)/discover/[id]/page.tsx': 1,
  'src/app/(dashboard)/reports/page.tsx': 8,
  'src/app/(dashboard)/reports/reports-data.ts': 3,
  'src/app/(dashboard)/templates/[id]/page.tsx': 1,
  'src/app/(dashboard)/workspaces/[id]/actions.ts': 4,
  'src/app/(dashboard)/workspaces/[id]/page.tsx': 3,
  'src/app/(print)/checklists/[id]/print/page.tsx': 3,
  'src/app/api/auth/demo-reset/route.ts': 4,
  'src/app/api/checklists/[id]/items/[itemId]/toggle/route.ts': 4,
  'src/app/api/checklists/[id]/route.ts': 6,
  'src/app/api/checklists/route.ts': 7,
  'src/app/api/collaborators/[id]/accept/route.ts': 1,
  'src/app/api/collaborators/[id]/route.ts': 1,
  'src/app/api/dashboard/summary/route.ts': 2,
  'src/app/api/items/[id]/route.ts': 4,
  'src/app/api/templates/[id]/collaborators/route.ts': 2,
  'src/app/api/templates/[id]/items/reorder/route.ts': 1,
  'src/app/api/templates/[id]/items/route.ts': 1,
  'src/components/notifications/notification-center.tsx': 2,
  'src/components/templates/template-editor.tsx': 1,
  'src/lib/pocketbase-types.ts': 40,
  'src/lib/services/activity.ts': 3,
  'src/lib/services/checklist.ts': 31,
  'src/lib/services/circular-dependency.ts': 3,
  'src/lib/services/collaboration.ts': 15,
  'src/lib/services/export.ts': 5,
  'src/lib/services/item.ts': 26,
  'src/lib/services/notification.ts': 1,
  'src/lib/services/realtime.ts': 11,
  'src/lib/services/schema-init.ts': 4,
  'src/lib/services/search.ts': 1,
  'src/lib/services/template.ts': 6,
  'src/lib/services/workspace.ts': 4,
};
