"use client";

/**
 * Spinner Component
 *
 * A loading spinner component for indicating action progress.
 * Used for button loading states and inline loading indicators.
 *
 * Requirements: 12.1 - UI feedback within 200ms
 */

import * as React from "react";
import { cn } from "@/lib/utils";

// ============================================================================
// Types
// ============================================================================

export interface SpinnerProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Size of the spinner */
  size?: "xs" | "sm" | "md" | "lg";
  /** Color variant */
  variant?: "default" | "primary" | "muted";
  /** Accessible label for screen readers */
  label?: string;
}

// ============================================================================
// Spinner Component
// ============================================================================

const Spinner = React.forwardRef<HTMLDivElement, SpinnerProps>(
  (
    {
      className,
      size = "md",
      variant = "default",
      label = "Loading",
      ...props
    },
    ref
  ) => {
    const sizeClasses = {
      xs: "h-3 w-3 border",
      sm: "h-4 w-4 border-2",
      md: "h-6 w-6 border-2",
      lg: "h-8 w-8 border-2",
    };

    const variantClasses = {
      default: "border-current border-t-transparent",
      primary: "border-primary border-t-transparent",
      muted: "border-muted-foreground/30 border-t-muted-foreground",
    };

    return (
      <div
        ref={ref}
        role="status"
        aria-label={label}
        className={cn("inline-flex items-center justify-center", className)}
        {...props}
      >
        <div
          className={cn(
            "rounded-full animate-spin",
            sizeClasses[size],
            variantClasses[variant]
          )}
        />
        <span className="sr-only">{label}</span>
      </div>
    );
  }
);

Spinner.displayName = "Spinner";

// ============================================================================
// Loading Overlay - For full container loading states
// ============================================================================

interface LoadingOverlayProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Whether the overlay is visible */
  isLoading?: boolean;
  /** Text to display below the spinner */
  text?: string;
  /** Spinner size */
  spinnerSize?: SpinnerProps["size"];
}

const LoadingOverlay = React.forwardRef<HTMLDivElement, LoadingOverlayProps>(
  (
    {
      className,
      isLoading = true,
      text,
      spinnerSize = "lg",
      children,
      ...props
    },
    ref
  ) => {
    if (!isLoading) {
      return <>{children}</>;
    }

    return (
      <div ref={ref} className={cn("relative", className)} {...props}>
        {children && (
          <div className="opacity-50 pointer-events-none">{children}</div>
        )}
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm">
          <Spinner size={spinnerSize} variant="primary" />
          {text && (
            <p className="mt-2 text-sm text-muted-foreground">{text}</p>
          )}
        </div>
      </div>
    );
  }
);

LoadingOverlay.displayName = "LoadingOverlay";

// ============================================================================
// Button Spinner - Inline spinner for buttons
// ============================================================================

interface ButtonSpinnerProps {
  /** Whether to show the spinner */
  isLoading?: boolean;
  /** Children to show when not loading */
  children: React.ReactNode;
  /** Loading text (optional) */
  loadingText?: string;
}

function ButtonSpinner({
  isLoading = false,
  children,
  loadingText,
}: ButtonSpinnerProps) {
  if (!isLoading) {
    return <>{children}</>;
  }

  return (
    <span className="inline-flex items-center gap-2">
      <Spinner size="xs" />
      {loadingText && <span>{loadingText}</span>}
    </span>
  );
}

export { Spinner, LoadingOverlay, ButtonSpinner };

// ============================================================================
// Action Progress Indicator - For showing progress during async operations
// ============================================================================

interface ActionProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Current step (1-indexed) */
  currentStep?: number;
  /** Total number of steps */
  totalSteps?: number;
  /** Status message to display */
  message?: string;
  /** Whether the action is in progress */
  isLoading?: boolean;
}

const ActionProgress = React.forwardRef<HTMLDivElement, ActionProgressProps>(
  (
    {
      className,
      currentStep = 1,
      totalSteps = 1,
      message = "Processing...",
      isLoading = true,
      ...props
    },
    ref
  ) => {
    if (!isLoading) return null;

    const progress = totalSteps > 1 ? Math.round((currentStep / totalSteps) * 100) : undefined;

    return (
      <div
        ref={ref}
        role="status"
        aria-live="polite"
        className={cn(
          "flex items-center gap-3 rounded-md border bg-muted/50 p-3",
          className
        )}
        {...props}
      >
        <Spinner size="sm" variant="primary" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{message}</p>
          {totalSteps > 1 && (
            <p className="text-xs text-muted-foreground">
              Step {currentStep} of {totalSteps}
              {progress !== undefined && ` (${progress}%)`}
            </p>
          )}
        </div>
      </div>
    );
  }
);

ActionProgress.displayName = "ActionProgress";

export { ActionProgress };
