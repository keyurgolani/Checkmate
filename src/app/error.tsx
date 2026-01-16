"use client";

import { PageError } from "@/components/ui/error-boundary";

/**
 * Error boundary for the root app segment.
 * Catches errors in pages but not in the root layout.
 */
export default function Error({
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
      title="Something went wrong"
      description="We encountered an unexpected error. Please try again or return to the home page."
    />
  );
}
