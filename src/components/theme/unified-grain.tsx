"use client";

import { useUnifiedThemeStore } from "@/lib/themes/unified-theme-store";
import { useEffect, useState } from "react";

/**
 * UnifiedGrain
 * 
 * Film grain overlay effect component.
 * Reads settings from the unified theme store.
 */
export function UnifiedGrain() {
  const { grainEnabled, grainOpacity, grainSize, grainAnimated } = useUnifiedThemeStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || !grainEnabled) return null;

  const baseFrequency = 0.65 * grainSize;
  const opacity = grainOpacity / 100;

  return (
    <div 
      className="pointer-events-none fixed inset-0 z-[100] mix-blend-overlay"
      style={{ opacity }}
      aria-hidden="true"
    >
      <svg 
        className="h-full w-full" 
        xmlns="http://www.w3.org/2000/svg"
        style={{
          animation: grainAnimated ? 'grain-shift 0.5s steps(10) infinite' : 'none',
        }}
      >
        <defs>
          <filter id="unifiedGrainFilter" x="0%" y="0%" width="100%" height="100%">
            <feTurbulence
              type="fractalNoise"
              baseFrequency={baseFrequency}
              numOctaves={4}
              seed={grainAnimated ? undefined : 1}
              stitchTiles="stitch"
              result="noise"
            />
            <feColorMatrix
              type="saturate"
              values="0"
              in="noise"
              result="monoNoise"
            />
          </filter>
        </defs>
        <rect 
          width="100%" 
          height="100%" 
          filter="url(#unifiedGrainFilter)" 
        />
      </svg>
      <style jsx>{`
        @keyframes grain-shift {
          0%, 100% { transform: translate(0, 0); }
          10% { transform: translate(-1%, -1%); }
          20% { transform: translate(1%, 1%); }
          30% { transform: translate(-1%, 1%); }
          40% { transform: translate(1%, -1%); }
          50% { transform: translate(-1%, 0%); }
          60% { transform: translate(1%, 0%); }
          70% { transform: translate(0%, 1%); }
          80% { transform: translate(0%, -1%); }
          90% { transform: translate(1%, 1%); }
        }
      `}</style>
    </div>
  );
}
