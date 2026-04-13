/**
 * Checklist Detail Page Loading State
 *
 * Displays skeleton loaders while a checklist detail page is loading.
 * Uses Next.js App Router loading convention.
 *
 * Requirements: 12.1 - UI feedback within 200ms
 */

import { ChecklistTrackerSkeleton } from "@/components/checklists/checklist-skeleton";
import { Skeleton } from "@/components/ui/skeleton";

export default function ChecklistDetailLoading() {
  return (
    <div className="space-y-6">
      {/* Back button skeleton */}
      <Skeleton className="h-9 w-32" />

      {/* Tracker skeleton */}
      <ChecklistTrackerSkeleton />
    </div>
  );
}
