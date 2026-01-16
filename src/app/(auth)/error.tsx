"use client";

import { PageError } from "@/components/ui/error-boundary";

/**
 * Error boundary for the auth route group.
 * Catches errors in authentication pages.
 */
export default function AuthError({
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
      title="Authentication Error"
      description="Something went wrong during authentication. Please try again."
      showHomeButton={true}
    />
  );
}
