"use client";

import { PageError } from "@/components/ui/error-boundary";

/**
 * Error boundary for the dashboard route group.
 * Catches errors in dashboard pages while preserving the dashboard layout.
 */
export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <PageError
      error={error}
      reset={reset}
      title="Dashboard Error"
      description="Something went wrong while loading this page. Please try again."
    />
  );
}
