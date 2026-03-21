"use client";

/**
 * Header Component
 *
 * Application header with user menu, notifications, and theme toggle.
 * Implements proper keyboard navigation support.
 *
 * Requirements: 13.2 - Keyboard navigation with logical tab order
 */

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LogOut,
  Settings,
  LayoutDashboard,
  FileText,
  ListChecks,
  FolderKanban,
  Search,
  Loader2,
  BarChart3,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { MobileSidebar } from "./mobile-sidebar";
import { NotificationCenterClient } from "@/components/notifications";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/ui/logo";

interface HeaderProps {
  user?: {
    name?: string;
    email?: string;
    avatarUrl?: string;
  } | null;
}

export function Header({ user }: HeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [mounted, setMounted] = React.useState(false);
  const [signingOut, setSigningOut] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await fetch("/api/auth/signout", { method: "POST" });
      router.push("/signin");
      router.refresh();
    } catch {
      window.location.href = "/signin";
    }
  };

  const isAuthenticated = !!user;
  const initials = user?.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : user?.email?.[0]?.toUpperCase() || "U";

  const navItems = [
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
      title: "Reports",
      href: "/reports",
      icon: BarChart3,
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

  const visibleNavItems = navItems.filter(
    (item) => !item.requiresAuth || (item.requiresAuth && isAuthenticated)
  );

  return (
    <header className="sticky top-0 z-30 flex w-full border-b border-border/50 bg-background/80 backdrop-blur-md">
      <div className="flex w-full h-16 items-center justify-between px-4 md:px-8">
        <div className="flex items-center gap-4">
          <MobileSidebar isAuthenticated={isAuthenticated} />
          {/* Logo - Visible on desktop, hidden on mobile (since sidebar has it) */}
          <Link
            href={isAuthenticated ? "/dashboard" : "/"}
            className="hidden md:flex items-center gap-2 mr-6"
          >
            <Logo variant="icon" size={32} />
            <span className="font-bold text-lg hidden lg:inline-block">
              CheckMate
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            {visibleNavItems.map((item) => {
              const isActive =
                pathname === item.href ||
                (item.href !== "/" && pathname.startsWith(`${item.href}/`));
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-colors",
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.title}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-2">
          {user && <NotificationCenterClient />}
          <ThemeToggle />

          {user ? (
            mounted ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="relative h-10 w-10 rounded-xl"
                  >
                    <Avatar className="h-10 w-10 rounded-xl">
                      <AvatarImage src={user.avatarUrl} alt="" />
                      <AvatarFallback className="rounded-xl bg-primary/10 text-primary font-medium">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  className="w-56 rounded-xl"
                  align="end"
                  forceMount
                >
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      {user.name && (
                        <p className="text-sm font-medium">{user.name}</p>
                      )}
                      {user.email && (
                        <p className="text-xs text-muted-foreground">
                          {user.email}
                        </p>
                      )}
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild className="rounded-lg">
                    <Link href="/settings" className="flex items-center">
                      <Settings className="mr-2 h-4 w-4" />
                      Settings
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="rounded-lg text-destructive focus:text-destructive cursor-pointer"
                    onClick={handleSignOut}
                    disabled={signingOut}
                  >
                    {signingOut ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <LogOut className="mr-2 h-4 w-4" />
                    )}
                    {signingOut ? "Signing out..." : "Sign out"}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button
                variant="ghost"
                className="relative h-10 w-10 rounded-xl"
                disabled
              >
                <Avatar className="h-10 w-10 rounded-xl">
                  <AvatarImage src={user.avatarUrl} alt="" />
                  <AvatarFallback className="rounded-xl">
                    {initials}
                  </AvatarFallback>
                </Avatar>
              </Button>
            )
          ) : (
            <div className="hidden sm:flex items-center gap-2">
              <Button variant="ghost" asChild className="rounded-xl">
                <Link href="/signin">Sign in</Link>
              </Button>
              <Button asChild className="rounded-xl">
                <Link href="/signup">Sign up</Link>
              </Button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
