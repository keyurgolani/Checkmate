/**
 * Checklists Page Loading State
 *
 * Displays skeleton loaders while the checklists list page is loading.
 * Uses Next.js App Router loading convention.
 *
 * Requirements: 12.1 - UI feedback within 200ms
 */

import { ChecklistListSkeleton } from "@/components/checklists";
import { Skeleton } from "@/components/ui/skeleton";

export default function ChecklistsLoading() {
  return (
    <div className="space-y-6">
      {/* Header skeleton */}
      <div>
        <Skeleton className="h-9 w-40 mb-2" />
        <Skeleton className="h-5 w-72" />
      </div>

      {/* Checklist list skeleton */}
      <ChecklistListSkeleton count={6} viewMode="list" showFilters={true} />
    </div>
  );
}
