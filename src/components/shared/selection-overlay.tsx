"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

interface SelectionOverlayProps extends React.HTMLAttributes<HTMLDivElement> {
  isSelectionMode: boolean;
  isSelected: boolean;
  children: React.ReactNode;
  className?: string;
}

export const SelectionOverlay = React.forwardRef<HTMLDivElement, SelectionOverlayProps>(
  function SelectionOverlay(
    { isSelectionMode, isSelected, children, className, ...props },
    ref
  ) {
    return (
      <div
        ref={ref}
        className={cn(
          "relative",
          isSelectionMode && "transition-opacity duration-150",
          isSelectionMode && (isSelected ? "opacity-100" : "opacity-50"),
          isSelectionMode && isSelected && "bg-primary/[0.06] rounded-[var(--radius)]",
          className
        )}
        aria-selected={isSelectionMode ? isSelected : undefined}
        {...props}
      >
        {children}

        {isSelectionMode && isSelected && (
          <div className="absolute -top-1.5 -right-1.5 z-20 size-5 rounded-full bg-primary flex items-center justify-center shadow-sm">
            <Check className="size-3 text-primary-foreground" strokeWidth={3} />
          </div>
        )}
      </div>
    );
  }
);
