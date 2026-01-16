/**
 * Workspaces Page Loading State
 *
 * Displays skeleton loaders while the workspaces page is loading.
 * Uses Next.js App Router loading convention.
 *
 * Requirements: 12.1 - UI feedback within 200ms
 */

import { Skeleton, SkeletonCard } from "@/components/ui/skeleton";

export default function WorkspacesLoading() {
  return (
    <div className="space-y-6">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-9 w-36 mb-2" />
          <Skeleton className="h-5 w-64" />
        </div>
        <Skeleton className="h-10 w-40" />
      </div>

      {/* Workspace cards skeleton */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <SkeletonCard key={index} showHeader={true} showFooter={true} contentLines={2} />
        ))}
      </div>
    </div>
  );
}
