"use client";

import * as React from "react";
import Link from "next/link";
import { LogOut, Settings } from "lucide-react";
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
import { NotificationCenterClient } from "@/components/notifications";

interface DesktopNavControlsProps {
  user?: {
    name?: string;
    email?: string;
    avatarUrl?: string;
  } | null;
}

export function DesktopNavControls({ user }: DesktopNavControlsProps) {
  const [mounted, setMounted] = React.useState(false);
  
  React.useEffect(() => {
    setMounted(true);
  }, []);

  const initials = user?.name
    ? user.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : user?.email?.[0]?.toUpperCase() || "U";

  if (!user) {
    return (
      <div className="flex items-center gap-2 p-1.5 rounded-[var(--radius)] border border-border/40 bg-background/60 backdrop-blur-md shadow-sm">
        <ThemeToggle />
        <Button variant="ghost" asChild className="rounded-[var(--radius)] h-9">
          <Link href="/signin">Sign in</Link>
        </Button>
        <Button asChild className="rounded-[var(--radius)] h-9">
          <Link href="/signup">Sign up</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 p-1.5 rounded-[var(--radius)] border border-border/40 bg-background/95 backdrop-blur-md shadow-sm transition-all hover:bg-background hover:shadow-md hover:border-border/60 overflow-hidden">
      <NotificationCenterClient />
      <ThemeToggle />
      
      <div className="h-4 w-px bg-border/50 mx-1" />

      {mounted ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-9 w-9 rounded-[var(--radius)] p-0 hover:bg-transparent">
              <Avatar className="h-9 w-9 rounded-[var(--radius)] transition-transform hover:scale-105">
                <AvatarImage src={user.avatarUrl} alt="" />
                <AvatarFallback className="rounded-[var(--radius)] bg-primary/10 text-primary font-medium text-xs">
                  {initials}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56 rounded-[var(--radius)] border-border/50 bg-background/95 backdrop-blur-xl shadow-xl" align="end" forceMount>
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                {user.name && <p className="text-sm font-medium">{user.name}</p>}
                {user.email && <p className="text-xs text-muted-foreground">{user.email}</p>}
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild className="rounded-xl">
              <Link href="/settings" className="flex items-center cursor-pointer">
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild className="rounded-xl text-destructive focus:text-destructive focus:bg-destructive/10">
              <Link href="/api/auth/signout" className="flex items-center cursor-pointer">
                <LogOut className="mr-2 h-4 w-4" />
                Sign out
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : (
        <Button variant="ghost" className="relative h-9 w-9 rounded-xl p-0" disabled>
          <Avatar className="h-9 w-9 rounded-xl">
            <AvatarImage src={user.avatarUrl} alt="" />
            <AvatarFallback className="rounded-xl text-xs">{initials}</AvatarFallback>
          </Avatar>
        </Button>
      )}
    </div>
  );
}
