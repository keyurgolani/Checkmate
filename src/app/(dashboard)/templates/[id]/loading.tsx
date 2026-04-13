/**
 * Template Detail Page Loading State
 *
 * Displays skeleton loaders while a template detail page is loading.
 * Uses Next.js App Router loading convention.
 *
 * Requirements: 12.1 - UI feedback within 200ms
 */

import { TemplateEditorSkeleton } from "@/components/templates/template-skeleton";
import { Skeleton } from "@/components/ui/skeleton";

export default function TemplateDetailLoading() {
  return (
    <div className="space-y-6">
      {/* Back button skeleton */}
      <Skeleton className="h-9 w-24" />

      {/* Editor skeleton */}
      <TemplateEditorSkeleton />
    </div>
  );
}
