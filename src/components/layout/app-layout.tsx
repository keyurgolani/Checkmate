"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Header } from "./header";
import { SkipLink } from "@/components/ui/skip-link";
import { DemoBanner } from "./demo-banner";
import type { Workspace } from "@/lib/pocketbase-types";

interface PbAuthData {
  token: string;
  model: { id: string; collectionId: string; collectionName: string; [key: string]: unknown };
}

interface AppLayoutProps {
  children: React.ReactNode;
  user?: {
    name?: string;
    email?: string;
    avatarUrl?: string;
  } | null;
  workspaces?: Workspace[];
  pbAuth?: PbAuthData | null;
  isDemo?: boolean;
}

export function AppLayout({ children, user, pbAuth, isDemo }: AppLayoutProps) {
  return (
    <div className="min-h-screen bg-background relative">
      <SkipLink targetId="main-content">Skip to main content</SkipLink>
      <SkipLink targetId="main-navigation" className="focus:top-12">
        Skip to navigation
      </SkipLink>

      <div
        className={cn(
          "flex min-h-screen flex-col transition-all duration-300",
          isDemo && "pb-10"
        )}
      >
        <div>
            <Header user={user} pbAuth={pbAuth} />
        </div>
        
        <main
          id="main-content"
          className="flex-1 px-4 md:px-8 py-6 md:py-8 focus:outline-none w-full"
          tabIndex={-1}
          role="main"
          aria-label="Main content"
        >
          {children}
        </main>
      </div>

      <DemoBanner visible={!!isDemo} />
    </div>
  );
}
