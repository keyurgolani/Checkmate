"use client";

/**
 * Dashboard Skeleton Components
 *
 * Loading skeleton placeholders for dashboard content.
 * Matches the layout of the dashboard page.
 *
 * Requirements: 12.1 - UI feedback within 200ms
 */

import { Skeleton, SkeletonStatCard } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { DashboardChecklistSkeleton } from "@/components/checklists/checklist-skeleton";

// ============================================================================
// Dashboard Page Skeleton
// ============================================================================

export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Skeleton className="h-9 w-40 mb-2" />
        <Skeleton className="h-5 w-96" />
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <SkeletonStatCard />
        <SkeletonStatCard />
        <SkeletonStatCard />
        <SkeletonStatCard />
      </div>

      {/* Recent Checklists */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <Skeleton className="h-6 w-36" />
            <Skeleton className="h-4 w-16" />
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {Array.from({ length: 5 }).map((_, index) => (
            <DashboardChecklistSkeleton key={index} />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================================
// Stat Card Skeleton (alternative inline version)
// ============================================================================

export function StatCardSkeleton() {
  return (
    <Card>
      <CardHeader className="pb-2">
        <Skeleton className="h-4 w-24" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-8 w-16 mb-1" />
        <Skeleton className="h-3 w-32" />
      </CardContent>
    </Card>
  );
}
