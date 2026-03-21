"use client";

import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import type { LucideIcon } from "lucide-react";

export interface BulkAction {
  label: string;
  icon: LucideIcon;
  action: () => void;
  variant?: "default" | "destructive";
}

interface BulkActionBarProps {
  selectedCount: number;
  actions: BulkAction[];
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onCancel: () => void;
  isAllSelected?: boolean;
  announcement?: string;
}

export function BulkActionBar({
  selectedCount,
  actions,
  onSelectAll,
  onDeselectAll,
  onCancel,
  isAllSelected = false,
  announcement = "",
}: BulkActionBarProps) {
  const nonDestructiveActions = actions.filter((a) => a.variant !== "destructive");
  const destructiveActions = actions.filter((a) => a.variant === "destructive");

  return (
    <>
      {/* Screen reader announcement - must be in DOM even when bar is hidden */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {announcement}
      </div>
      <AnimatePresence>
      {selectedCount > 0 && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border/50 bg-card/80 backdrop-blur-md shadow-lg"
          role="toolbar"
          aria-label={`Bulk actions for ${selectedCount} selected items`}
        >
          <span className="text-sm font-semibold whitespace-nowrap">
            {selectedCount} selected
          </span>

          <Separator orientation="vertical" className="h-5" />

          <Button
            variant="ghost"
            size="sm"
            className="text-xs h-8"
            onClick={isAllSelected ? onDeselectAll : onSelectAll}
          >
            {isAllSelected ? "Deselect All" : "Select All"}
          </Button>

          {nonDestructiveActions.length > 0 && (
            <>
              <Separator orientation="vertical" className="h-5" />
              {nonDestructiveActions.map((action) => {
                const Icon = action.icon;
                return (
                  <Button
                    key={action.label}
                    variant="ghost"
                    size="sm"
                    className="text-xs h-8 gap-1.5"
                    onClick={() => action.action()}
                  >
                    <Icon className="size-3.5" />
                    <span className="hidden sm:inline">{action.label}</span>
                  </Button>
                );
              })}
            </>
          )}

          {destructiveActions.length > 0 && (
            <>
              <Separator orientation="vertical" className="h-5" />
              {destructiveActions.map((action) => {
                const Icon = action.icon;
                return (
                  <Button
                    key={action.label}
                    variant="ghost"
                    size="sm"
                    className="text-xs h-8 gap-1.5 text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => action.action()}
                  >
                    <Icon className="size-3.5" />
                    <span className="hidden sm:inline">{action.label}</span>
                  </Button>
                );
              })}
            </>
          )}

          <Separator orientation="vertical" className="h-5" />

          <Button
            variant="ghost"
            size="sm"
            className="text-xs h-8 text-muted-foreground"
            onClick={onCancel}
          >
            <X className="size-3.5" />
          </Button>
        </motion.div>
      )}
      </AnimatePresence>
    </>
  );
}
