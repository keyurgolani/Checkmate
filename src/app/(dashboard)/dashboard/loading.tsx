/**
 * Dashboard Loading State
 *
 * Displays skeleton loaders while the dashboard page is loading.
 * Uses Next.js App Router loading convention.
 *
 * Requirements: 12.1 - UI feedback within 200ms
 */

import { DashboardSkeleton } from "@/components/dashboard/dashboard-skeleton";

export default function DashboardLoading() {
  return <DashboardSkeleton />;
}
