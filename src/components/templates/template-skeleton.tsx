"use client";

/**
 * Template Skeleton Components
 *
 * Loading skeleton placeholders for template-related content.
 * Matches the layout of TemplateCard and TemplateList components.
 *
 * Requirements: 12.1 - UI feedback within 200ms
 */

import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

// ============================================================================
// Template Card Skeleton - Grid View
// ============================================================================

export function TemplateCardSkeleton() {
  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <Skeleton className="h-6 w-3/4" />
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 mb-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </div>
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-3">
            <Skeleton className="h-5 w-16 rounded" />
            <Skeleton className="h-4 w-10" />
          </div>
          <div className="flex items-center gap-3">
            <Skeleton className="h-4 w-8" />
            <Skeleton className="h-4 w-8" />
          </div>
        </div>
        <div className="flex items-center justify-between mt-2">
          <div className="flex gap-1">
            <Skeleton className="h-5 w-12 rounded" />
            <Skeleton className="h-5 w-14 rounded" />
          </div>
          <Skeleton className="h-4 w-20" />
        </div>
      </CardContent>
    </Card>
  );
}


// ============================================================================
// Template Card Skeleton - List View
// ============================================================================

export function TemplateListItemSkeleton() {
  return (
    <div className="flex items-center justify-between p-4 border rounded-lg">
      <div className="flex-1 min-w-0 mr-4 space-y-2">
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
        <Skeleton className="h-4 w-64" />
      </div>
      <div className="flex items-center gap-4 flex-shrink-0">
        <Skeleton className="h-4 w-16 hidden sm:block" />
        <Skeleton className="h-4 w-10" />
        <Skeleton className="h-4 w-8 hidden md:block" />
        <Skeleton className="h-4 w-8" />
        <Skeleton className="h-4 w-20 hidden lg:block" />
      </div>
    </div>
  );
}

// ============================================================================
// Template List Skeleton
// ============================================================================

interface TemplateListSkeletonProps {
  /** Number of skeleton items to show */
  count?: number;
  /** View mode */
  viewMode?: "grid" | "list";
}

export function TemplateListSkeleton({
  count = 6,
  viewMode = "grid",
}: TemplateListSkeletonProps) {
  return (
    <div className="space-y-4">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-8 w-20 rounded-lg" />
      </div>

      {/* Content skeleton */}
      {viewMode === "grid" ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: count }).map((_, index) => (
            <TemplateCardSkeleton key={index} />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {Array.from({ length: count }).map((_, index) => (
            <TemplateListItemSkeleton key={index} />
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Template Editor Skeleton
// ============================================================================

export function TemplateEditorSkeleton() {
  return (
    <div className="space-y-6">
      {/* Title and description */}
      <div className="space-y-4">
        <Skeleton className="h-10 w-full max-w-md" />
        <Skeleton className="h-20 w-full" />
      </div>

      {/* Visibility and category */}
      <div className="flex gap-4">
        <Skeleton className="h-10 w-32" />
        <Skeleton className="h-10 w-40" />
      </div>

      {/* Items list */}
      <div className="space-y-2">
        <Skeleton className="h-6 w-20" />
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="flex items-center gap-2 p-3 border rounded-lg">
            <Skeleton className="h-5 w-5 rounded" />
            <Skeleton className="h-5 flex-1" />
            <Skeleton className="h-8 w-8 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// Template Detail Skeleton
// ============================================================================

export function TemplateDetailSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-6 w-16 rounded-full" />
        </div>
        <Skeleton className="h-5 w-96" />
      </div>

      {/* Meta info */}
      <div className="flex items-center gap-4">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-5 w-20" />
        <Skeleton className="h-5 w-28" />
      </div>

      {/* Items */}
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent className="space-y-2">
          {Array.from({ length: 8 }).map((_, index) => (
            <div key={index} className="flex items-center gap-2 py-2">
              <Skeleton className="h-5 w-5 rounded" />
              <Skeleton className="h-5 flex-1" />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
