"use client";

/**
 * Empty State Component
 * 
 * Consistent empty state with icon, message, and optional action.
 * Follows the dashboard's design language with animations.
 */

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: {
    label: string;
    href: string;
    icon?: React.ReactNode;
  };
  className?: string;
}

export function EmptyState({ 
  icon, 
  title, 
  description, 
  action,
  className 
}: EmptyStateProps) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className={cn(
        "rounded-xl border-2 border-dashed border-muted-foreground/20 bg-gradient-to-br from-muted/30 to-muted/10 p-8 sm:p-12 text-center",
        className
      )}
    >
      <motion.div 
        initial={{ scale: 0.8 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
        className="mx-auto w-16 h-16 rounded-xl bg-primary/10 flex items-center justify-center mb-6 text-primary"
      >
        {icon}
      </motion.div>
      <h3 className="text-xl font-bold mb-2">{title}</h3>
      <p className="text-muted-foreground max-w-md mx-auto mb-6">
        {description}
      </p>
      {action && (
        <Button asChild size="lg" className="rounded-xl">
          <Link href={action.href} className="gap-2">
            {action.icon}
            {action.label}
          </Link>
        </Button>
      )}
    </motion.div>
  );
}
