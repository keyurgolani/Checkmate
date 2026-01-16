"use client";

/**
 * Page Header Component
 * 
 * Consistent page header with gradient title, description, and optional actions.
 * Follows the dashboard's bold design language with animations.
 */

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  description?: string;
  children?: React.ReactNode;
  className?: string;
  /** Use gradient text for title */
  gradient?: boolean;
  /** Icon to display next to title */
  icon?: React.ReactNode;
}

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const item = {
  hidden: { y: 20, opacity: 0 },
  show: { y: 0, opacity: 1 }
};

export function PageHeader({ 
  title, 
  description, 
  children, 
  className,
  gradient = false,
  icon
}: PageHeaderProps) {
  return (
    <motion.div 
      variants={container}
      initial="hidden"
      animate="show"
      className={cn(
        "flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between",
        className
      )}
    >
      <motion.div variants={item} className="space-y-1 min-w-0 flex-1 sm:pr-4 md:pr-8">
        <div className="flex items-center gap-3">
          {icon && (
            <div className="p-2 rounded-xl bg-primary/10 text-primary flex-shrink-0">
              {icon}
            </div>
          )}
          <h1 className={cn(
            "text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight",
            gradient && "bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent"
          )}>
            {title}
          </h1>
        </div>
        {description && (
          <p className="text-muted-foreground text-sm sm:text-base md:text-lg">
            {description}
          </p>
        )}
      </motion.div>
      {children && (
        <motion.div variants={item} className="flex items-center gap-2 flex-shrink-0">
          {children}
        </motion.div>
      )}
    </motion.div>
  );
}

export { container as pageHeaderContainer, item as pageHeaderItem };
