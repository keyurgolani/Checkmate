"use client";

import React, { useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
  MotionValue,
  AnimatePresence,
} from "framer-motion";
import {
  LayoutDashboard,
  Compass,
  CheckSquare,
  Settings,
  Plus,
  FolderOpen,
  FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export const FloatingDock = () => {
  const pathname = usePathname();
  const mouseX = useMotionValue(Infinity);

  const links = [
    {
      title: "Dashboard",
      icon: <LayoutDashboard className="h-full w-full text-indigo-500" />,
      href: "/dashboard",
    },
    {
      title: "Discover",
      icon: <Compass className="h-full w-full text-blue-500" />,
      href: "/discover",
    },
    {
      title: "Templates",
      icon: <FileText className="h-full w-full text-indigo-500" />,
      href: "/templates",
    },
    {
      title: "Checklists",
      icon: <CheckSquare className="h-full w-full text-green-500" />,
      href: "/checklists",
    },
    {
      title: "Workspaces",
      icon: <FolderOpen className="h-full w-full text-orange-500" />,
      href: "/workspaces",
    },

    {
      title: "Settings",
      icon: <Settings className="h-full w-full text-gray-500" />,
      href: "/settings",
    },
  ];

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-4">
      <motion.div
        onMouseMove={(e) => mouseX.set(e.pageX)}
        onMouseLeave={() => mouseX.set(Infinity)}
        className="mx-auto flex h-14 items-end gap-3 rounded-[var(--radius)] border border-border/50 bg-background/80 px-3 pb-2.5 backdrop-blur-md shadow-lg"
      >
        {links.map((link) => (
          <DockIcon key={link.title} mouseX={mouseX} {...link} isActive={pathname === link.href} />
        ))}
        
        {/* Separator */}
        <div className="h-7 w-px bg-border self-center mx-1" />

        {/* Quick Action: New Blueprint */}
        <DockIcon
          mouseX={mouseX}
          title="New Template"
          href="/templates/new"
          icon={<Plus className="h-full w-full text-white" />}
          className="bg-primary hover:bg-primary/90 rounded-xl"
        />
      </motion.div>
    </div>
  );
};

function DockIcon({
  mouseX,
  title,
  icon,
  href,
  isActive,
  className,
}: {
  mouseX: MotionValue;
  title: string;
  icon: React.ReactNode;
  href: string;
  isActive?: boolean;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  const distance = useTransform(mouseX, (val) => {
    const bounds = ref.current?.getBoundingClientRect() ?? { x: 0, width: 0 };
    return val - bounds.x - bounds.width / 2;
  });

  const widthSync = useTransform(distance, [-150, 0, 150], [36, 56, 36]);
  const width = useSpring(widthSync, {
    mass: 0.1,
    stiffness: 150,
    damping: 12,
  });

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Link href={href}>
            <motion.div
              ref={ref}
              style={{ width }}
              className={cn(
                "aspect-square rounded-xl flex items-center justify-center relative transition-colors bg-accent/10 hover:bg-accent/20",
                isActive ? "bg-accent hover:bg-accent" : "hover:bg-accent/20",
                className
              )}
            >
              <AnimatePresence>
                {isActive && (
                    <motion.div
                        layoutId="active-dot"
                        className="absolute -bottom-1.5 w-1 h-1 bg-primary rounded-full"
                    />
                )}
              </AnimatePresence>
              <div className="w-5 h-5">{icon}</div>
            </motion.div>
          </Link>
        </TooltipTrigger>
        <TooltipContent>
          <p>{title}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
