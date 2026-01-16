"use client";

/**
 * Stat Card Component
 * 
 * Reusable stat card with icon, value, and label.
 * Follows the dashboard's bento grid design language.
 */

import { motion, type Variants } from "framer-motion";
import { cn } from "@/lib/utils";
import Link from "next/link";

interface StatCardProps {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  color?: "primary" | "orange" | "green" | "blue" | "secondary";
  href?: string;
  variants?: Variants;
  className?: string;
}

const colorClasses = {
  primary: "bg-primary/10 border-primary/20 hover:border-primary/50",
  orange: "bg-orange-500/10 border-orange-500/20 hover:border-orange-500/50",
  green: "bg-green-500/10 border-green-500/20 hover:border-green-500/50",
  blue: "bg-blue-500/10 border-blue-500/20 hover:border-blue-500/50",
  secondary: "bg-secondary/10 border-secondary/20 hover:border-secondary/50",
};

export function StatCard({ 
  title, 
  value, 
  icon, 
  color = "primary",
  href,
  variants,
  className 
}: StatCardProps) {
  const content = (
    <motion.div 
      variants={variants}
      data-slot="card"
      className={cn(
        "card rounded-[var(--radius)] border p-6 flex flex-col justify-between min-h-[140px] transition-all duration-300",
        href && "cursor-pointer",
        colorClasses[color],
        className
      )}
    >
      <div className="flex justify-between items-start">
        <div className="p-3 bg-white/50 dark:bg-black/20 rounded-[var(--radius)] backdrop-blur-sm">
          {icon}
        </div>
      </div>
      <div>
        <div className="text-4xl font-bold mb-1">{value}</div>
        <div className="text-sm font-medium opacity-80">{title}</div>
      </div>
    </motion.div>
  );

  if (href) {
    return (
      <Link href={href} className="contents">
        {content}
      </Link>
    );
  }

  return content;
}
