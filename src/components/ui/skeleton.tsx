/**
 * Skeleton Component
 *
 * A loading placeholder component that displays animated skeleton loaders.
 * Used to indicate content is loading while maintaining layout structure.
 *
 * Requirements: 12.1 - UI feedback within 200ms
 */

import * as React from "react";
import { cn } from "@/lib/utils";

// ============================================================================
// Base Skeleton Component
// ============================================================================

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Whether to animate the skeleton */
  animate?: boolean;
}

const Skeleton = React.forwardRef<HTMLDivElement, SkeletonProps>(
  ({ className, animate = true, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "rounded-lg bg-muted",
          animate && "animate-pulse",
          className
        )}
        aria-hidden="true"
        {...props}
      />
    );
  }
);

Skeleton.displayName = "Skeleton";

// ============================================================================
// Skeleton Text - For text content placeholders
// ============================================================================

interface SkeletonTextProps extends SkeletonProps {
  /** Number of lines to display */
  lines?: number;
  /** Width of the last line (percentage or fixed) */
  lastLineWidth?: string;
}

const SkeletonText = React.forwardRef<HTMLDivElement, SkeletonTextProps>(
  ({ className, lines = 1, lastLineWidth = "75%", animate = true, ...props }, ref) => {
    return (
      <div ref={ref} className={cn("space-y-2", className)} {...props}>
        {Array.from({ length: lines }).map((_, index) => (
          <Skeleton
            key={index}
            animate={animate}
            className="h-4"
            style={{
              width: index === lines - 1 && lines > 1 ? lastLineWidth : "100%",
            }}
          />
        ))}
      </div>
    );
  }
);

SkeletonText.displayName = "SkeletonText";

// ============================================================================
// Skeleton Card - For card content placeholders
// ============================================================================

interface SkeletonCardProps extends SkeletonProps {
  /** Whether to show header section */
  showHeader?: boolean;
  /** Whether to show footer section */
  showFooter?: boolean;
  /** Number of content lines */
  contentLines?: number;
}

const SkeletonCard = React.forwardRef<HTMLDivElement, SkeletonCardProps>(
  (
    {
      className,
      showHeader = true,
      showFooter = true,
      contentLines = 2,
      animate = true,
      ...props
    },
    ref
  ) => {
    return (
      <div
        ref={ref}
        className={cn(
          "rounded-xl border bg-card p-6 space-y-4",
          className
        )}
        {...props}
      >
        {showHeader && (
          <div className="flex items-start justify-between gap-2">
            <Skeleton animate={animate} className="h-6 w-3/4" />
            <Skeleton animate={animate} className="h-5 w-16 rounded-lg" />
          </div>
        )}
        <SkeletonText animate={animate} lines={contentLines} lastLineWidth="60%" />
        {showFooter && (
          <div className="flex items-center justify-between pt-2">
            <Skeleton animate={animate} className="h-4 w-20" />
            <Skeleton animate={animate} className="h-4 w-16" />
          </div>
        )}
      </div>
    );
  }
);

SkeletonCard.displayName = "SkeletonCard";

// ============================================================================
// Skeleton List Item - For list row placeholders
// ============================================================================

const SkeletonListItem = React.forwardRef<HTMLDivElement, SkeletonProps>(
  ({ className, animate = true, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "flex items-center justify-between p-4 border rounded-xl",
          className
        )}
        {...props}
      >
        <div className="flex-1 min-w-0 mr-4 space-y-2">
          <div className="flex items-center gap-2">
            <Skeleton animate={animate} className="h-5 w-48" />
            <Skeleton animate={animate} className="h-5 w-16 rounded-lg" />
          </div>
          <Skeleton animate={animate} className="h-4 w-32" />
        </div>
        <div className="flex items-center gap-4 flex-shrink-0">
          <Skeleton animate={animate} className="h-2 w-24 hidden sm:block" />
          <Skeleton animate={animate} className="h-4 w-12" />
        </div>
      </div>
    );
  }
);

SkeletonListItem.displayName = "SkeletonListItem";

// ============================================================================
// Skeleton Stat Card - For dashboard statistics
// ============================================================================

const SkeletonStatCard = React.forwardRef<HTMLDivElement, SkeletonProps>(
  ({ className, animate = true, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "rounded-xl border bg-card shadow p-6 space-y-2",
          className
        )}
        {...props}
      >
        <Skeleton animate={animate} className="h-4 w-24" />
        <Skeleton animate={animate} className="h-8 w-16" />
        <Skeleton animate={animate} className="h-3 w-32" />
      </div>
    );
  }
);

SkeletonStatCard.displayName = "SkeletonStatCard";

export { Skeleton, SkeletonText, SkeletonCard, SkeletonListItem, SkeletonStatCard };
