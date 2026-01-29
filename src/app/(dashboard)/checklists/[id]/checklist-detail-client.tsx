"use client";

/**
 * Checklist Detail Client Component
 *
 * Client-side component for the checklist detail page.
 * Handles item toggle interactions and progress updates.
 * Includes realtime subscriptions for live progress updates.
 *
 * Requirements: 6.1, 6.2, 6.3, 6.4, 7.1, 12.4
 */

import { useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  CheckCircle2,
  Circle,
  RefreshCw,
  Clock,
  ExternalLink,
  ListChecks,
  MoreVertical,
  Plus,
  Settings,
  Share2,
  Trash2,
  Printer,
  Info,
  Link as LinkIcon,
} from "lucide-react";
import { formatDate, cn } from "@/lib/utils";
import { useChecklistRealtime } from "@/lib/hooks/use-realtime";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChecklistTracker,
  ProgressDisplay,
  type ChecklistTask,
} from "@/components/checklists";
import { ResourceLink } from "@/lib/pocketbase-types";
import { ResourceEditor } from "@/components/ui/resource-editor";
import { MarkdownRenderer } from "@/components/ui/markdown-renderer";

// ============================================================================
// Types
// ============================================================================

interface ChecklistData {
  id: string;
  name: string;
  blueprintId: string;
  blueprintTitle: string;
  description: string | null;
  resources: ResourceLink[] | null;
  progress: number;
  totalItems: number;
  completedItems: number;
  isSynced: boolean;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface ChecklistDetailClientProps {
  checklist: ChecklistData;
  tasks: ChecklistTask[];
}

// Animation variants
const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const item = {
  hidden: { y: 20, opacity: 0 },
  show: { y: 0, opacity: 1 }
};

// ============================================================================
// Status Badge Component
// ============================================================================

function StatusBadge({
  isComplete,
  isSynced,
}: {
  isComplete: boolean;
  isSynced: boolean;
}) {
  if (isComplete) {
    return (
      <span
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20"
        title="Completed"
      >
        <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
        <span>Complete</span>
      </span>
    );
  }

  if (!isSynced) {
    return (
      <span
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
        title="Has custom changes"
      >
        <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
        <span>Modified</span>
      </span>
    );
  }

  return (
    <span
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20"
      title="In progress"
    >
      <Circle className="h-3.5 w-3.5" aria-hidden="true" />
      <span>In Progress</span>
    </span>
  );
}

// ============================================================================
// Checklist Detail Client Component
// ============================================================================

export function ChecklistDetailClient({
  checklist: initialChecklist,
  tasks: initialTasks,
}: ChecklistDetailClientProps) {
  const router = useRouter();
  const [checklist, setChecklist] = useState(initialChecklist);
  const [tasks, setTasks] = useState(initialTasks);
  const [isToggling, setIsToggling] = useState(false);

  // Checklist is complete only if it has a completedAt date AND progress is 100%
  const isComplete = checklist.completedAt !== null && checklist.progress >= 100;

  // Subscribe to realtime updates for checklist progress
  // Requirements: 12.4
  useChecklistRealtime(checklist.id, {
    onChecklistChange: useCallback((event: { action: string; record: { progress: number; completedAt: string | null; isSynced: boolean; description: string | null; resources?: unknown } }) => {
      if (event.action === 'update') {
        setChecklist((prev) => ({
          ...prev,
          progress: event.record.progress,
          completedAt: event.record.completedAt,
          isSynced: event.record.isSynced,
          description: event.record.description,
          resources: (event.record as any).resources ?? null, // Cast as necessary
        }));
      }
    }, []),
    onItemChange: useCallback((event: any) => {
      if (event.action === 'update') {
        setTasks((prevTasks) =>
          prevTasks.map((task) =>
            task.id === event.record.id
              ? {
                  ...task,
                  isCompleted: event.record.isCompleted,
                  completedAt: event.record.completedAt,
                }
              : task
          )
        );
      } else if (event.action === 'create') {
        // Handle new tasks added (e.g., custom tasks)
        const newTask: ChecklistTask = {
          id: event.record.id,
          checklistId: event.record.instance,
          sourceItemId: event.record.sourceItem,
          parentId: event.record.parent,
          path: event.record.path,
          content: event.record.content,
          description: (event.record as any).description ?? null,
          resources: (event.record as any).resources ?? null,
          isCompleted: event.record.isCompleted,
          completedAt: event.record.completedAt,
          isCustom: event.record.isCustom,
          position: event.record.position,
          itemType: (event.record as any).itemType, // Cast to handle potential missing type in generated definition
        };
        setTasks((prevTasks) => [...prevTasks, newTask]);
      } else if (event.action === 'delete') {
        setTasks((prevTasks) => prevTasks.filter((task) => task.id !== event.record.id));
      }
    }, []),
  });

  const formattedCreatedDate = formatDate(checklist.createdAt, { format: "long" });

  const formattedCompletedDate = checklist.completedAt
    ? formatDate(checklist.completedAt, { format: "long" })
    : null;

  const progressColor = isComplete ? "from-green-500/10 to-green-500/5" : "from-primary/10 to-primary/5";
  const progressBorderColor = isComplete ? "border-green-500/20" : "border-primary/20";

  // Handle task toggle
  const handleToggleTask = useCallback(
    async (taskId: string) => {
      if (isToggling) return;

      setIsToggling(true);

      try {
        const response = await fetch(
          `/api/checklists/${checklist.id}/items/${taskId}/toggle`,
          {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
            },
          }
        );

        if (!response.ok) {
          throw new Error("Failed to toggle task");
        }

        const data = await response.json();

        if (data.success && data.task) {
          // Update progress in checklist state immediately for better UX
          if (data.progress) {
            setChecklist((prev) => ({
              ...prev,
              progress: data.progress.percentage,
              totalItems: data.progress.totalItems,
              completedItems: data.progress.completedItems,
              completedAt:
                data.progress.percentage >= 100
                  ? new Date().toISOString()
                  : null,
            }));
          }
          
          // Update task state immediately to fix checkbox visual sync issue
          setTasks((prevTasks) =>
            prevTasks.map((task) =>
              task.id === data.task.id
                ? {
                    ...task,
                    isCompleted: data.task.isCompleted,
                    completedAt: data.task.completedAt,
                  }
                : task
            )
          );

          if (data.task.isCompleted) {
             import('@/lib/confetti').then(({ triggerConfetti }) => {
                 triggerConfetti(0.5, 0.5);
             });
          }
        }
      } catch (error) {
        console.error("Error toggling task:", error);
        // Optionally show an error toast here
      } finally {
        setIsToggling(false);
      }
    },
    [checklist.id, isToggling]
  );

  return (
    <motion.div 
      variants={container}
      initial="hidden"
      animate="show"
      className="w-full space-y-6"
    >
      {/* Header */}
      <motion.div variants={item} className="flex items-start justify-between gap-4">
        <div className="space-y-3">
          <Button variant="ghost" size="sm" asChild className="-ml-2 rounded-xl text-muted-foreground hover:text-foreground no-print">
            <Link href="/checklists">
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back
            </Link>
          </Button>
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-[var(--radius)] bg-primary/10 text-primary no-print">
              <ListChecks className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
                  {checklist.name}
                </h1>
                <div className="no-print">
                  <StatusBadge isComplete={isComplete} isSynced={checklist.isSynced} />
                </div>
                <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => window.print()}
                    className="hidden sm:flex ml-auto no-print h-8 rounded-full px-3 text-xs"
                  >
                    <Printer className="h-3.5 w-3.5 mr-2" />
                    Print
                  </Button>
              </div>
              <div className="flex items-center gap-3 text-xs font-medium text-muted-foreground mt-2">
                <div className="flex items-center gap-1.5">
                   <Clock className="h-3.5 w-3.5" />
                   <span>Created {formattedCreatedDate}</span>
                </div>
                <span>•</span>
                <div className="flex items-center gap-1">
                  <span>From:</span>
                  <Link
                    href={`/templates/${checklist.blueprintId}`}
                    className="text-primary hover:underline inline-flex items-center gap-1"
                  >
                    {checklist.blueprintTitle}
                    <ExternalLink className="h-3 w-3 no-print" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Checklist Description & Resources */}
      {(checklist.description || (checklist.resources && checklist.resources.length > 0)) && (
        <motion.div variants={item} className="space-y-3">
          {/* Description */}
          {checklist.description && checklist.description.trim().length > 0 && (
            <div className="flex items-start gap-2 text-sm text-muted-foreground">
              <Info className="h-4 w-4 mt-1 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <MarkdownRenderer content={checklist.description} className="text-muted-foreground" />
              </div>
            </div>
          )}
          
          {/* Resources */}
          {checklist.resources && checklist.resources.length > 0 && (
            <div 
              className="flex flex-wrap gap-2"
              role="list"
              aria-label="Checklist resources"
            >
              {checklist.resources.map((resource, idx) => (
                <a
                  key={idx}
                  href={resource.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  role="listitem"
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-offset-1"
                  title={resource.description || resource.title}
                  aria-label={`${resource.title}${resource.description ? `: ${resource.description}` : ''} (opens in new tab)`}
                >
                  <LinkIcon className="h-3 w-3" aria-hidden="true" />
                  <span>{resource.title}</span>
                  <ExternalLink className="h-3 w-3 opacity-60" aria-hidden="true" />
                </a>
              ))}
            </div>
          )}
        </motion.div>
      )}

      {/* Progress Card - Bento style */}
      <motion.div variants={item} className="no-print">
        <div data-slot="card" className={cn(
          "card rounded-[var(--radius)] bg-gradient-to-br border p-6 sm:p-8 relative overflow-hidden",
          progressColor,
          progressBorderColor
        )}>
          {/* Decorative icon - subtle, only visible on hover */}
          <div className={cn(
            "absolute -top-6 -right-6 p-6 opacity-0 group-hover:opacity-10 rotate-12 transition-all duration-300",
            isComplete ? "text-green-500" : "text-primary"
          )}>
            {isComplete ? <CheckCircle2 size={120} /> : <ListChecks size={120} />}
          </div>
          
          <div className="relative z-10">
            <h2 className="text-lg font-semibold mb-4">Progress</h2>
            
            <div className="flex items-end gap-2 mb-2">
              <span className={cn(
                "text-4xl sm:text-5xl font-black",
                isComplete ? "text-green-500" : "text-primary"
              )}>
                {Math.round(checklist.progress)}%
              </span>
              <span className="text-muted-foreground mb-1">
                ({checklist.completedItems} of {checklist.totalItems} tasks)
              </span>
            </div>
            
            <div className="w-full bg-primary/20 h-3 rounded-full overflow-hidden mt-4">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${checklist.progress}%` }}
                transition={{ duration: 1, ease: "easeOut" }}
                className={cn(
                  "h-full rounded-full relative overflow-hidden",
                  isComplete ? "bg-green-500" : "bg-primary"
                )}
              >
                {!isComplete && (
                  <div className="absolute inset-0 bg-white/20 w-full h-full animate-shimmer" 
                    style={{ 
                      backgroundImage: 'linear-gradient(45deg,rgba(255,255,255,0.15) 25%,transparent 25%,transparent 50%,rgba(255,255,255,0.15) 50%,rgba(255,255,255,0.15) 75%,transparent 75%,transparent)', 
                      backgroundSize: '1rem 1rem' 
                    }} 
                  />
                )}
              </motion.div>
            </div>

            <div className="flex items-center gap-4 text-xs text-muted-foreground mt-4">
              <div className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" />
                <span>Created {formattedCreatedDate}</span>
              </div>
              {formattedCompletedDate && (
                <div className="flex items-center gap-1.5 text-green-600 dark:text-green-400">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>Completed {formattedCompletedDate}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Checklist Tasks */}
      <motion.div variants={item}>
        <Card className="rounded-[var(--radius)] border bg-card/50 backdrop-blur-sm overflow-hidden shadow-sm">
          <CardHeader className="border-b bg-muted/20 py-4 px-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-primary/10 text-primary">
                  <ListChecks className="h-4 w-4" />
                </div>
                <div>
                  <CardTitle className="text-lg font-semibold">Tasks</CardTitle>
                </div>
              </div>
              {/* Controls removed - now handled internally by ChecklistTracker */}
              <div></div>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <ChecklistTracker
              tasks={tasks}
              onToggleTask={handleToggleTask}
              disabled={isToggling}
            />
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}
