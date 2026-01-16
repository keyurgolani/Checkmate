"use client";

/**
 * Template Card Component
 *
 * Displays a single template in a card format with visibility indicators.
 * Uses consistent design language with hover effects and animations.
 *
 * Requirements: 4.7 - Display visibility indicators
 * Requirements: 8.3 - Show title, description, item count, instance count, and rating
 */

import { motion } from "framer-motion";
import { Visibility } from "@/lib/pocketbase-types";
import { Globe, Lock, Users, Star, ListChecks, Copy } from "lucide-react";
import Link from "next/link";
import { cn, formatDate } from "@/lib/utils";

export interface TemplateCardData {
  id: string;
  title: string;
  description: string | null;
  visibility: Visibility | string;
  category: string | null;
  tags: string[] | null;
  instanceCount: number;
  stepCount?: number;
  rating?: number | null;
  createdAt: string;
  updatedAt: string;
}

interface TemplateCardProps {
  template: TemplateCardData;
  viewMode?: "grid" | "list";
  linkPrefix?: string;
}

function VisibilityBadge({ visibility }: { visibility: Visibility | string }) {
  const config = {
    [Visibility.PRIVATE]: {
      icon: Lock,
      label: "Private",
      className: "bg-destructive/10 text-destructive border-destructive/20",
    },
    [Visibility.PUBLIC]: {
      icon: Globe,
      label: "Public",
      className: "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20",
    },
    [Visibility.SHARED]: {
      icon: Users,
      label: "Shared",
      className: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
    },
  };

  const { icon: Icon, label, className } = config[visibility as Visibility] ?? config[Visibility.PRIVATE];

  return (
    <span className={cn(
      "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border",
      className
    )}>
      <Icon className="h-3 w-3" />
      {label}
    </span>
  );
}

function RatingDisplay({ rating }: { rating: number | null | undefined }) {
  if (rating === null || rating === undefined) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
        <Star className="h-3 w-3" />
        <span>—</span>
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
      <Star className="h-3 w-3 fill-current" />
      <span>{rating.toFixed(1)}</span>
    </span>
  );
}

export function TemplateCard({ template, viewMode = "grid", linkPrefix = "/templates" }: TemplateCardProps) {
  const formattedDate = formatDate(template.updatedAt);

  if (viewMode === "list") {
    return (
      <Link href={`${linkPrefix}/${template.id}`} className="block group">
        <motion.div
          whileHover={{ x: 4 }}
          data-slot="card"
          className={cn(
            "card flex items-center justify-between p-4 rounded-[var(--radius)] border bg-card/50 backdrop-blur-sm",
            "transition-all duration-300 hover:border-primary/30"
          )}
        >
          <div className="flex-1 min-w-0 mr-4">
            <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-1">
              <h3 className="font-semibold truncate group-hover:text-primary transition-colors">
                {template.title}
              </h3>
              <VisibilityBadge visibility={template.visibility} />
            </div>
            {template.description && (
              <p className="text-sm text-muted-foreground truncate">
                {template.description}
              </p>
            )}
          </div>
          <div className="flex items-center gap-4 flex-shrink-0 text-sm text-muted-foreground">
            {template.category && (
              <span className="hidden sm:inline px-2 py-0.5 rounded-lg bg-secondary/50 text-xs">
                {template.category}
              </span>
            )}
            <RatingDisplay rating={template.rating} />
            {template.stepCount !== undefined && (
              <span className="hidden md:inline-flex items-center gap-1">
                <ListChecks className="h-3 w-3" />
                {template.stepCount}
              </span>
            )}
            <span className="inline-flex items-center gap-1">
              <Copy className="h-3 w-3" />
              {template.instanceCount}
            </span>
            <span className="hidden lg:inline">{formattedDate}</span>
          </div>
        </motion.div>
      </Link>
    );
  }

  // Grid view
  return (
    <Link href={`${linkPrefix}/${template.id}`} className="block h-full group">
      <motion.div
        whileHover={{ y: -4 }}
        transition={{ type: "spring", stiffness: 300 }}
        data-slot="card"
        className={cn(
          "card relative h-full rounded-[var(--radius)] border bg-card/50 backdrop-blur-sm p-6",
          "transition-all duration-300 hover:border-primary/30",
          "overflow-hidden"
        )}
      >
        {/* Gradient glow - only visible on hover */}
        <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-primary/5 to-transparent -mr-8 -mt-8 rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
        
        <div className="relative z-10">
          <div className="flex items-start justify-between gap-2 mb-3">
            <h3 className="font-semibold text-lg line-clamp-2 group-hover:text-primary transition-colors">
              {template.title}
            </h3>
            <VisibilityBadge visibility={template.visibility} />
          </div>
          
          {template.description ? (
            <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
              {template.description}
            </p>
          ) : (
            <p className="text-sm text-muted-foreground/60 italic mb-4">
              No description
            </p>
          )}
          
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-3">
            <div className="flex items-center gap-3">
              {template.category && (
                <span className="px-2 py-0.5 rounded-lg bg-secondary/50">
                  {template.category}
                </span>
              )}
              <RatingDisplay rating={template.rating} />
            </div>
            <div className="flex items-center gap-3">
              {template.stepCount !== undefined && (
                <span className="inline-flex items-center gap-1">
                  <ListChecks className="h-3 w-3" />
                  {template.stepCount}
                </span>
              )}
              <span className="inline-flex items-center gap-1">
                <Copy className="h-3 w-3" />
                {template.instanceCount}
              </span>
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            {template.tags && template.tags.length > 0 ? (
              <div className="flex flex-wrap gap-1">
                {template.tags.slice(0, 3).map((tag) => (
                  <span
                    key={tag}
                    className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full"
                  >
                    {tag}
                  </span>
                ))}
                {template.tags.length > 3 && (
                  <span className="text-xs text-muted-foreground">
                    +{template.tags.length - 3}
                  </span>
                )}
              </div>
            ) : (
              <div />
            )}
            <span className="text-xs text-muted-foreground">{formattedDate}</span>
          </div>
        </div>
      </motion.div>
    </Link>
  );
}
