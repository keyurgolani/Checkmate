"use client";

/**
 * ResourceIndicator Component
 *
 * A reusable component for displaying a resource count indicator with
 * a tooltip showing resource titles. Provides keyboard accessibility
 * for the tooltip trigger.
 *
 * Requirements: 2.1, 2.2, 2.3, 2.4, 6.2
 * - Display link icon with resource count badge
 * - Return null when resources array is empty or null
 * - Show tooltip with all resource titles on hover
 * - Ensure keyboard accessibility for tooltip trigger
 */

import * as React from "react";
import { Link as LinkIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { ResourceLink } from "@/lib/pocketbase-types";

// ============================================================================
// Types
// ============================================================================

export interface ResourceIndicatorProps {
  /** Array of resource links to display */
  resources: ResourceLink[] | null | undefined;
  /** Additional CSS classes */
  className?: string;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Checks if resources array is empty or null/undefined
 */
function isEmptyResources(
  resources: ResourceLink[] | null | undefined
): boolean {
  if (resources === null || resources === undefined) {
    return true;
  }
  return resources.length === 0;
}

// ============================================================================
// Component
// ============================================================================

/**
 * Displays a resource count indicator with a tooltip showing resource titles.
 * Returns null when resources is null, undefined, or an empty array.
 *
 * The tooltip trigger is keyboard accessible via tabIndex for screen reader
 * and keyboard navigation support.
 */
export function ResourceIndicator({
  resources,
  className,
}: ResourceIndicatorProps): React.ReactElement | null {
  // Return null for null, undefined, or empty resources array
  // Requirements: 2.2
  if (isEmptyResources(resources)) {
    return null;
  }

  const resourceCount = resources!.length;
  const resourceTitles = resources!.map((r) => r.title || r.url);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          className={cn(
            // Consistent styling with ChecklistTracker resource links
            // Uses same gap, padding, border-radius, and color scheme
            "inline-flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-lg",
            "bg-primary/10 text-primary hover:bg-primary/20",
            "transition-colors duration-200",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-offset-1",
            className
          )}
          aria-label={`${resourceCount} resource${resourceCount !== 1 ? "s" : ""} attached`}
        >
          <LinkIcon className="h-3 w-3" aria-hidden="true" />
          <span>{resourceCount}</span>
        </button>
      </TooltipTrigger>
      <TooltipContent
        side="top"
        className="max-w-xs"
        role="tooltip"
      >
        <div className="space-y-1">
          <p className="font-medium text-xs">
            {resourceCount} Resource{resourceCount !== 1 ? "s" : ""}
          </p>
          <ul className="text-xs space-y-0.5">
            {resourceTitles.map((title, index) => (
              <li key={index} className="truncate">
                • {title}
              </li>
            ))}
          </ul>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
