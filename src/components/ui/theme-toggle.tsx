"use client";

/**
 * Theme Toggle Component
 *
 * Opens the unified theme customizer modal.
 * Uses the unified theme store for consistent theming across the app.
 * Includes proper ARIA labels for accessibility.
 *
 * Requirements: 13.3 - Proper ARIA labels for interactive elements
 * Requirements: 14.1 - Light and dark theme options
 */

import * as React from "react";
import { Paintbrush } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useUnifiedThemeStore } from "@/lib/themes/unified-theme-store";

export function ThemeToggle() {
  const store = useUnifiedThemeStore();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <Button 
        variant="ghost" 
        size="icon" 
        disabled
        aria-label="Open theme customizer (loading)"
      >
        <Paintbrush className="h-5 w-5" aria-hidden="true" />
      </Button>
    );
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={store.openThemePopup}
      aria-label="Open theme customizer"
      aria-haspopup="dialog"
      title="Customize theme"
    >
      <Paintbrush className="h-5 w-5" aria-hidden="true" />
    </Button>
  );
}
