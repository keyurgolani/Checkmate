"use client";

/**
 * View Toggle Component
 * 
 * Consistent toggle for switching between grid and list views.
 * Uses rounded pill design matching the dashboard aesthetic.
 */

import { Grid3X3, List } from "lucide-react";
import { cn } from "@/lib/utils";

interface ViewToggleProps {
  viewMode: "grid" | "list";
  onViewModeChange: (mode: "grid" | "list") => void;
  className?: string;
}

export function ViewToggle({ viewMode, onViewModeChange, className }: ViewToggleProps) {
  return (
    <div className={cn(
      "flex items-center bg-muted/50 rounded-xl p-1 backdrop-blur-sm",
      className
    )}>
      <button
        onClick={() => onViewModeChange("grid")}
        className={cn(
          "p-2 rounded-lg transition-all duration-200",
          viewMode === "grid"
            ? "bg-background text-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground"
        )}
        title="Grid view"
        aria-label="Grid view"
        aria-pressed={viewMode === "grid"}
      >
        <Grid3X3 className="h-4 w-4" />
      </button>
      <button
        onClick={() => onViewModeChange("list")}
        className={cn(
          "p-2 rounded-lg transition-all duration-200",
          viewMode === "list"
            ? "bg-background text-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground"
        )}
        title="List view"
        aria-label="List view"
        aria-pressed={viewMode === "list"}
      >
        <List className="h-4 w-4" />
      </button>
    </div>
  );
}
