"use client";

/**
 * DescriptionPreview Component
 *
 * A reusable component for displaying truncated description text with
 * consistent styling and accessibility support. Supports markdown content.
 *
 * Requirements: 1.1, 1.2, 1.3, 1.4, 5.1, 6.1
 * - Display truncated preview of descriptions
 * - Return null for null, empty, or whitespace-only descriptions
 * - Truncate text longer than 100 characters with ellipsis
 * - Use muted styling to maintain visual hierarchy
 * - Include appropriate ARIA labels for screen readers
 * - Match styling with ChecklistTracker description display (Info icon)
 * 
 * Note: Full description is shown when the parent step is expanded (click to expand).
 */

import * as React from "react";
import { Info } from "lucide-react";
import { cn } from "@/lib/utils";

// ============================================================================
// Types
// ============================================================================

export interface DescriptionPreviewProps {
  /** The description text to display (may contain markdown) */
  description: string | null;
  /** Maximum length before truncation (default: 100) */
  maxLength?: number;
  /** Additional CSS classes */
  className?: string;
  /** Whether to show the Info icon (default: true for consistency with ChecklistTracker) */
  showIcon?: boolean;
}

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_MAX_LENGTH = 100;

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Checks if a description is empty or contains only whitespace
 */
function isEmptyDescription(description: string | null): boolean {
  if (description === null) {
    return true;
  }
  return description.trim().length === 0;
}

/**
 * Strips markdown formatting from text for plain text preview
 */
function stripMarkdown(text: string): string {
  return text
    .replace(/#{1,6}\s/g, "") // Headers
    .replace(/\*\*([^*]+)\*\*/g, "$1") // Bold
    .replace(/\*([^*]+)\*/g, "$1") // Italic
    .replace(/__([^_]+)__/g, "$1") // Bold alt
    .replace(/_([^_]+)_/g, "$1") // Italic alt
    .replace(/`([^`]+)`/g, "$1") // Inline code
    .replace(/```[\s\S]*?```/g, "") // Code blocks
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1") // Links
    .replace(/^\s*[-*+]\s/gm, "") // List items
    .replace(/^\s*\d+\.\s/gm, "") // Numbered lists
    .replace(/>\s/g, "") // Blockquotes
    .replace(/\n+/g, " ") // Newlines to spaces
    .trim();
}

/**
 * Truncates text to the specified length and adds ellipsis if needed
 */
function truncateText(text: string, maxLength: number): string {
  const stripped = stripMarkdown(text);
  if (stripped.length <= maxLength) {
    return stripped;
  }
  return stripped.slice(0, maxLength) + "…";
}

// ============================================================================
// Component
// ============================================================================

/**
 * Displays a truncated preview of a description with muted styling.
 * Returns null when description is null, empty, or whitespace-only.
 * Includes Info icon for consistency with ChecklistTracker (Requirement 5.1).
 *
 * Accessibility (Requirement 6.1):
 * - Uses role="note" to indicate supplementary information
 * - aria-label on the container describes the content for screen readers
 * - Indicates truncation status in the aria-label
 * - Decorative icon is hidden from screen readers
 */
export function DescriptionPreview({
  description,
  maxLength = DEFAULT_MAX_LENGTH,
  className,
  showIcon = true,
}: DescriptionPreviewProps): React.ReactElement | null {
  // Return null for null, empty, or whitespace-only descriptions
  // Requirements: 1.2
  if (isEmptyDescription(description)) {
    return null;
  }

  const displayText = truncateText(description!, maxLength);
  const fullText = description!.trim();
  const strippedText = stripMarkdown(fullText);
  const isTruncated = strippedText.length > maxLength;

  // Build accessible label that indicates truncation status
  // This helps screen reader users understand they're hearing a preview
  const accessibleLabel = isTruncated
    ? `Step description (truncated): ${displayText}`
    : `Step description: ${displayText}`;

  return (
    <div
      role="note"
      className={cn(
        "flex items-start gap-2 text-sm text-muted-foreground",
        className
      )}
      aria-label={accessibleLabel}
    >
      {showIcon && (
        <Info className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" aria-hidden="true" />
      )}
      <p className="leading-relaxed" aria-hidden="true">
        {displayText}
      </p>
    </div>
  );
}
