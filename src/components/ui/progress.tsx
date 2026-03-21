"use client";

/**
 * Progress Component
 *
 * A reusable progress bar component with customizable appearance.
 * Supports different sizes, colors, and animated transitions.
 *
 * Requirements: 6.2, 6.3, 6.4
 * - Display visual progress indicators
 * - Support completion percentage display
 */

import * as React from "react";
import { cn } from "@/lib/utils";

// ============================================================================
// Types
// ============================================================================

export interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Progress value from 0 to 100 */
  value: number;
  /** Size variant of the progress bar */
  size?: "sm" | "md" | "lg";
  /** Whether to show the progress as complete (green color) */
  isComplete?: boolean;
  /** Whether to show a glowing animation effect */
  animated?: boolean;
  /** Custom color class for the progress indicator */
  indicatorClassName?: string;
  /** Accessible label for the progress bar */
  "aria-label"?: string;
}

// ============================================================================
// Progress Component
// ============================================================================

const Progress = React.forwardRef<HTMLDivElement, ProgressProps>(
  (
    {
      className,
      value,
      size = "md",
      isComplete = false,
      animated = false,
      indicatorClassName,
      "aria-label": ariaLabel,
      ...props
    },
    ref
  ) => {
    // Clamp value between 0 and 100
    const clampedValue = Math.min(100, Math.max(0, value));

    // Size classes
    const sizeClasses = {
      sm: "h-1.5",
      md: "h-2.5",
      lg: "h-4",
    };

    // Determine indicator color
    const indicatorColor = isComplete
      ? "bg-green-500 dark:bg-green-400"
      : "bg-primary";

    return (
      <div
        ref={ref}
        role="progressbar"
        aria-valuenow={clampedValue}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={ariaLabel || `Progress: ${Math.round(clampedValue)}%`}
        className={cn(
          "relative w-full overflow-hidden rounded-full bg-secondary/20",
          sizeClasses[size],
          className
        )}
        {...props}
      >
        <div
          className={cn(
            "h-full rounded-full transition-all duration-300 ease-in-out",
            indicatorColor,
            indicatorClassName
          )}
          style={{ width: `${clampedValue}%` }}
        />
        {animated && clampedValue > 0 && (
          <div
            className="absolute inset-0 rounded-full overflow-hidden"
            style={{ width: `${clampedValue}%` }}
          >
            <div className="animate-progress-glow absolute inset-0 rounded-full" />
          </div>
        )}
      </div>
    );
  }
);

Progress.displayName = "Progress";

export { Progress };
