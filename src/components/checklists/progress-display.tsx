"use client";

/**
 * Progress Display Component
 *
 * A comprehensive progress visualization component that displays:
 * - Progress bar with visual indicator
 * - Completion percentage
 * - Completed/total item count
 *
 * Supports nested items and referenced checklist progress calculations.
 *
 * Requirements: 6.2, 6.3, 6.4
 * - Calculate completion percentage based on all nested items
 * - Include referenced checklist progress in calculations
 * - Display visual progress indicators (progress bar, percentage, completed/total count)
 */

import * as React from "react";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, Circle, ListChecks } from "lucide-react";

// ============================================================================
// Types
// ============================================================================

export interface ProgressDisplayProps {
  /** Number of completed items */
  completedItems: number;
  /** Total number of items */
  totalItems: number;
  /** Progress percentage (0-100). If not provided, calculated from completedItems/totalItems */
  percentage?: number;
  /** Whether the checklist is complete */
  isComplete?: boolean;
  /** Size variant */
  size?: "sm" | "md" | "lg";
  /** Whether to show the item count */
  showCount?: boolean;
  /** Whether to show the percentage */
  showPercentage?: boolean;
  /** Whether to show the progress bar */
  showBar?: boolean;
  /** Layout orientation */
  layout?: "horizontal" | "vertical";
  /** Additional class name */
  className?: string;
}

// ============================================================================
// Progress Circle Component (for compact display)
// ============================================================================

interface ProgressCircleProps {
  percentage: number;
  isComplete: boolean;
  size?: "sm" | "md" | "lg";
}

function ProgressCircle({ percentage, isComplete, size = "md" }: ProgressCircleProps) {
  const sizeConfig = {
    sm: { dimension: 32, strokeWidth: 3, fontSize: "text-[8px]" },
    md: { dimension: 48, strokeWidth: 4, fontSize: "text-xs" },
    lg: { dimension: 64, strokeWidth: 5, fontSize: "text-sm" },
  };

  const config = sizeConfig[size];
  const radius = (config.dimension - config.strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg
        width={config.dimension}
        height={config.dimension}
        className="transform -rotate-90"
        aria-hidden="true"
      >
        {/* Background circle */}
        <circle
          cx={config.dimension / 2}
          cy={config.dimension / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={config.strokeWidth}
          className="text-secondary"
        />
        {/* Progress circle */}
        <circle
          cx={config.dimension / 2}
          cy={config.dimension / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={config.strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          className={cn(
            "transition-all duration-300 ease-in-out",
            isComplete ? "text-green-500 dark:text-green-400" : "text-primary"
          )}
        />
      </svg>
      <span
        className={cn(
          "absolute font-medium",
          config.fontSize,
          isComplete ? "text-green-600 dark:text-green-400" : "text-foreground"
        )}
      >
        {Math.round(percentage)}%
      </span>
    </div>
  );
}

// ============================================================================
// Progress Stats Component
// ============================================================================

interface ProgressStatsProps {
  completedItems: number;
  totalItems: number;
  percentage: number;
  isComplete: boolean;
  showCount: boolean;
  showPercentage: boolean;
  size: "sm" | "md" | "lg";
}

function ProgressStats({
  completedItems,
  totalItems,
  percentage,
  isComplete,
  showCount,
  showPercentage,
  size,
}: ProgressStatsProps) {
  const textSizeClass = {
    sm: "text-xs",
    md: "text-sm",
    lg: "text-base",
  };

  const iconSizeClass = {
    sm: "h-3 w-3",
    md: "h-4 w-4",
    lg: "h-5 w-5",
  };

  return (
    <div className={cn("flex items-center gap-3", textSizeClass[size])}>
      {showCount && (
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <ListChecks className={iconSizeClass[size]} aria-hidden="true" />
          <span>
            <span className={isComplete ? "text-green-600 dark:text-green-400 font-medium" : "font-medium"}>
              {completedItems}
            </span>
            <span className="mx-0.5">/</span>
            <span>{totalItems}</span>
          </span>
        </div>
      )}
      {showPercentage && (
        <div
          className={cn(
            "flex items-center gap-1",
            isComplete ? "text-green-600 dark:text-green-400" : ""
          )}
        >
          {isComplete ? (
            <CheckCircle2 className={iconSizeClass[size]} aria-hidden="true" />
          ) : (
            <Circle className={iconSizeClass[size]} aria-hidden="true" />
          )}
          <span className="font-medium">{Math.round(percentage)}%</span>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Progress Display Component
// ============================================================================

export function ProgressDisplay({
  completedItems,
  totalItems,
  percentage: providedPercentage,
  isComplete: providedIsComplete,
  size = "md",
  showCount = true,
  showPercentage = true,
  showBar = true,
  layout = "vertical",
  className,
}: ProgressDisplayProps) {
  // Calculate percentage if not provided
  const percentage = providedPercentage ?? (totalItems > 0 ? (completedItems / totalItems) * 100 : 0);

  // Determine if complete
  const isComplete = providedIsComplete ?? percentage >= 100;

  // Progress bar size mapping
  const barSize = {
    sm: "sm" as const,
    md: "md" as const,
    lg: "lg" as const,
  };

  if (layout === "horizontal") {
    return (
      <div className={cn("flex items-center gap-4", className)}>
        {showBar && (
          <div className="flex-1 min-w-[100px]">
            <Progress
              value={percentage}
              size={barSize[size]}
              isComplete={isComplete}
              aria-label={`Progress: ${Math.round(percentage)}% complete, ${completedItems} of ${totalItems} items`}
            />
          </div>
        )}
        <ProgressStats
          completedItems={completedItems}
          totalItems={totalItems}
          percentage={percentage}
          isComplete={isComplete}
          showCount={showCount}
          showPercentage={showPercentage}
          size={size}
        />
      </div>
    );
  }

  // Vertical layout (default)
  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between">
        <ProgressStats
          completedItems={completedItems}
          totalItems={totalItems}
          percentage={percentage}
          isComplete={isComplete}
          showCount={showCount}
          showPercentage={showPercentage}
          size={size}
        />
      </div>
      {showBar && (
        <Progress
          value={percentage}
          size={barSize[size]}
          isComplete={isComplete}
          aria-label={`Progress: ${Math.round(percentage)}% complete, ${completedItems} of ${totalItems} items`}
        />
      )}
    </div>
  );
}

// ============================================================================
// Compact Progress Display (Circle variant)
// ============================================================================

export interface CompactProgressDisplayProps {
  /** Number of completed items */
  completedItems: number;
  /** Total number of items */
  totalItems: number;
  /** Progress percentage (0-100). If not provided, calculated from completedItems/totalItems */
  percentage?: number;
  /** Whether the checklist is complete */
  isComplete?: boolean;
  /** Size variant */
  size?: "sm" | "md" | "lg";
  /** Whether to show the item count below the circle */
  showCount?: boolean;
  /** Additional class name */
  className?: string;
}

export function CompactProgressDisplay({
  completedItems,
  totalItems,
  percentage: providedPercentage,
  isComplete: providedIsComplete,
  size = "md",
  showCount = true,
  className,
}: CompactProgressDisplayProps) {
  const percentage = providedPercentage ?? (totalItems > 0 ? (completedItems / totalItems) * 100 : 0);
  const isComplete = providedIsComplete ?? percentage >= 100;

  const textSizeClass = {
    sm: "text-[10px]",
    md: "text-xs",
    lg: "text-sm",
  };

  return (
    <div className={cn("flex flex-col items-center gap-1", className)}>
      <ProgressCircle percentage={percentage} isComplete={isComplete} size={size} />
      {showCount && (
        <span className={cn("text-muted-foreground", textSizeClass[size])}>
          {completedItems}/{totalItems}
        </span>
      )}
    </div>
  );
}
