"use client";

import { useUnifiedThemeStore } from "@/lib/themes/unified-theme-store";
import { useEffect, useState } from "react";

/**
 * UnifiedBackground
 * 
 * Background pattern overlay component.
 * Reads settings from the unified theme store.
 */
export function UnifiedBackground() {
  const { backgroundPattern, backgroundPatternOpacity } = useUnifiedThemeStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || backgroundPattern === 'none') return null;

  const opacity = backgroundPatternOpacity / 100;

  const patterns: Record<string, React.ReactNode> = {
    dots: (
      <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="unified-dots-pattern" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="1" fill="currentColor" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#unified-dots-pattern)" />
      </svg>
    ),
    grid: (
      <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="unified-grid-pattern" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#unified-grid-pattern)" />
      </svg>
    ),
    noise: (
      <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <filter id="unified-bg-noise">
            <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="4" stitchTiles="stitch" />
            <feColorMatrix type="saturate" values="0" />
          </filter>
        </defs>
        <rect width="100%" height="100%" filter="url(#unified-bg-noise)" />
      </svg>
    ),
    gradient: (
      <div 
        className="absolute inset-0"
        style={{
          background: `
            radial-gradient(ellipse at top left, var(--primary) 0%, transparent 50%),
            radial-gradient(ellipse at bottom right, var(--secondary) 0%, transparent 50%)
          `,
        }}
      />
    ),
  };

  return (
    <div 
      className="pointer-events-none fixed inset-0 z-[-1] text-foreground/20"
      style={{ opacity }}
      aria-hidden="true"
    >
      {patterns[backgroundPattern]}
    </div>
  );
}
