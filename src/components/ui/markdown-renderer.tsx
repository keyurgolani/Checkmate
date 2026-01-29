"use client";

/**
 * Markdown Renderer Component
 *
 * Renders markdown content with consistent styling.
 * Used for template and checklist item descriptions.
 */

import ReactMarkdown from "react-markdown";
import { cn } from "@/lib/utils";

interface MarkdownRendererProps {
  /** The markdown content to render */
  content: string;
  /** Additional CSS classes */
  className?: string;
  /** Whether to use compact styling (smaller text, tighter spacing) */
  compact?: boolean;
}

export function MarkdownRenderer({
  content,
  className,
  compact = false,
}: MarkdownRendererProps) {
  return (
    <div
      className={cn(
        "prose prose-sm dark:prose-invert max-w-none",
        compact && "prose-compact",
        // Override default prose styles for better integration
        "[&>*:first-child]:mt-0 [&>*:last-child]:mb-0",
        "[&_p]:my-1.5",
        "[&_ul]:my-1.5 [&_ul]:pl-4",
        "[&_ol]:my-1.5 [&_ol]:pl-4",
        "[&_li]:my-0.5",
        "[&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded [&_code]:bg-muted [&_code]:text-xs",
        "[&_pre]:my-2 [&_pre]:p-2 [&_pre]:rounded-md [&_pre]:bg-muted",
        "[&_a]:text-primary [&_a]:no-underline hover:[&_a]:underline",
        "[&_strong]:font-semibold",
        "[&_h1]:text-base [&_h1]:font-semibold [&_h1]:mt-3 [&_h1]:mb-1.5",
        "[&_h2]:text-sm [&_h2]:font-semibold [&_h2]:mt-2.5 [&_h2]:mb-1",
        "[&_h3]:text-sm [&_h3]:font-medium [&_h3]:mt-2 [&_h3]:mb-1",
        "[&_blockquote]:border-l-2 [&_blockquote]:border-muted-foreground/30 [&_blockquote]:pl-3 [&_blockquote]:italic [&_blockquote]:text-muted-foreground",
        className
      )}
    >
      <ReactMarkdown>{content}</ReactMarkdown>
    </div>
  );
}
