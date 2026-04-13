/**
 * Templates Page Loading State
 *
 * Displays skeleton loaders while the templates list page is loading.
 * Uses Next.js App Router loading convention.
 *
 * Requirements: 12.1 - UI feedback within 200ms
 */

import { TemplateListSkeleton } from "@/components/templates/template-skeleton";
import { Skeleton } from "@/components/ui/skeleton";

export default function TemplatesLoading() {
  return (
    <div className="space-y-6">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-9 w-32 mb-2" />
          <Skeleton className="h-5 w-64" />
        </div>
        <Skeleton className="h-10 w-36" />
      </div>

      {/* Template list skeleton */}
      <TemplateListSkeleton count={6} viewMode="grid" />
    </div>
  );
}
