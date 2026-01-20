"use client";

/**
 * Checklist Tracker Component
 *
 * Displays tasks with checkboxes for tracking completion.
 * Supports nested tasks with proper indentation up to 5 levels deep.
 *
 * Requirements: 6.1, 7.1, 13.2, 13.3, 13.4
 * - Display tasks with checkboxes
 * - Show nested tasks with proper indentation
 * - Toggle completion status immediately
 * - Keyboard navigation support
 * - Proper ARIA labels for interactive elements
 * - Announce state changes to screen readers
 */

import { useState, useCallback, useMemo } from "react";
import { Check, ChevronRight, Loader2, Sparkles, ExternalLink, Info, Link as LinkIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { LiveRegion, useStatusAnnouncer } from "@/components/ui/live-region";
import type { ResourceLink } from "@/lib/pocketbase-types";

// ============================================================================
// Types
// ============================================================================

export interface ChecklistTask {
  id: string;
  checklistId: string;
  sourceItemId: string | null;
  parentId: string | null;
  path: string;
  content: string;
  description: string | null;
  resources: ResourceLink[] | null;
  isCompleted: boolean;
  completedAt: string | null;
  isCustom: boolean;
  position: number;
  itemType?: "task" | "reference";
}

export interface ChecklistTrackerProps {
  tasks: ChecklistTask[];
  onToggleTask: (taskId: string) => Promise<void>;
  disabled?: boolean;
}

interface TreeNode extends ChecklistTask {
  children: TreeNode[];
  depth: number;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Builds a tree structure from flat tasks array
 */
function buildTaskTree(tasks: ChecklistTask[]): TreeNode[] {
  // Create a map for quick lookup
  const taskMap = new Map<string, TreeNode>();
  const rootNodes: TreeNode[] = [];

  // First pass: create tree nodes
  for (const task of tasks) {
    taskMap.set(task.id, {
      ...task,
      children: [],
      depth: 0,
    });
  }

  // Second pass: build parent-child relationships
  for (const task of tasks) {
    const node = taskMap.get(task.id);
    if (!node) continue;

    if (task.parentId && taskMap.has(task.parentId)) {
      const parent = taskMap.get(task.parentId)!;
      node.depth = parent.depth + 1;
      parent.children.push(node);
    } else {
      rootNodes.push(node);
    }
  }

  // Sort children by position at each level
  const sortChildren = (nodes: TreeNode[]) => {
    nodes.sort((a, b) => a.position - b.position);
    for (const node of nodes) {
      if (node.children.length > 0) {
        sortChildren(node.children);
      }
    }
  };

  sortChildren(rootNodes);

  return rootNodes;
}

// ============================================================================
// Checkbox Component
// ============================================================================

interface CheckboxProps {
  checked: boolean;
  onChange: () => void;
  disabled?: boolean;
  loading?: boolean;
  id: string;
}

function Checkbox({ checked, onChange, disabled, loading, id }: CheckboxProps) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-labelledby={`label-${id}`}
      disabled={disabled || loading}
      onClick={onChange}
      className={cn(
        "flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition-all duration-200",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-offset-2",
        checked
          ? "border-primary bg-primary text-primary-foreground shadow-sm shadow-primary/25"
          : "border-muted-foreground/25 hover:border-primary/50 hover:bg-primary/5 bg-background",
        disabled && "cursor-not-allowed opacity-50",
        loading && "cursor-wait"
      )}
    >
      {loading ? (
        <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
      ) : checked ? (
        <Check className="h-3 w-3 stroke-[3]" aria-hidden="true" />
      ) : null}
    </button>
  );
}

// ============================================================================
// Tree Item Component
// ============================================================================

interface TreeItemProps {
  node: TreeNode;
  onToggle: (taskId: string) => Promise<void>;
  loadingTasks: Set<string>;
  disabled?: boolean;
  expandedTasks: Set<string>;
  onToggleExpand: (taskId: string) => void;
}

function TreeItem({
  node,
  onToggle,
  loadingTasks,
  disabled,
  expandedTasks,
  onToggleExpand,
}: TreeItemProps) {
  const hasChildren = node.children.length > 0;
  const isExpanded = expandedTasks.has(node.id);
  const isLoading = loadingTasks.has(node.id);
  const depth = node.depth;

  // Calculate indentation based on depth (max 5 levels per requirements)
  // Using 24px (1.5rem) per level for clear visual hierarchy
  const indentStyle = useMemo(() => {
    // scale factor 0 to 5
    const depthFactor = Math.min(depth, 5);
    return { 
      paddingLeft: `calc(var(--indent-step, 1.5rem) * ${depthFactor})` 
    };
  }, [depth]);

  const handleToggle = useCallback(async () => {
    if (!disabled && !isLoading) {
      await onToggle(node.id);
    }
  }, [disabled, isLoading, node.id, onToggle]);

  const handleExpandToggle = useCallback(
    (e: React.MouseEvent | React.KeyboardEvent) => {
      e.stopPropagation();
      onToggleExpand(node.id);
    },
    [node.id, onToggleExpand]
  );

  // Handle keyboard events for the item row - Requirements: 13.2
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        handleToggle();
      }
    },
    [handleToggle]
  );

  // Handle keyboard events for expand/collapse - Requirements: 13.2
  const handleExpandKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        handleExpandToggle(e);
      }
    },
    [handleExpandToggle]
  );

  const isReference = node.itemType === 'reference';

  return (
    <div className="select-none" role="listitem">
      <div
        className={cn(
          "group flex items-start gap-4 py-3.5 px-5 rounded-[var(--radius)] transition-all duration-300",
          "[@media(max-width:640px)]:[--indent-step:12px] sm:[--indent-step:24px]", 
          isReference 
            ? "bg-gradient-to-br from-card to-background border border-border/50 shadow-sm hover:shadow-md hover:border-primary/20 relative overflow-hidden" 
            : "hover:bg-muted/50 border border-transparent hover:border-border/50 rounded-[var(--radius)] px-4 py-3",
          "focus-within:ring-2 focus-within:ring-primary/20 focus-within:bg-muted/30"
        )}
        style={indentStyle}
      >
        {/* Glow effect for references */}
        {isReference && (
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />
        )}

        {/* Expand/Collapse button for items with children */}
        <div className={cn("flex items-center h-5 w-5 shrink-0 relative z-10", isReference ? "mt-1.5" : "mt-0.5")}>
          {hasChildren ? (
            <button
              type="button"
              onClick={handleExpandToggle}
              onKeyDown={handleExpandKeyDown}
              className={cn(
                "flex items-center justify-center h-5 w-5 rounded-md transition-colors",
                "hover:bg-accent/80 active:scale-95",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-offset-1",
                isReference ? "text-primary hover:bg-primary/10" : "text-muted-foreground"
              )}
              aria-expanded={isExpanded}
              aria-label={isExpanded ? `Collapse ${node.content}` : `Expand ${node.content}`}
              aria-controls={`children-${node.id}`}
            >
              <div className={cn("transition-transform duration-200", isExpanded && "rotate-90")}>
                <ChevronRight className="h-4 w-4" aria-hidden="true" />
              </div>
            </button>
          ) : (
            <span className="w-5" aria-hidden="true" />
          )}
        </div>

        {/* Checkbox or Reference Icon */}
        {isReference ? (
          <div className="flex items-center justify-center h-9 w-9 shrink-0 rounded-xl bg-primary/10 text-primary ring-1 ring-inset ring-primary/20 relative z-10">
            <ExternalLink className="h-4 w-4" aria-hidden="true" />
          </div>
        ) : (
          <div className="mt-0.5 relative z-10">
            <Checkbox
              id={node.id}
              checked={node.isCompleted}
              onChange={handleToggle}
              disabled={disabled}
              loading={isLoading}
            />
          </div>
        )}

        {/* Content */}
        <div className="flex-1 min-w-0 relative z-10">
          {isReference ? (
            <div className="flex items-center justify-between gap-4">
              <div>
                <span className="text-base font-medium text-foreground block leading-tight group-hover:text-primary transition-colors">
                  {node.content}
                </span>
                <div className="flex items-center gap-2 mt-1.5">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-muted text-muted-foreground uppercase tracking-wider border border-border/50">
                    Template Ref
                  </span>
                  <span className="text-xs text-muted-foreground/60 flex items-center gap-1">
                    <span className="w-1 h-1 rounded-full bg-primary/40" />
                    Click to expand
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <>
            <div className="flex items-start gap-2">
              <label
                id={`label-${node.id}`}
                className={cn(
                  "text-[15px] cursor-pointer leading-relaxed block transition-all duration-200 pt-px",
                  node.isCompleted 
                    ? "text-muted-foreground/70 line-through decoration-muted-foreground/40" 
                    : "text-foreground group-hover:text-foreground/90"
                )}
                onClick={handleToggle}
                onKeyDown={handleKeyDown}
                tabIndex={0}
                role="button"
                aria-pressed={node.isCompleted}
              >
                {node.content}
              </label>
              
              {/* Custom task indicator - only for non-reference items */}
              {node.isCustom && (
                <span
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 uppercase tracking-wide shrink-0"
                  title="Custom task"
                  aria-label="Custom task"
                >
                  <Sparkles className="h-2.5 w-2.5" aria-hidden="true" />
                  custom
                </span>
              )}
            </div>
            
            {/* Description */}
            {node.description && node.description.trim().length > 0 && (
              <div className="flex items-start gap-2 mt-2 text-sm text-muted-foreground">
                <Info className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                <p className={cn(
                  "leading-relaxed",
                  node.isCompleted && "line-through decoration-muted-foreground/30"
                )}>{node.description}</p>
              </div>
            )}
            
            {/* Resources */}
            {node.resources && node.resources.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {node.resources.map((resource, idx) => (
                  <a
                    key={idx}
                    href={resource.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cn(
                      "inline-flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-lg transition-colors",
                      node.isCompleted 
                        ? "bg-muted/50 text-muted-foreground/70" 
                        : "bg-primary/10 text-primary hover:bg-primary/20"
                    )}
                    title={resource.description || resource.title}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <LinkIcon className="h-3 w-3" />
                    {resource.title}
                    <ExternalLink className="h-3 w-3 opacity-60" />
                  </a>
                ))}
              </div>
            )}
            </>
          )}
        </div>
      </div>

      {/* Render children if expanded */}
      {hasChildren && isExpanded && (
        <div 
          id={`children-${node.id}`}
          role="group" 
          aria-label={`Sub-tasks of ${node.content}`}
          className="relative before:absolute before:left-[calc(var(--indent-px,0px)+1.5rem)] before:top-0 before:bottom-2 before:w-px before:bg-border/50"
          style={{ '--indent-px': `${Math.min(depth, 5) * 24}px` } as React.CSSProperties}
        >
          {node.children.map((child) => (
            <TreeItem
              key={child.id}
              node={child}
              onToggle={onToggle}
              loadingTasks={loadingTasks}
              disabled={disabled}
              expandedTasks={expandedTasks}
              onToggleExpand={onToggleExpand}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Checklist Tracker Component
// ============================================================================

export function ChecklistTracker({
  tasks,
  onToggleTask,
  disabled = false,
}: ChecklistTrackerProps) {
  const [loadingTasks, setLoadingTasks] = useState<Set<string>>(new Set());
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(() => {
    // Start with all parent tasks expanded
    const expanded = new Set<string>();
    for (const task of tasks) {
      if (tasks.some((t) => t.parentId === task.id)) {
        expanded.add(task.id);
      }
    }
    return expanded;
  });
  const { message: statusMessage, politeness, announce } = useStatusAnnouncer();

  // Build tree structure from flat tasks
  const treeNodes = useMemo(() => buildTaskTree(tasks), [tasks]);

  // Handle task toggle with loading state and announcement
  const handleToggle = useCallback(
    async (taskId: string) => {
      const task = tasks.find(t => t.id === taskId);
      setLoadingTasks((prev) => new Set(prev).add(taskId));
      try {
        await onToggleTask(taskId);
        // Announce the state change
        if (task) {
          const newState = !task.isCompleted;
          announce(`${task.content} marked as ${newState ? "complete" : "incomplete"}`);
        }
      } finally {
        setLoadingTasks((prev) => {
          const next = new Set(prev);
          next.delete(taskId);
          return next;
        });
      }
    },
    [onToggleTask, tasks, announce]
  );

  // Handle expand/collapse toggle
  const handleToggleExpand = useCallback((taskId: string) => {
    setExpandedTasks((prev) => {
      const next = new Set(prev);
      if (next.has(taskId)) {
        next.delete(taskId);
      } else {
        next.add(taskId);
      }
      return next;
    });
  }, []);

  // Expand all tasks
  const handleExpandAll = useCallback(() => {
    const allParentIds = new Set<string>();
    for (const task of tasks) {
      if (tasks.some((t) => t.parentId === task.id)) {
        allParentIds.add(task.id);
      }
    }
    setExpandedTasks(allParentIds);
    announce("All tasks expanded");
  }, [tasks, announce]);

  // Collapse all tasks
  const handleCollapseAll = useCallback(() => {
    setExpandedTasks(new Set());
    announce("All tasks collapsed");
  }, [announce]);

  // Check if there are any nested tasks
  const hasNestedTasks = useMemo(
    () => tasks.some((task) => task.parentId !== null),
    [tasks]
  );

  // Calculate completion stats for announcement
  const completedCount = useMemo(
    () => tasks.filter(task => task.isCompleted).length,
    [tasks]
  );

  if (tasks.length === 0) {
    return (
      <div className="rounded-lg border bg-card p-6 text-center" role="status">
        <p className="text-sm text-muted-foreground">
          No tasks in this checklist.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {/* Live region for status announcements */}
      <LiveRegion message={statusMessage} politeness={politeness} />
      
      {/* Expand/Collapse controls for nested tasks - Requirements: 13.2 */}
      {hasNestedTasks && (
        <div className="flex items-center justify-end gap-1 pb-3 mb-1 border-b border-border/50" role="group" aria-label="Expand and collapse controls">
          <button
            type="button"
            onClick={handleExpandAll}
            className={cn(
              "text-xs font-medium text-muted-foreground hover:text-primary px-2.5 py-1.5 rounded-lg transition-colors",
              "hover:bg-primary/5 active:bg-primary/10",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-offset-2"
            )}
            aria-label="Expand all tasks"
          >
            Expand all
          </button>
          <span className="text-border" aria-hidden="true">|</span>
          <button
            type="button"
            onClick={handleCollapseAll}
            className={cn(
              "text-xs font-medium text-muted-foreground hover:text-primary px-2.5 py-1.5 rounded-lg transition-colors",
              "hover:bg-primary/5 active:bg-primary/10",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-offset-2"
            )}
            aria-label="Collapse all tasks"
          >
            Collapse all
          </button>
        </div>
      )}

      {/* Task tree */}
      <div 
        role="list" 
        aria-label={`Checklist tasks, ${completedCount} of ${tasks.length} completed`}
        className="space-y-0.5"
      >
        {treeNodes.map((node) => (
          <TreeItem
            key={node.id}
            node={node}
            onToggle={handleToggle}
            loadingTasks={loadingTasks}
            disabled={disabled}
            expandedTasks={expandedTasks}
            onToggleExpand={handleToggleExpand}
          />
        ))}
      </div>
    </div>
  );
}
