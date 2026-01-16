"use client";

/**
 * Content Card Component
 * 
 * Consistent card for content items with hover effects and optional gradient accent.
 * Follows the dashboard's design language.
 */

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import Link from "next/link";

interface ContentCardProps {
  href: string;
  children: React.ReactNode;
  className?: string;
  /** Show gradient accent on hover */
  accent?: boolean;
  /** Border accent color on hover */
  accentColor?: "primary" | "orange" | "green" | "blue";
}

const accentColors = {
  primary: "hover:border-l-primary",
  orange: "hover:border-l-orange-500",
  green: "hover:border-l-green-500",
  blue: "hover:border-l-blue-500",
};

export function ContentCard({ 
  href, 
  children, 
  className,
  accent = true,
  accentColor = "primary"
}: ContentCardProps) {
  return (
    <Link href={href} className="block group">
      <motion.div
        whileHover={{ y: -4 }}
        transition={{ type: "spring", stiffness: 300 }}
        data-slot="card"
        className={cn(
          "card relative h-full rounded-[var(--radius)] border bg-card/50 backdrop-blur-sm p-6",
          "transition-all duration-300",
          accent && `border-l-4 border-l-transparent ${accentColors[accentColor]}`,
          "overflow-hidden",
          className
        )}
      >
        {/* Gradient glow effect */}
        <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-primary/5 to-transparent -mr-8 -mt-8 rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
        
        <div className="relative z-10">
          {children}
        </div>
      </motion.div>
    </Link>
  );
}
