"use client";

/**
 * App Layout Component
 *
 * Main application layout with sidebar, header, and content area.
 * Implements proper landmark regions and keyboard navigation support.
 *
 * Requirements: 13.2 - Keyboard navigation with logical tab order
 */

import * as React from "react";
import { cn } from "@/lib/utils";
import { Header } from "./header";
import { SkipLink } from "@/components/ui/skip-link";
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
}

export function AppLayout({ children, user, pbAuth }: AppLayoutProps) {
  return (
    <div className="min-h-screen bg-background relative">
      {/* Skip links for keyboard navigation - Requirements: 13.2 */}
      <SkipLink targetId="main-content">Skip to main content</SkipLink>
      <SkipLink targetId="main-navigation" className="focus:top-12">
        Skip to navigation
      </SkipLink>

      {/* Main content area */}
      <div
        className={cn(
          "flex min-h-screen flex-col transition-all duration-300"
        )}
      >
        {/* Header (Visible on Desktop and Mobile) */}
        <div>
            <Header user={user} pbAuth={pbAuth} />
        </div>
        
        {/* Main content with landmark role and id for skip link target */}
        <main
          id="main-content"
          className="flex-1 px-4 md:px-8 py-6 md:py-8 focus:outline-none pb-12 w-full"
          tabIndex={-1}
          role="main"
          aria-label="Main content"
        >
          {children}
        </main>
      </div>
    </div>
  );
}
