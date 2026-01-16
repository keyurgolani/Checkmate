"use client";

/**
 * Visually Hidden Component
 *
 * Hides content visually while keeping it accessible to screen readers.
 * Useful for providing additional context to assistive technologies.
 *
 * Requirements: 13.3 - Proper ARIA labels for interactive elements
 */

import * as React from "react";
import { cn } from "@/lib/utils";

interface VisuallyHiddenProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Content to hide visually but keep accessible */
  children: React.ReactNode;
  /** Whether to render as a different element */
  as?: "span" | "div" | "p" | "h1" | "h2" | "h3" | "h4" | "h5" | "h6";
}

/**
 * VisuallyHidden - Hides content visually while keeping it accessible
 *
 * @example
 * <button>
 *   <Icon />
 *   <VisuallyHidden>Close dialog</VisuallyHidden>
 * </button>
 */
export function VisuallyHidden({
  children,
  as: Component = "span",
  className,
  ...props
}: VisuallyHiddenProps) {
  return (
    <Component
      className={cn("sr-only", className)}
      {...props}
    >
      {children}
    </Component>
  );
}

/**
 * FocusRing - A wrapper that adds a consistent focus ring to its children
 *
 * @example
 * <FocusRing>
 *   <div tabIndex={0}>Focusable content</div>
 * </FocusRing>
 */
interface FocusRingProps {
  children: React.ReactElement<{ className?: string }>;
  /** Whether to use inset focus ring */
  inset?: boolean;
}

export function FocusRing({ children, inset = false }: FocusRingProps) {
  return React.cloneElement(children, {
    className: cn(
      children.props.className,
      "focus-visible:outline-none",
      inset
        ? "focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
        : "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    ),
  } as { className: string });
}
