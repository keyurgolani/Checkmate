"use client";

/**
 * Checklist List Component
 *
 * Displays checklists in either grid or list format with view toggle.
 * Supports empty states, filtering by status, and sorting.
 *
 * Requirements: 6.4, 6.7 - Display user's checklists with progress bars and completion status
 */

import { useState } from "react";
import { ChecklistCard, type ChecklistCardData } from "./checklist-card";
import { ViewToggle } from "@/components/ui/view-toggle";
import { FilterTabs } from "@/components/ui/filter-tabs";
import { EmptyState } from "@/components/ui/empty-state";
import { Search, CheckCircle2, Circle, LayoutList } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

type FilterStatus = "all" | "active" | "completed";

interface ChecklistListProps {
  checklists: ChecklistCardData[];
  emptyMessage?: string;
  emptyDescription?: string;
  showDiscoverButton?: boolean;
  discoverHref?: string;
  defaultViewMode?: "grid" | "list";
}

export function ChecklistList({
  checklists,
  emptyMessage = "No checklists yet",
  emptyDescription = "Create a checklist from a template to start tracking your progress!",
  showDiscoverButton = true,
  discoverHref = "/discover",
  defaultViewMode = "list",
}: ChecklistListProps) {
  const [viewMode, setViewMode] = useState<"grid" | "list">(defaultViewMode);
  const [filter, setFilter] = useState<FilterStatus>("all");

  const counts = {
    all: checklists.length,
    active: checklists.filter((c) => (c.progress ?? 0) < 100).length,
    completed: checklists.filter((c) => (c.progress ?? 0) >= 100).length,
  };

  const filteredChecklists = checklists.filter((checklist) => {
    if (filter === "active") return (checklist.progress ?? 0) < 100;
    if (filter === "completed") return (checklist.progress ?? 0) >= 100;
    return true;
  });

  const filterTabs = [
    { value: "all" as const, label: "All", icon: <LayoutList className="h-4 w-4" />, count: counts.all },
    { value: "active" as const, label: "Active", icon: <Circle className="h-4 w-4" />, count: counts.active },
    { value: "completed" as const, label: "Completed", icon: <CheckCircle2 className="h-4 w-4" />, count: counts.completed },
  ];

  if (checklists.length === 0) {
    return (
      <EmptyState
        icon={<Search className="h-8 w-8" />}
        title={emptyMessage}
        description={emptyDescription}
        action={showDiscoverButton ? {
          label: "Discover Templates",
          href: discoverHref,
          icon: <Search className="h-4 w-4" />,
        } : undefined}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with filters and view toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <FilterTabs
          tabs={filterTabs}
          activeTab={filter}
          onTabChange={setFilter}
        />
        <ViewToggle viewMode={viewMode} onViewModeChange={setViewMode} />
      </div>

      {/* Filtered empty state */}
      {filteredChecklists.length === 0 ? (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          data-slot="card"
          className="card rounded-[var(--radius)] border bg-card/50 backdrop-blur-sm p-8 text-center"
        >
          <p className="text-muted-foreground">
            No {filter === "active" ? "active" : "completed"} checklists found.
          </p>
        </motion.div>
      ) : (
        <>
          {/* Checklist count */}
          <p className="text-sm text-muted-foreground">
            {filteredChecklists.length} checklist{filteredChecklists.length !== 1 ? "s" : ""}
            {filter !== "all" && ` (${filter})`}
          </p>

          {/* Checklist grid/list */}
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
                  {filteredChecklists.map((checklist, index) => (
                    <motion.div
                      key={checklist.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.05 }}
                      layout
                    >
                      <ChecklistCard checklist={checklist} viewMode="grid" />
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
                  {filteredChecklists.map((checklist, index) => (
                    <motion.div
                      key={checklist.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.05 }}
                      layout
                    >
                      <ChecklistCard checklist={checklist} viewMode="list" />
                    </motion.div>
                  ))}
                </AnimatePresence>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}
    </div>
  );
}
