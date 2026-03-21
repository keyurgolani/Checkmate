"use client";

/**
 * Template List Component
 *
 * Displays templates in grid or list view with consistent design.
 * Supports context menus, multi-select, and bulk actions.
 */

import { useState } from "react";
import { TemplateCard, type TemplateCardData } from "./template-card";
import { ViewToggle } from "@/components/ui/view-toggle";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useSelection } from "@/lib/hooks/use-selection";
import { BulkActionBar, type BulkAction } from "@/components/shared/bulk-action-bar";
import type { ContextMenuItemConfig } from "@/components/shared/entity-context-menu";

interface TemplateListProps {
  templates: TemplateCardData[];
  emptyMessage?: string;
  emptyDescription?: string;
  showCreateButton?: boolean;
  createHref?: string;
  defaultViewMode?: "grid" | "list";
  linkPrefix?: string;
  /** Current user ID - passed to cards to determine ownership display */
  currentUserId?: string | null;
  contextMenuItems?: ContextMenuItemConfig<TemplateCardData>[];
  bulkActions?: BulkAction[];
  /** Factory function that creates bulk actions with access to selected IDs */
  bulkActionFactory?: (selectedIds: Set<string>) => BulkAction[];
}

export function TemplateList({
  templates,
  emptyMessage = "No templates yet",
  emptyDescription = "Create your first template to get started!",
  showCreateButton = true,
  createHref = "/templates/new",
  defaultViewMode = "grid",
  linkPrefix = "/templates",
  currentUserId,
  contextMenuItems,
  bulkActions,
  bulkActionFactory,
}: TemplateListProps) {
  const [viewMode, setViewMode] = useState<"grid" | "list">(defaultViewMode);
  const templateIds = templates.map((t) => t.id);
  const selection = useSelection(templateIds);

  if (templates.length === 0) {
    return (
      <EmptyState
        icon={<Plus className="h-8 w-8" />}
        title={emptyMessage}
        description={emptyDescription}
        action={showCreateButton ? {
          label: "Create Template",
          href: createHref,
          icon: <Plus className="h-4 w-4" />,
        } : undefined}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with view toggle and selection controls */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {selection.isSelectionMode
            ? `${selection.selectedIds.size} of ${templates.length} selected`
            : `${templates.length} template${templates.length !== 1 ? "s" : ""}`
          }
        </p>
        <div className="flex items-center gap-2">
          {templates.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl text-xs h-8"
              onClick={() => selection.isSelectionMode ? selection.exitSelectionMode() : selection.enterSelectionMode()}
              aria-pressed={selection.isSelectionMode}
            >
              {selection.isSelectionMode ? "Cancel" : "Select"}
            </Button>
          )}
          <ViewToggle viewMode={viewMode} onViewModeChange={setViewMode} />
        </div>
      </div>

      {/* Template grid/list */}
      <AnimatePresence mode="wait">
        {viewMode === "grid" ? (
          <motion.div
            key="grid"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
          >
            <AnimatePresence>
              {templates.map((template, index) => (
                <motion.div
                  key={template.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                  layout
                >
                  <TemplateCard
                    template={template}
                    viewMode="grid"
                    linkPrefix={linkPrefix}
                    currentUserId={currentUserId}
                    contextMenuItems={contextMenuItems}
                    isSelectionMode={selection.isSelectionMode}
                    isSelected={selection.isSelected(template.id)}
                    onSelectionClick={(id, e) => selection.handleClick(id, e)}
                    onSelect={(id) => selection.toggleItem(id)}
                    onEnterSelectionMode={(id) => selection.enterSelectionMode(id)}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        ) : (
          <motion.div
            key="list"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="space-y-3"
          >
            <AnimatePresence>
              {templates.map((template, index) => (
                <motion.div
                  key={template.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                  layout
                >
                  <TemplateCard
                    template={template}
                    viewMode="list"
                    linkPrefix={linkPrefix}
                    currentUserId={currentUserId}
                    contextMenuItems={contextMenuItems}
                    isSelectionMode={selection.isSelectionMode}
                    isSelected={selection.isSelected(template.id)}
                    onSelectionClick={(id, e) => selection.handleClick(id, e)}
                    onSelect={(id) => selection.toggleItem(id)}
                    onEnterSelectionMode={(id) => selection.enterSelectionMode(id)}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

      {(bulkActions || bulkActionFactory) && (
        <BulkActionBar
          selectedCount={selection.selectedIds.size}
          actions={bulkActionFactory ? bulkActionFactory(selection.selectedIds) : bulkActions!}
          onSelectAll={() => selection.selectAll()}
          onDeselectAll={() => selection.deselectAll()}
          onCancel={() => selection.exitSelectionMode()}
          isAllSelected={selection.selectedIds.size === templates.length}
        />
      )}
    </div>
  );
}
