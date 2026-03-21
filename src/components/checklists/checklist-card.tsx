"use client";

/**
 * Checklist Card Component
 *
 * Displays a single checklist with progress bar and completion status.
 * Uses consistent design language with hover effects and animations.
 * Supports context menus and selection mode for bulk actions.
 *
 * Requirements: 6.4, 6.7 - Display progress indicators and completion status
 */

import { motion } from "framer-motion";
import { Progress } from "@/components/ui/progress";
import { formatDate } from "@/lib/utils";
import { CheckCircle2, Circle, Clock, RefreshCw } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { EntityContextMenu, type ContextMenuItemConfig } from "@/components/shared/entity-context-menu";
import { SelectionOverlay } from "@/components/shared/selection-overlay";
import { useLongPress } from "@/lib/hooks/use-long-press";

export interface ChecklistCardData {
  id: string;
  name: string;
  templateId: string;
  templateTitle: string;
  progress: number;
  isSynced: boolean;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface ChecklistCardProps {
  checklist: ChecklistCardData;
  viewMode?: "grid" | "list";
  contextMenuItems?: ContextMenuItemConfig<ChecklistCardData>[];
  isSelectionMode?: boolean;
  isSelected?: boolean;
  onSelectionClick?: (id: string, event: React.MouseEvent) => void;
  onSelect?: (id: string) => void;
  onEnterSelectionMode?: (id: string) => void;
}

function StatusBadge({ isComplete, isSynced }: { isComplete: boolean; isSynced: boolean }) {
  if (isComplete) {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700 dark:bg-green-500/10 dark:text-green-400 border border-emerald-200 dark:border-green-500/20">
        <CheckCircle2 className="h-3.5 w-3.5" />
        Complete
      </span>
    );
  }

  if (!isSynced) {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20">
        <RefreshCw className="h-3 w-3" />
        Modified
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400 border border-blue-200 dark:border-blue-500/20">
      <Circle className="h-3 w-3 fill-current opacity-50" />
      In Progress
    </span>
  );
}

export function ChecklistCard({
  checklist,
  viewMode = "grid",
  contextMenuItems,
  isSelectionMode = false,
  isSelected = false,
  onSelectionClick,
  onSelect,
  onEnterSelectionMode,
}: ChecklistCardProps) {
  const longPressHandlers = useLongPress({
    onLongPress: () => onEnterSelectionMode?.(checklist.id),
    disabled: isSelectionMode || !onEnterSelectionMode,
  });

  const progress = checklist.progress ?? 0;
  const isComplete = checklist.completedAt !== null && progress >= 100;
  const formattedDate = formatDate(checklist.updatedAt);
  const completedDate = checklist.completedAt ? formatDate(checklist.completedAt) : null;

  const listContent = (
    <motion.div
      whileHover={isSelectionMode ? undefined : { x: 4 }}
      data-slot="card"
      className={cn(
        "card flex items-center justify-between p-4 rounded-[var(--radius)] border bg-card relative overflow-hidden",
        "transition-all duration-300 hover:border-primary/20",
        isSelectionMode && "cursor-pointer",
      )}
    >
      {/* Status Indicator Strip */}
      <div className={cn(
        "absolute left-0 top-0 bottom-0 w-1 transition-colors",
        isComplete ? "bg-green-500" : "bg-transparent group-hover:bg-primary"
      )} />
      <div className="flex-1 min-w-0 mr-4">
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-1">
          <h3 className="font-semibold truncate group-hover:text-primary transition-colors">
            {checklist.name}
          </h3>
          <StatusBadge isComplete={isComplete} isSynced={checklist.isSynced} />
        </div>
        <p className="text-sm text-muted-foreground truncate">
          From: {checklist.templateTitle}
        </p>
      </div>
      <div className="flex items-center gap-6 flex-shrink-0">
        <div className="w-32 hidden sm:block">
          <Progress value={progress} size="sm" isComplete={isComplete} />
        </div>
        <span className={cn(
          "text-lg font-bold min-w-[3.5rem] text-right tabular-nums",
          isComplete ? "text-green-500" : "text-primary"
        )}>
          {Math.round(progress)}%
        </span>
        <span className="hidden md:inline text-sm text-muted-foreground">
          {formattedDate}
        </span>
      </div>
    </motion.div>
  );

  const gridContent = (
    <motion.div
      whileHover={isSelectionMode ? undefined : { y: -4 }}
      transition={{ type: "spring", stiffness: 300 }}
      data-slot="card"
      className={cn(
        "card relative h-full rounded-[var(--radius)] border bg-card p-6 overflow-hidden",
        "transition-all duration-300 hover:-translate-y-1 hover:border-primary/20",
        "group",
        isSelectionMode && "cursor-pointer",
      )}
    >
      {/* Status Indicator Strip */}
      <div className={cn(
        "absolute left-0 top-0 bottom-0 w-1 transition-colors",
        isComplete ? "bg-green-500" : "bg-transparent group-hover:bg-primary"
      )} />
      {/* Gradient glow */}
      <div className={cn(
        "absolute top-0 right-0 w-24 h-24 -mr-8 -mt-8 rounded-full blur-xl transition-colors",
        isComplete
          ? "bg-gradient-to-bl from-green-500/10 to-transparent group-hover:from-green-500/20"
          : "bg-gradient-to-bl from-primary/10 to-transparent group-hover:from-primary/20"
      )} />

      <div className="relative z-10">
        <div className="flex items-start justify-between gap-2 mb-3">
          <h3 className="font-semibold text-lg line-clamp-2 group-hover:text-primary transition-colors">
            {checklist.name}
          </h3>
          <StatusBadge isComplete={isComplete} isSynced={checklist.isSynced} />
        </div>

        <p className="text-sm text-muted-foreground mb-4 truncate">
          From: {checklist.templateTitle}
        </p>

        {/* Progress Section */}
        <div className="space-y-2 mb-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Progress</span>
            <span className={cn(
              "font-bold tabular-nums",
              isComplete ? "text-green-500" : "text-primary"
            )}>
              {Math.round(progress)}%
            </span>
          </div>
          <div className="relative">
            <Progress value={progress} size="sm" isComplete={isComplete} />
            {!isComplete && progress > 0 && (
              <div
                className="absolute inset-0 overflow-hidden rounded-full"
                style={{ width: `${progress}%` }}
              >
                <div className="absolute inset-0 animate-progress-glow" />
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Clock className="h-3 w-3" />
          <span>
            {isComplete && completedDate
              ? `Completed ${completedDate}`
              : `Updated ${formattedDate}`}
          </span>
        </div>
      </div>
    </motion.div>
  );

  const innerContent = viewMode === "list" ? listContent : gridContent;

  // Wrap with SelectionOverlay
  const withSelection = (
    <SelectionOverlay isSelectionMode={isSelectionMode} isSelected={isSelected}>
      {innerContent}
    </SelectionOverlay>
  );

  // In selection mode, replace Link with a clickable div
  const wrapped = isSelectionMode ? (
    <div
      className={viewMode === "grid" ? "block h-full group" : "block group"}
      onClick={(e) => onSelectionClick?.(checklist.id, e)}
    >
      {withSelection}
    </div>
  ) : (
    <Link
      href={`/checklists/${checklist.id}`}
      className={viewMode === "grid" ? "block h-full group" : "block group"}
      {...longPressHandlers}
    >
      {withSelection}
    </Link>
  );

  // Wrap with EntityContextMenu if menu items are provided
  if (contextMenuItems) {
    return (
      <EntityContextMenu
        entityId={checklist.id}
        entity={checklist}
        menuItems={contextMenuItems}
        isSelectionMode={isSelectionMode}
        isSelected={isSelected}
        onSelect={onSelect}
        onEnterSelectionMode={onEnterSelectionMode}
      >
        {wrapped}
      </EntityContextMenu>
    );
  }

  return wrapped;
}
