"use client";

import * as React from "react";
import { useTheme } from "next-themes";
import { useUnifiedThemeStore } from "@/lib/themes/unified-theme-store";
import {
  colorThemes,
  fontThemes,
  designLanguages,
  generateThemeCssVariables,
} from "@/lib/themes";

/**
 * UnifiedThemeProvider
 * 
 * Single provider that handles all theme application:
 * - CSS variable generation and application
 * - Google Font loading
 * - Design language CSS injection
 * - Dark/light mode sync with next-themes
 */
export function UnifiedThemeProvider({ children }: { children: React.ReactNode }) {
  const { setTheme } = useTheme();
  const store = useUnifiedThemeStore();
  
  // Track previous color theme to avoid unnecessary setTheme calls
  const prevColorThemeIdRef = React.useRef<string | null>(null);

  // Sync with next-themes when color theme changes (separate effect to avoid infinite loop)
  React.useEffect(() => {
    const activeColorTheme = colorThemes[store.colorThemeId];
    if (!activeColorTheme) return;
    
    // Only sync when the color theme actually changed
    if (prevColorThemeIdRef.current !== store.colorThemeId) {
      prevColorThemeIdRef.current = store.colorThemeId;
      setTheme(activeColorTheme.mode);
    }
  }, [store.colorThemeId, setTheme]);

  // Apply theme changes to DOM (CSS variables, fonts, design language)
  React.useEffect(() => {
    const root = document.documentElement;
    
    // Get active themes with fallbacks
    const activeColorTheme = colorThemes[store.colorThemeId] || colorThemes.dark;
    const activeFontTheme = fontThemes[store.fontThemeId] || fontThemes.inter;
    const designConfig = designLanguages[store.designLanguage] || designLanguages.default;
    
    if (!activeColorTheme || !activeFontTheme) return;

    // Merge effects with design language defaults
    const mergedEffects = {
      ...(designConfig?.defaultEffects || {}),
      ...store.effects,
      grainOpacity: store.grainEnabled ? store.grainOpacity : 0,
      grainSize: store.grainSize,
    };

    // Generate and apply CSS variables
    const cssVars = generateThemeCssVariables(
      activeColorTheme,
      activeFontTheme,
      mergedEffects as any
    );

    Object.entries(cssVars).forEach(([key, value]) => {
      root.style.setProperty(key, value);
    });

    // Set data attributes
    root.setAttribute('data-design', store.designLanguage);
    root.setAttribute('data-theme-mode', activeColorTheme.mode);
    root.setAttribute('data-bg-pattern', store.backgroundPattern);
    root.style.setProperty('--bg-pattern-opacity', (store.backgroundPatternOpacity / 100).toString());

    // Sync dark/light class with Tailwind
    if (activeColorTheme.mode === 'dark') {
      root.classList.add('dark');
      root.classList.remove('light');
    } else {
      root.classList.add('light');
      root.classList.remove('dark');
    }

    // Load Google Font if needed
    if (activeFontTheme.googleFontUrl) {
      const existingLink = document.querySelector(`link[href="${activeFontTheme.googleFontUrl}"]`);
      if (!existingLink) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = activeFontTheme.googleFontUrl;
        document.head.appendChild(link);
      }
    }

    // Inject design language CSS overrides
    const styleId = 'unified-theme-overrides';
    let styleEl = document.getElementById(styleId) as HTMLStyleElement;
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = styleId;
      document.head.appendChild(styleEl);
    }
    styleEl.textContent = designConfig?.cssOverrides || '';

  }, [
    store.colorThemeId,
    store.fontThemeId,
    store.designLanguage,
    store.effects,
    store.grainEnabled,
    store.grainOpacity,
    store.grainSize,
    store.backgroundPattern,
    store.backgroundPatternOpacity,
  ]);

  return <>{children}</>;
}
