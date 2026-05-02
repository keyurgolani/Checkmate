"use client";

import { Info } from "lucide-react";

interface DemoBannerProps {
  visible: boolean;
}

export function DemoBanner({ visible }: DemoBannerProps) {
  if (!visible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-primary/20 bg-primary/10 backdrop-blur-md">
      <div className="mx-auto flex h-10 max-w-7xl items-center justify-center gap-2 px-4 text-sm text-primary">
        <Info className="h-4 w-4 shrink-0" />
        <span>
          <strong>Demo mode</strong> &mdash; all data is reset when you log out.
        </span>
      </div>
    </div>
  );
}
