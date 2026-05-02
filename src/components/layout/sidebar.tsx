"use client";

/**
 * Sidebar Component
 *
 * Main navigation sidebar with proper keyboard navigation support.
 *
 * Requirements: 13.2 - Keyboard navigation with logical tab order
 */

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FileText,
  ListChecks,
  Search,
  Settings,
  ChevronLeft,
  ChevronRight,
  FolderKanban,
  LogIn,
  UserPlus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/ui/logo";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { WorkspaceSwitcher } from "./workspace-switcher";
import type { Workspace } from "@/lib/pocketbase-types";

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  requiresAuth?: boolean;
}

// Navigation items that require authentication
const authenticatedNavItems: NavItem[] = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    requiresAuth: true,
  },
  {
    title: "Templates",
    href: "/templates",
    icon: FileText,
    requiresAuth: true,
  },
  {
    title: "Checklists",
    href: "/checklists",
    icon: ListChecks,
    requiresAuth: true,
  },
  {
    title: "Workspaces",
    href: "/workspaces",
    icon: FolderKanban,
    requiresAuth: true,
  },
  {
    title: "Discover",
    href: "/discover",
    icon: Search,
    requiresAuth: false,
  },
];

// Navigation items for anonymous users
const anonymousNavItems: NavItem[] = [
  {
    title: "Discover",
    href: "/discover",
    icon: Search,
    requiresAuth: false,
  },
];

// Auth-related navigation items for anonymous users
const authNavItems: NavItem[] = [
  {
    title: "Sign In",
    href: "/signin",
    icon: LogIn,
    requiresAuth: false,
  },
  ...(process.env.NEXT_PUBLIC_SIGNUP_DISABLED !== "true"
    ? [
        {
          title: "Sign Up",
          href: "/signup",
          icon: UserPlus,
          requiresAuth: false,
        },
      ]
    : []),
];

const bottomNavItems: NavItem[] = [
  {
    title: "Settings",
    href: "/settings",
    icon: Settings,
    requiresAuth: true,
  },
];

interface SidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
  isAuthenticated?: boolean;
  workspaces?: Workspace[];
}

export function Sidebar({ isCollapsed, onToggle, isAuthenticated = false, workspaces = [] }: SidebarProps) {
  const pathname = usePathname();

  // Determine which navigation items to show based on authentication status
  const navItems = isAuthenticated ? authenticatedNavItems : anonymousNavItems;
  const showBottomNav = isAuthenticated;
  const showAuthNav = !isAuthenticated;

  // Handle keyboard navigation for collapse toggle
  const handleToggleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onToggle();
    }
  };

  return (
    <TooltipProvider delayDuration={0}>
      <aside
        id="main-navigation"
        role="navigation"
        aria-label="Main navigation"
        className={cn(
          "fixed left-0 top-0 z-40 flex h-screen flex-col border-r border-sidebar-border bg-sidebar transition-all duration-300",
          isCollapsed ? "w-16" : "w-64"
        )}
      >
        {/* Logo */}
        <div className="flex h-16 items-center border-b border-sidebar-border px-4">
          <Link 
            href={isAuthenticated ? "/dashboard" : "/"} 
            className="flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-md"
            aria-label={isCollapsed ? "CheckMate - Go to home" : undefined}
          >
            <div className="flex h-8 w-8 items-center justify-center">
              <Logo variant="icon" size={32} />
            </div>
            {!isCollapsed && (
              <span className="text-lg font-semibold text-sidebar-foreground">
                CheckMate
              </span>
            )}
          </Link>
        </div>

        {/* Workspace Switcher - Only show for authenticated users */}
        {isAuthenticated && (
          <div className="border-b border-sidebar-border p-2">
            <WorkspaceSwitcher isCollapsed={isCollapsed} initialWorkspaces={workspaces} />
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 space-y-1 p-2" aria-label="Primary">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
            const Icon = item.icon;

            if (isCollapsed) {
              return (
                <Tooltip key={item.href}>
                  <TooltipTrigger asChild>
                    <Link
                      href={item.href}
                      aria-current={isActive ? "page" : undefined}
                      className={cn(
                        "flex h-10 w-full items-center justify-center rounded-md transition-colors",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                        isActive
                          ? "bg-sidebar-accent text-sidebar-accent-foreground"
                          : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                      )}
                    >
                      <Icon className="h-5 w-5" aria-hidden="true" />
                      <span className="sr-only">{item.title}</span>
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent side="right" className="flex items-center gap-4">
                    {item.title}
                  </TooltipContent>
                </Tooltip>
              );
            }

            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "flex h-10 items-center gap-3 rounded-md px-3 transition-colors",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                  isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                )}
              >
                <Icon className="h-5 w-5" aria-hidden="true" />
                <span className="text-sm font-medium">{item.title}</span>
              </Link>
            );
          })}
        </nav>

        {/* Bottom Navigation - Settings for authenticated users, Auth links for anonymous */}
        <div className="border-t border-sidebar-border p-2">
          {showBottomNav && bottomNavItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;

            if (isCollapsed) {
              return (
                <Tooltip key={item.href}>
                  <TooltipTrigger asChild>
                    <Link
                      href={item.href}
                      aria-current={isActive ? "page" : undefined}
                      className={cn(
                        "flex h-10 w-full items-center justify-center rounded-md transition-colors",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                        isActive
                          ? "bg-sidebar-accent text-sidebar-accent-foreground"
                          : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                      )}
                    >
                      <Icon className="h-5 w-5" aria-hidden="true" />
                      <span className="sr-only">{item.title}</span>
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent side="right" className="flex items-center gap-4">
                    {item.title}
                  </TooltipContent>
                </Tooltip>
              );
            }

            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "flex h-10 items-center gap-3 rounded-md px-3 transition-colors",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                  isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                )}
              >
                <Icon className="h-5 w-5" aria-hidden="true" />
                <span className="text-sm font-medium">{item.title}</span>
              </Link>
            );
          })}
          
          {/* Auth navigation for anonymous users */}
          {showAuthNav && authNavItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;

            if (isCollapsed) {
              return (
                <Tooltip key={item.href}>
                  <TooltipTrigger asChild>
                    <Link
                      href={item.href}
                      aria-current={isActive ? "page" : undefined}
                      className={cn(
                        "flex h-10 w-full items-center justify-center rounded-md transition-colors",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                        isActive
                          ? "bg-sidebar-accent text-sidebar-accent-foreground"
                          : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                      )}
                    >
                      <Icon className="h-5 w-5" aria-hidden="true" />
                      <span className="sr-only">{item.title}</span>
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent side="right" className="flex items-center gap-4">
                    {item.title}
                  </TooltipContent>
                </Tooltip>
              );
            }

            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "flex h-10 items-center gap-3 rounded-md px-3 transition-colors",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                  isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                )}
              >
                <Icon className="h-5 w-5" aria-hidden="true" />
                <span className="text-sm font-medium">{item.title}</span>
              </Link>
            );
          })}
        </div>

        {/* Collapse Toggle */}
        <div className="border-t border-sidebar-border p-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggle}
            onKeyDown={handleToggleKeyDown}
            aria-expanded={!isCollapsed}
            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            className={cn(
              "h-10 w-full text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              isCollapsed ? "justify-center" : "justify-end"
            )}
          >
            {isCollapsed ? (
              <ChevronRight className="h-5 w-5" aria-hidden="true" />
            ) : (
              <ChevronLeft className="h-5 w-5" aria-hidden="true" />
            )}
          </Button>
        </div>
      </aside>
    </TooltipProvider>
  );
}
