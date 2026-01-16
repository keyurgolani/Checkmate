/**
 * Blueprint Public Detail Page Loading State
 *
 * Displays skeleton loaders while a public blueprint detail page is loading.
 * Uses Next.js App Router loading convention.
 *
 * Requirements: 12.1 - UI feedback within 200ms
 */

import { TemplateDetailSkeleton } from "@/components/templates";
import { Skeleton } from "@/components/ui/skeleton";

export default function BlueprintPublicDetailLoading() {
  return (
    <div className="space-y-6">
      {/* Back button skeleton */}
      <Skeleton className="h-9 w-32" />

      {/* Detail skeleton */}
      <TemplateDetailSkeleton />

      {/* Action button skeleton */}
      <Skeleton className="h-10 w-40" />
    </div>
  );
}
