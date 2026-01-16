"use client";

/**
 * Checklist Skeleton Components
 *
 * Loading skeleton placeholders for checklist-related content.
 * Matches the layout of ChecklistCard and ChecklistList components.
 *
 * Requirements: 12.1 - UI feedback within 200ms
 */

import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

// ============================================================================
// Checklist Card Skeleton - Grid View
// ============================================================================

export function ChecklistCardSkeleton() {
  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <Skeleton className="h-6 w-3/4" />
          <Skeleton className="h-5 w-20 rounded-full" />
        </div>
      </CardHeader>
      <CardContent>
        <Skeleton className="h-4 w-48 mb-3" />

        {/* Progress Section */}
        <div className="space-y-2 mb-3">
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-10" />
          </div>
          <Skeleton className="h-2 w-full rounded-full" />
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-32" />
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Checklist Card Skeleton - List View
// ============================================================================

export function ChecklistListItemSkeleton() {
  return (
    <div className="flex items-center justify-between p-4 border rounded-lg">
      <div className="flex-1 min-w-0 mr-4 space-y-2">
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-5 w-20 rounded-full" />
        </div>
        <Skeleton className="h-4 w-32" />
      </div>
      <div className="flex items-center gap-4 flex-shrink-0">
        <Skeleton className="h-2 w-24 hidden sm:block rounded-full" />
        <Skeleton className="h-4 w-12" />
        <Skeleton className="h-4 w-20 hidden md:block" />
      </div>
    </div>
  );
}

// ============================================================================
// Checklist List Skeleton
// ============================================================================

interface ChecklistListSkeletonProps {
  /** Number of skeleton items to show */
  count?: number;
  /** View mode */
  viewMode?: "grid" | "list";
  /** Whether to show filter tabs */
  showFilters?: boolean;
}

export function ChecklistListSkeleton({
  count = 6,
  viewMode = "list",
  showFilters = true,
}: ChecklistListSkeletonProps) {
  return (
    <div className="space-y-4">
      {/* Header skeleton with filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {showFilters && (
          <div className="flex items-center gap-1 border rounded-lg p-1">
            <Skeleton className="h-8 w-16 rounded" />
            <Skeleton className="h-8 w-20 rounded" />
            <Skeleton className="h-8 w-24 rounded" />
          </div>
        )}
        <Skeleton className="h-8 w-20 rounded-lg" />
      </div>

      {/* Count skeleton */}
      <Skeleton className="h-4 w-24" />

      {/* Content skeleton */}
      {viewMode === "grid" ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: count }).map((_, index) => (
            <ChecklistCardSkeleton key={index} />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {Array.from({ length: count }).map((_, index) => (
            <ChecklistListItemSkeleton key={index} />
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Checklist Tracker Skeleton
// ============================================================================

export function ChecklistTrackerSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-56" />
          <Skeleton className="h-6 w-20 rounded-full" />
        </div>
        <Skeleton className="h-5 w-40" />
      </div>

      {/* Progress overview */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-2">
            <Skeleton className="h-5 w-20" />
            <Skeleton className="h-5 w-12" />
          </div>
          <Skeleton className="h-3 w-full rounded-full" />
        </CardContent>
      </Card>

      {/* Items list */}
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-24" />
        </CardHeader>
        <CardContent className="space-y-2">
          {Array.from({ length: 10 }).map((_, index) => (
            <div key={index} className="flex items-center gap-3 py-2">
              <Skeleton className="h-5 w-5 rounded" />
              <Skeleton className="h-5 flex-1" />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================================
// Dashboard Checklist Card Skeleton
// ============================================================================

export function DashboardChecklistSkeleton() {
  return (
    <div className="flex items-center justify-between p-4 border rounded-lg">
      <div className="flex-1 min-w-0 mr-4">
        <Skeleton className="h-5 w-40 mb-1" />
        <Skeleton className="h-4 w-28" />
      </div>
      <div className="flex items-center gap-4 flex-shrink-0">
        <Skeleton className="h-2 w-24 rounded-full" />
        <Skeleton className="h-4 w-10" />
      </div>
    </div>
  );
}
