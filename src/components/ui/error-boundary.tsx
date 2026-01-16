"use client";

import * as React from "react";
import { AlertTriangle, RefreshCw, Home, WifiOff, ServerCrash, Ban } from "lucide-react";
import { Button } from "./button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "./card";
import { cn } from "@/lib/utils";

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  /** Optional key to force reset when it changes */
  resetKey?: string | number;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

/**
 * Categorizes errors for better user messaging
 */
export type ErrorCategory = "network" | "server" | "permission" | "unknown";

export function categorizeError(error: Error | null): ErrorCategory {
  if (!error) return "unknown";
  
  const message = error.message.toLowerCase();
  const name = error.name.toLowerCase();
  
  if (
    message.includes("network") ||
    message.includes("fetch") ||
    message.includes("failed to fetch") ||
    message.includes("offline") ||
    name.includes("networkerror")
  ) {
    return "network";
  }
  
  if (
    message.includes("500") ||
    message.includes("502") ||
    message.includes("503") ||
    message.includes("server") ||
    message.includes("internal error")
  ) {
    return "server";
  }
  
  if (
    message.includes("401") ||
    message.includes("403") ||
    message.includes("unauthorized") ||
    message.includes("forbidden") ||
    message.includes("permission")
  ) {
    return "permission";
  }
  
  return "unknown";
}

/**
 * React Error Boundary component for catching and handling errors in child components.
 * Use this for wrapping specific sections of your app that might fail.
 */
export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
    this.setState({ errorInfo });
    this.props.onError?.(error, errorInfo);
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps): void {
    // Reset error state when resetKey changes
    if (
      this.state.hasError &&
      prevProps.resetKey !== this.props.resetKey
    ) {
      this.handleReset();
    }
  }

  handleReset = (): void => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render(): React.ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <ErrorFallback
          error={this.state.error}
          reset={this.handleReset}
        />
      );
    }

    return this.props.children;
  }
}

interface ErrorFallbackProps {
  error: Error | null;
  reset?: () => void;
  className?: string;
}

/**
 * Gets the appropriate icon for an error category
 */
function getErrorIcon(category: ErrorCategory) {
  switch (category) {
    case "network":
      return WifiOff;
    case "server":
      return ServerCrash;
    case "permission":
      return Ban;
    default:
      return AlertTriangle;
  }
}

/**
 * Gets user-friendly messaging for an error category
 */
function getErrorMessage(category: ErrorCategory): { title: string; description: string } {
  switch (category) {
    case "network":
      return {
        title: "Connection Problem",
        description: "Unable to connect. Please check your internet connection and try again.",
      };
    case "server":
      return {
        title: "Server Error",
        description: "Our servers are having trouble. Please try again in a moment.",
      };
    case "permission":
      return {
        title: "Access Denied",
        description: "You don't have permission to access this resource.",
      };
    default:
      return {
        title: "Something went wrong",
        description: "An unexpected error occurred. Please try again.",
      };
  }
}

/**
 * Default error fallback UI component.
 * Can be used standalone or as the default fallback for ErrorBoundary.
 */
export function ErrorFallback({ error, reset, className }: ErrorFallbackProps) {
  const category = categorizeError(error);
  const Icon = getErrorIcon(category);
  const { title, description } = getErrorMessage(category);

  return (
    <div className={cn("flex items-center justify-center min-h-[200px] p-4", className)}>
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
            <Icon className="h-6 w-6 text-destructive" aria-hidden="true" />
          </div>
          <CardTitle>{title}</CardTitle>
          <CardDescription>
            {description}
          </CardDescription>
        </CardHeader>
        {error && process.env.NODE_ENV === "development" && (
          <CardContent>
            <div className="rounded-md bg-muted p-3">
              <p className="text-sm font-mono text-muted-foreground break-all">
                {error.message || "Unknown error"}
              </p>
            </div>
          </CardContent>
        )}
        <CardFooter className="flex justify-center gap-2">
          {reset && (
            <Button onClick={reset} variant="default">
              <RefreshCw className="mr-2 h-4 w-4" aria-hidden="true" />
              Try again
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}

interface PageErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
  title?: string;
  description?: string;
  showHomeButton?: boolean;
}

/**
 * Full-page error component for use in Next.js error.tsx files.
 * Provides a consistent error UI across the application.
 */
export function PageError({
  error,
  reset,
  title,
  description,
  showHomeButton = true,
}: PageErrorProps) {
  const category = categorizeError(error);
  const Icon = getErrorIcon(category);
  const defaultMessages = getErrorMessage(category);

  React.useEffect(() => {
    // Log the error to console in development
    console.error("Page error:", error);
  }, [error]);

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
            <Icon className="h-8 w-8 text-destructive" aria-hidden="true" />
          </div>
          <CardTitle className="text-2xl">{title || defaultMessages.title}</CardTitle>
          <CardDescription className="text-base">
            {description || defaultMessages.description}
          </CardDescription>
        </CardHeader>
        {process.env.NODE_ENV === "development" && error && (
          <CardContent>
            <details className="rounded-md bg-muted p-3">
              <summary className="cursor-pointer text-sm font-medium text-muted-foreground">
                Error details
              </summary>
              <pre className="mt-2 text-xs font-mono text-muted-foreground whitespace-pre-wrap break-all">
                {error.message}
                {error.digest && `\n\nDigest: ${error.digest}`}
                {error.stack && `\n\n${error.stack}`}
              </pre>
            </details>
          </CardContent>
        )}
        <CardFooter className="flex justify-center gap-3">
          <Button onClick={reset} variant="default">
            <RefreshCw className="mr-2 h-4 w-4" aria-hidden="true" />
            Try again
          </Button>
          {showHomeButton && (
            <Button variant="outline" asChild>
              <a href="/">
                <Home className="mr-2 h-4 w-4" aria-hidden="true" />
                Go home
              </a>
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}

interface InlineErrorProps {
  error: Error | null;
  reset?: () => void;
  className?: string;
}

/**
 * Compact inline error component for smaller UI sections.
 * Use this for errors in cards, list items, or other constrained spaces.
 */
export function InlineError({ error, reset, className }: InlineErrorProps) {
  const category = categorizeError(error);
  const Icon = getErrorIcon(category);
  const { title } = getErrorMessage(category);

  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-md border border-destructive/50 bg-destructive/10 p-3",
        className
      )}
      role="alert"
    >
      <Icon className="h-5 w-5 flex-shrink-0 text-destructive" aria-hidden="true" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-destructive">{title}</p>
        {error && process.env.NODE_ENV === "development" && (
          <p className="text-xs text-destructive/80 truncate">{error.message}</p>
        )}
      </div>
      {reset && (
        <Button
          onClick={reset}
          variant="ghost"
          size="sm"
          className="flex-shrink-0 text-destructive hover:text-destructive hover:bg-destructive/20"
        >
          <RefreshCw className="h-4 w-4" aria-hidden="true" />
          <span className="sr-only">Retry</span>
        </Button>
      )}
    </div>
  );
}

export default ErrorBoundary;
