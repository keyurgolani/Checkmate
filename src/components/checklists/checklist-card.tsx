"use client";

/**
 * Checklist Card Component
 *
 * Displays a single checklist with progress bar and completion status.
 * Uses consistent design language with hover effects and animations.
 *
 * Requirements: 6.4, 6.7 - Display progress indicators and completion status
 */

import { motion } from "framer-motion";
import { Progress } from "@/components/ui/progress";
import { formatDate } from "@/lib/utils";
import { CheckCircle2, Circle, Clock, RefreshCw } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

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

export function ChecklistCard({ checklist, viewMode = "grid" }: ChecklistCardProps) {
  const progress = checklist.progress ?? 0;
  const isComplete = checklist.completedAt !== null && progress >= 100;
  const formattedDate = formatDate(checklist.updatedAt);
  const completedDate = checklist.completedAt ? formatDate(checklist.completedAt) : null;

  if (viewMode === "list") {
    return (
      <Link href={`/checklists/${checklist.id}`} className="block group">
        <motion.div
          whileHover={{ x: 4 }}
          data-slot="card"
          className={cn(
            "card flex items-center justify-between p-4 rounded-[var(--radius)] border bg-card relative overflow-hidden",
            "transition-all duration-300 hover:border-primary/20",
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
      </Link>
    );
  }

  // Grid view
  return (
    <Link href={`/checklists/${checklist.id}`} className="block h-full group">
      <motion.div
        whileHover={{ y: -4 }}
        transition={{ type: "spring", stiffness: 300 }}
        data-slot="card"
        className={cn(
          "card relative h-full rounded-[var(--radius)] border bg-card p-6 overflow-hidden",
          "transition-all duration-300 hover:-translate-y-1 hover:border-primary/20",
          "group"
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
              {/* Shimmer effect */}
              {!isComplete && progress > 0 && (
                <div 
                  className="absolute inset-0 overflow-hidden rounded-full"
                  style={{ width: `${progress}%` }}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
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
    </Link>
  );
}
