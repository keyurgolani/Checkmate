"use client";

/**
 * Mobile Sidebar Component
 *
 * Responsive navigation sidebar for mobile devices.
 * Implements proper keyboard navigation support.
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
  Menu,
  FolderKanban,
  LogIn,
  UserPlus,
  BarChart3,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { LogoLink } from "@/components/ui/logo";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { WorkspaceSwitcher } from "./workspace-switcher";

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  requiresAuth?: boolean;
}

const authenticatedNavItems: NavItem[] = [
  { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard, requiresAuth: true },
  { title: "Templates", href: "/templates", icon: FileText, requiresAuth: true },
  { title: "Checklists", href: "/checklists", icon: ListChecks, requiresAuth: true },
  { title: "Reports", href: "/reports", icon: BarChart3, requiresAuth: true },
  { title: "Workspaces", href: "/workspaces", icon: FolderKanban, requiresAuth: true },
  { title: "Discover", href: "/discover", icon: Search, requiresAuth: false },
];

const anonymousNavItems: NavItem[] = [
  { title: "Discover", href: "/discover", icon: Search, requiresAuth: false },
];

const authNavItems: NavItem[] = [
  { title: "Sign In", href: "/signin", icon: LogIn, requiresAuth: false },
  ...(process.env.NEXT_PUBLIC_SIGNUP_DISABLED !== "true"
    ? [{ title: "Sign Up", href: "/signup", icon: UserPlus, requiresAuth: false }]
    : []),
];

const bottomNavItems: NavItem[] = [
  { title: "Settings", href: "/settings", icon: Settings, requiresAuth: true },
];

interface MobileSidebarProps {
  isAuthenticated?: boolean;
}

export function MobileSidebar({ isAuthenticated = false }: MobileSidebarProps) {
  const pathname = usePathname();
  const [open, setOpen] = React.useState(false);
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const navItems = isAuthenticated ? authenticatedNavItems : anonymousNavItems;
  const showBottomNav = isAuthenticated;
  const showAuthNav = !isAuthenticated;

  if (!mounted) {
    return (
      <Button variant="ghost" size="icon" className="md:hidden rounded-xl" disabled>
        <Menu className="h-5 w-5" />
      </Button>
    );
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden rounded-xl">
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-72 max-w-[85vw] p-0 rounded-r-2xl">
        <SheetHeader className="border-b border-border px-4 py-4">
          <SheetTitle className="flex items-center gap-2">
            <div onClick={() => setOpen(false)}>
                <LogoLink href={isAuthenticated ? "/dashboard" : "/"} size={36} />
            </div>
          </SheetTitle>
          <SheetDescription className="sr-only">Main navigation menu</SheetDescription>
        </SheetHeader>
        
        {isAuthenticated && (
          <div className="border-b border-border p-3">
            <WorkspaceSwitcher isCollapsed={false} />
          </div>
        )}
        
        <nav className="flex flex-col gap-1 p-3">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={cn(
                  "flex h-11 items-center gap-3 rounded-xl px-4 transition-all duration-200",
                  isActive
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <Icon className="h-5 w-5" />
                <span className="text-sm">{item.title}</span>
              </Link>
            );
          })}
        </nav>
        
        <div className="absolute bottom-0 left-0 right-0 border-t border-border p-3">
          {showBottomNav && bottomNavItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={cn(
                  "flex h-11 items-center gap-3 rounded-xl px-4 transition-all duration-200",
                  isActive
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <Icon className="h-5 w-5" />
                <span className="text-sm">{item.title}</span>
              </Link>
            );
          })}
          
          {showAuthNav && authNavItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={cn(
                  "flex h-11 items-center gap-3 rounded-xl px-4 transition-all duration-200",
                  isActive
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <Icon className="h-5 w-5" />
                <span className="text-sm">{item.title}</span>
              </Link>
            );
          })}
        </div>
      </SheetContent>
    </Sheet>
  );
}
