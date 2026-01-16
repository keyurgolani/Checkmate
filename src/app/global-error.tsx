"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

/**
 * Global error boundary for the root layout.
 * This catches errors that occur in the root layout itself.
 * Must include its own <html> and <body> tags since it replaces the root layout.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Global error:", error);
  }, [error]);

  return (
    <html lang="en">
      <body className="antialiased bg-background text-foreground">
        <div className="flex min-h-screen flex-col items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-xl border bg-card text-card-foreground shadow p-6">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/20">
                <AlertTriangle className="h-8 w-8 text-red-600 dark:text-red-400" aria-hidden="true" />
              </div>
              <div className="space-y-2">
                <h1 className="text-2xl font-semibold">Application Error</h1>
                <p className="text-muted-foreground">
                  A critical error occurred. Please refresh the page to try again.
                </p>
              </div>
              {process.env.NODE_ENV === "development" && error && (
                <details className="w-full rounded-md bg-muted p-3 text-left">
                  <summary className="cursor-pointer text-sm font-medium text-muted-foreground">
                    Error details
                  </summary>
                  <pre className="mt-2 text-xs font-mono text-muted-foreground whitespace-pre-wrap break-all">
                    {error.message}
                    {error.digest && `\n\nDigest: ${error.digest}`}
                  </pre>
                </details>
              )}
              <button
                onClick={reset}
                className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <RefreshCw className="h-4 w-4" aria-hidden="true" />
                Try again
              </button>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
