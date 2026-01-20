"use client";

/**
 * Template List Component
 * 
 * Displays templates in grid or list view with consistent design.
 */

import { useState } from "react";
import { TemplateCard, type TemplateCardData } from "./template-card";
import { ViewToggle } from "@/components/ui/view-toggle";
import { EmptyState } from "@/components/ui/empty-state";
import { Plus } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

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
}: TemplateListProps) {
  const [viewMode, setViewMode] = useState<"grid" | "list">(defaultViewMode);

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
      {/* Header with view toggle */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {templates.length} template{templates.length !== 1 ? "s" : ""}
        </p>
        <ViewToggle viewMode={viewMode} onViewModeChange={setViewMode} />
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
                  <TemplateCard template={template} viewMode="grid" linkPrefix={linkPrefix} currentUserId={currentUserId} />
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
                  <TemplateCard template={template} viewMode="list" linkPrefix={linkPrefix} currentUserId={currentUserId} />
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
