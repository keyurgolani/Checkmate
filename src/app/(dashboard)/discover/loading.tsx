/**
 * Discover Page Loading State
 *
 * Displays skeleton loaders while the discover/search page is loading.
 * Uses Next.js App Router loading convention.
 *
 * Requirements: 12.1 - UI feedback within 200ms
 */

import { TemplateListSkeleton } from "@/components/templates";
import { Skeleton } from "@/components/ui/skeleton";

export default function DiscoverLoading() {
  return (
    <div className="w-full space-y-6">
      {/* Header skeleton */}
      <div>
        <Skeleton className="h-9 w-48 mb-2" />
        <Skeleton className="h-5 w-80" />
      </div>

      {/* Search bar and filter button skeleton */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Skeleton className="h-12 flex-1" />
        <Skeleton className="h-12 w-full sm:w-28" />
      </div>

      {/* Results skeleton */}
      <div className="w-full">
        <TemplateListSkeleton count={8} viewMode="grid" />
      </div>
    </div>
  );
}
