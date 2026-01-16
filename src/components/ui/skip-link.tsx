/**
 * Skip Link Component
 *
 * Provides a skip link for keyboard users to bypass navigation
 * and jump directly to main content.
 *
 * Requirements: 13.2 - Keyboard navigation support
 */

"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface SkipLinkProps {
  /** The ID of the element to skip to */
  targetId?: string;
  /** Custom text for the skip link */
  children?: React.ReactNode;
  /** Additional CSS classes */
  className?: string;
}

/**
 * SkipLink component that becomes visible on focus
 * Allows keyboard users to skip repetitive navigation
 */
export function SkipLink({
  targetId = "main-content",
  children = "Skip to main content",
  className,
}: SkipLinkProps) {
  const handleClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    const target = document.getElementById(targetId);
    if (target) {
      // Set tabindex to make the element focusable if it isn't already
      if (!target.hasAttribute("tabindex")) {
        target.setAttribute("tabindex", "-1");
      }
      target.focus();
      // Scroll the element into view
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <a
      href={`#${targetId}`}
      onClick={handleClick}
      className={cn(
        // Visually hidden by default
        "sr-only",
        // Visible when focused
        "focus:not-sr-only focus:absolute focus:z-[100]",
        "focus:top-4 focus:left-4",
        "focus:px-4 focus:py-2",
        "focus:bg-primary focus:text-primary-foreground",
        "focus:rounded-md focus:shadow-lg",
        "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
        "focus:font-medium focus:text-sm",
        className
      )}
    >
      {children}
    </a>
  );
}

/**
 * SkipLinks component that provides multiple skip links
 */
interface SkipLinksProps {
  links?: Array<{
    targetId: string;
    label: string;
  }>;
}

export function SkipLinks({ links }: SkipLinksProps) {
  const defaultLinks = [
    { targetId: "main-content", label: "Skip to main content" },
    { targetId: "main-navigation", label: "Skip to navigation" },
  ];

  const skipLinks = links || defaultLinks;

  return (
    <div className="skip-links">
      {skipLinks.map((link) => (
        <SkipLink key={link.targetId} targetId={link.targetId}>
          {link.label}
        </SkipLink>
      ))}
    </div>
  );
}
