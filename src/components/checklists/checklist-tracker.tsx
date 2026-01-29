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
import { Check, ChevronRight, ChevronDown, Loader2, Sparkles, FileText, Info, Link as LinkIcon, ExternalLink, Layers } from "lucide-react";
import { cn } from "@/lib/utils";
import { LiveRegion, useStatusAnnouncer } from "@/components/ui/live-region";
import { MarkdownRenderer } from "@/components/ui/markdown-renderer";
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
  itemType?: "task" | "reference" | "phase";
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
  const isPhase = node.itemType === 'phase';

  // Phase items render as collapsible section headers
  if (isPhase) {
    // Calculate phase progress
    const getPhaseProgress = () => {
      let total = 0;
      let completed = 0;
      const countTasks = (children: TreeNode[]) => {
        for (const child of children) {
          if (child.itemType !== 'phase') {
            total++;
            if (child.isCompleted) completed++;
          }
          if (child.children.length > 0) {
            countTasks(child.children);
          }
        }
      };
      countTasks(node.children);
      return { total, completed };
    };
    const progress = getPhaseProgress();

    return (
      <div className="select-none" role="listitem">
        <div
          className={cn(
            "group flex items-center gap-4 py-4 px-5 rounded-xl transition-all duration-300",
            "[@media(max-width:640px)]:[--indent-step:12px] sm:[--indent-step:24px]",
            "bg-gradient-to-r from-amber-50 to-amber-25 dark:from-amber-950/40 dark:to-amber-900/20",
            "border-2 border-amber-300 dark:border-amber-700/60",
            "hover:bg-amber-50/80 dark:hover:bg-amber-950/50"
          )}
          style={indentStyle}
        >
          {/* Expand/Collapse button */}
          <button
            type="button"
            onClick={handleExpandToggle}
            onKeyDown={handleExpandKeyDown}
            className={cn(
              "flex items-center justify-center h-6 w-6 rounded-md transition-colors",
              "hover:bg-amber-200/50 dark:hover:bg-amber-800/50 active:scale-95",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/30 focus-visible:ring-offset-1",
              "text-amber-600 dark:text-amber-400"
            )}
            aria-expanded={isExpanded}
            aria-label={isExpanded ? `Collapse phase ${node.content}` : `Expand phase ${node.content}`}
            aria-controls={`children-${node.id}`}
          >
            {isExpanded ? (
              <ChevronDown className="h-5 w-5" aria-hidden="true" />
            ) : (
              <ChevronRight className="h-5 w-5" aria-hidden="true" />
            )}
          </button>

          {/* Phase icon */}
          <div className="flex items-center justify-center h-8 w-8 shrink-0 rounded-lg bg-amber-200 dark:bg-amber-800/60">
            <Layers className="h-4 w-4 text-amber-700 dark:text-amber-300" aria-hidden="true" />
          </div>

          {/* Phase content */}
          <div className="flex-1 min-w-0">
            <span className="text-base font-semibold text-amber-800 dark:text-amber-200 block">
              {node.content}
            </span>
          </div>

          {/* Progress indicator */}
          <div className="flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400 font-medium">
            <span>{progress.completed}/{progress.total}</span>
            {progress.total > 0 && (
              <div className="w-16 h-1.5 bg-amber-200 dark:bg-amber-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-amber-500 dark:bg-amber-400 rounded-full transition-all duration-300"
                  style={{ width: `${(progress.completed / progress.total) * 100}%` }}
                />
              </div>
            )}
          </div>
        </div>

        {/* Render children if expanded */}
        {hasChildren && isExpanded && (
          <div 
            id={`children-${node.id}`}
            role="group" 
            aria-label={`Tasks in phase ${node.content}`}
            className="relative ml-4 pl-4 border-l-2 border-amber-200 dark:border-amber-800/50"
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
            <FileText className="h-4 w-4" aria-hidden="true" />
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
            
            {/* Description - rendered as markdown */}
            {node.description && node.description.trim().length > 0 && (
              <div className={cn(
                "flex items-start gap-2 mt-2 text-sm text-muted-foreground",
                node.isCompleted && "line-through decoration-muted-foreground/30"
              )}>
                <Info className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                <div className="leading-relaxed flex-1 min-w-0">
                  <MarkdownRenderer content={node.description} compact />
                </div>
              </div>
            )}
            
            {/* Resources - Requirements: 5.4, 6.3 */}
            {node.resources && node.resources.length > 0 && (
              <div 
                className="flex flex-wrap gap-2 mt-2"
                role="list"
                aria-label="Resource links"
              >
                {node.resources.map((resource, idx) => (
                  <a
                    key={idx}
                    href={resource.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    role="listitem"
                    className={cn(
                      "inline-flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-lg transition-colors",
                      // Focus styles for keyboard navigation - Requirements: 6.3
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-offset-1",
                      node.isCompleted 
                        ? "bg-muted/50 text-muted-foreground/70 focus-visible:ring-muted-foreground/30" 
                        : "bg-primary/10 text-primary hover:bg-primary/20"
                    )}
                    title={resource.description || resource.title}
                    aria-label={`${resource.title}${resource.description ? `: ${resource.description}` : ''} (opens in new tab)`}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <LinkIcon className="h-3 w-3" aria-hidden="true" />
                    <span>{resource.title}</span>
                    <ExternalLink className="h-3 w-3 opacity-60" aria-hidden="true" />
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
    // Smart expansion logic:
    // 1. For phases: only expand the phase containing the first incomplete task
    // 2. For regular parent tasks: expand all
    const expanded = new Set<string>();
    
    // Find the first incomplete task
    const firstIncompleteTask = tasks.find(t => !t.isCompleted && t.itemType !== 'phase');
    
    // Find which phase (if any) contains the first incomplete task
    const findPhaseAncestor = (taskId: string | null): string | null => {
      if (!taskId) return null;
      const task = tasks.find(t => t.id === taskId);
      if (!task) return null;
      if (task.itemType === 'phase') return task.id;
      return findPhaseAncestor(task.parentId);
    };
    
    const activePhaseId = firstIncompleteTask ? findPhaseAncestor(firstIncompleteTask.parentId) : null;
    
    for (const task of tasks) {
      const hasChildren = tasks.some((t) => t.parentId === task.id);
      if (hasChildren) {
        if (task.itemType === 'phase') {
          // Only expand the active phase (containing first incomplete task)
          // If no incomplete tasks, expand the first phase
          if (activePhaseId === task.id) {
            expanded.add(task.id);
          } else if (!activePhaseId && !expanded.has(task.id)) {
            // If no active phase found yet, expand the first phase we encounter
            const phases = tasks.filter(t => t.itemType === 'phase');
            if (phases.length > 0 && phases[0]?.id === task.id) {
              expanded.add(task.id);
            }
          }
        } else {
          // Regular parent tasks: expand all
          expanded.add(task.id);
        }
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
