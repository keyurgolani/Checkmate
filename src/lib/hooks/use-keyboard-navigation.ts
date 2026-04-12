/**
 * Keyboard Navigation Hooks
 *
 * Provides utilities for implementing accessible keyboard navigation
 * throughout the application.
 *
 * Requirements: 13.2 - Keyboard navigation support
 */

import { useCallback, useEffect, useRef } from "react";

// ============================================================================
// Types
// ============================================================================

interface KeyboardShortcut {
  /** Key to trigger the shortcut (e.g., 'k', 'Enter', 'Escape') */
  key: string;
  /** Whether Ctrl/Cmd key must be pressed */
  ctrlOrCmd?: boolean;
  /** Whether Shift key must be pressed */
  shift?: boolean;
  /** Whether Alt key must be pressed */
  alt?: boolean;
  /** Callback to execute when shortcut is triggered */
  callback: (event: KeyboardEvent) => void;
  /** Description for accessibility */
  description?: string;
  /** Whether to prevent default browser behavior */
  preventDefault?: boolean;
}

interface FocusTrapOptions {
  /** Whether the focus trap is active */
  enabled?: boolean;
  /** Initial element to focus when trap activates */
  initialFocus?: HTMLElement | null;
  /** Element to return focus to when trap deactivates */
  returnFocus?: HTMLElement | null;
  /** Whether to allow focus to escape on Escape key */
  escapeDeactivates?: boolean;
  /** Callback when escape is pressed */
  onEscape?: () => void;
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Get all focusable elements within a container
 */
export function getFocusableElements(container: HTMLElement): HTMLElement[] {
  const focusableSelectors = [
    'a[href]:not([disabled]):not([tabindex="-1"])',
    'button:not([disabled]):not([tabindex="-1"])',
    'input:not([disabled]):not([tabindex="-1"])',
    'select:not([disabled]):not([tabindex="-1"])',
    'textarea:not([disabled]):not([tabindex="-1"])',
    '[tabindex]:not([tabindex="-1"]):not([disabled])',
    '[contenteditable="true"]:not([disabled])',
  ].join(", ");

  const elements = Array.from(
    container.querySelectorAll<HTMLElement>(focusableSelectors)
  );

  // Filter out hidden elements
  return elements.filter((el) => {
    const style = window.getComputedStyle(el);
    return (
      style.display !== "none" &&
      style.visibility !== "hidden" &&
      el.offsetParent !== null
    );
  });
}

/**
 * Check if an element is focusable
 */
export function isFocusable(element: HTMLElement): boolean {
  const focusableElements = getFocusableElements(
    element.parentElement || document.body
  );
  return focusableElements.includes(element);
}

/**
 * Move focus to the next/previous focusable element
 */
export function moveFocus(
  container: HTMLElement,
  direction: "next" | "previous"
): void {
  const focusableElements = getFocusableElements(container);
  if (focusableElements.length === 0) return;

  const currentIndex = focusableElements.indexOf(
    document.activeElement as HTMLElement
  );

  let nextIndex: number;
  if (direction === "next") {
    nextIndex =
      currentIndex === -1 || currentIndex === focusableElements.length - 1
        ? 0
        : currentIndex + 1;
  } else {
    nextIndex =
      currentIndex === -1 || currentIndex === 0
        ? focusableElements.length - 1
        : currentIndex - 1;
  }

  focusableElements[nextIndex]?.focus();
}

// ============================================================================
// Hooks
// ============================================================================

/**
 * Hook for registering keyboard shortcuts
 *
 * @example
 * useKeyboardShortcuts([
 *   { key: 'k', ctrlOrCmd: true, callback: () => openSearch() },
 *   { key: 'Escape', callback: () => closeModal() },
 * ]);
 */
export function useKeyboardShortcuts(shortcuts: KeyboardShortcut[]): void {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in inputs
      const target = event.target as HTMLElement;
      const isInput =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable;

      for (const shortcut of shortcuts) {
        const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0;
        const ctrlOrCmdPressed = isMac ? event.metaKey : event.ctrlKey;

        const keyMatches =
          event.key.toLowerCase() === shortcut.key.toLowerCase();
        const ctrlOrCmdMatches = shortcut.ctrlOrCmd
          ? ctrlOrCmdPressed
          : !ctrlOrCmdPressed;
        const shiftMatches = shortcut.shift ? event.shiftKey : !event.shiftKey;
        const altMatches = shortcut.alt ? event.altKey : !event.altKey;

        // Allow Escape to work even in inputs
        const allowInInput = shortcut.key === "Escape";

        if (
          keyMatches &&
          ctrlOrCmdMatches &&
          shiftMatches &&
          altMatches &&
          (!isInput || allowInInput)
        ) {
          if (shortcut.preventDefault !== false) {
            event.preventDefault();
          }
          shortcut.callback(event);
          break;
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [shortcuts]);
}

/**
 * Hook for creating a focus trap within a container
 *
 * @example
 * const trapRef = useFocusTrap({ enabled: isOpen, onEscape: close });
 * return <div ref={trapRef}>...</div>;
 */
export function useFocusTrap(options: FocusTrapOptions = {}) {
  const {
    enabled = true,
    initialFocus,
    returnFocus,
    escapeDeactivates = true,
    onEscape,
  } = options;

  const containerRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);

  // Store the previously focused element when trap activates
  useEffect(() => {
    if (enabled) {
      previousActiveElement.current = document.activeElement as HTMLElement;

      // Focus initial element or first focusable element
      const container = containerRef.current;
      if (container) {
        const focusTarget =
          initialFocus || getFocusableElements(container)[0];
        focusTarget?.focus();
      }
    }

    return () => {
      // Return focus when trap deactivates
      if (enabled) {
        const returnTarget = returnFocus || previousActiveElement.current;
        returnTarget?.focus();
      }
    };
  }, [enabled, initialFocus, returnFocus]);

  // Handle keyboard navigation within the trap
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      const container = containerRef.current;
      if (!container) return;

      // Handle Escape key
      if (event.key === "Escape" && escapeDeactivates) {
        event.preventDefault();
        onEscape?.();
        return;
      }

      // Handle Tab key for focus trapping
      if (event.key === "Tab") {
        const focusableElements = getFocusableElements(container);
        if (focusableElements.length === 0) {
          event.preventDefault();
          return;
        }

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (event.shiftKey) {
          // Shift+Tab: move backwards
          if (document.activeElement === firstElement) {
            event.preventDefault();
            lastElement?.focus();
          }
        } else {
          // Tab: move forwards
          if (document.activeElement === lastElement) {
            event.preventDefault();
            firstElement?.focus();
          }
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [enabled, escapeDeactivates, onEscape]);

  return containerRef;
}

/**
 * Hook for arrow key navigation in lists
 *
 * @example
 * const { containerProps, getItemProps } = useArrowNavigation({
 *   itemCount: items.length,
 *   onSelect: (index) => selectItem(index),
 * });
 */
export function useArrowNavigation(options: {
  itemCount: number;
  onSelect?: (index: number) => void;
  orientation?: "vertical" | "horizontal" | "both";
  loop?: boolean;
}) {
  const {
    itemCount,
    onSelect,
    orientation = "vertical",
    loop = true,
  } = options;

  const currentIndexRef = useRef(0);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      const isVertical = orientation === "vertical" || orientation === "both";
      const isHorizontal =
        orientation === "horizontal" || orientation === "both";

      let newIndex = currentIndexRef.current;
      let handled = false;

      if (
        (event.key === "ArrowDown" && isVertical) ||
        (event.key === "ArrowRight" && isHorizontal)
      ) {
        newIndex = currentIndexRef.current + 1;
        if (newIndex >= itemCount) {
          newIndex = loop ? 0 : itemCount - 1;
        }
        handled = true;
      } else if (
        (event.key === "ArrowUp" && isVertical) ||
        (event.key === "ArrowLeft" && isHorizontal)
      ) {
        newIndex = currentIndexRef.current - 1;
        if (newIndex < 0) {
          newIndex = loop ? itemCount - 1 : 0;
        }
        handled = true;
      } else if (event.key === "Home") {
        newIndex = 0;
        handled = true;
      } else if (event.key === "End") {
        newIndex = itemCount - 1;
        handled = true;
      } else if (event.key === "Enter" || event.key === " ") {
        onSelect?.(currentIndexRef.current);
        handled = true;
      }

      if (handled) {
        event.preventDefault();
        currentIndexRef.current = newIndex;
      }
    },
    [itemCount, onSelect, orientation, loop]
  );

  const setCurrentIndex = useCallback((index: number) => {
    currentIndexRef.current = index;
  }, []);

  return {
    containerProps: {
      onKeyDown: handleKeyDown,
      role: "listbox" as const,
      tabIndex: 0,
    },
    getItemProps: (index: number) => ({
      role: "option" as const,
      "aria-selected": index === currentIndexRef.current,
      tabIndex: index === currentIndexRef.current ? 0 : -1,
      onFocus: () => setCurrentIndex(index),
    }),
    currentIndex: currentIndexRef.current,
    setCurrentIndex,
  };
}

/**
 * Hook for roving tabindex pattern
 * Useful for toolbars, tab lists, and other composite widgets
 */
export function useRovingTabIndex(options: {
  itemCount: number;
  orientation?: "vertical" | "horizontal";
  loop?: boolean;
}) {
  const { itemCount, orientation = "horizontal", loop = true } = options;
  const currentIndexRef = useRef(0);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent, index: number) => {
      const isNext =
        (orientation === "horizontal" && event.key === "ArrowRight") ||
        (orientation === "vertical" && event.key === "ArrowDown");
      const isPrev =
        (orientation === "horizontal" && event.key === "ArrowLeft") ||
        (orientation === "vertical" && event.key === "ArrowUp");

      let newIndex = index;

      if (isNext) {
        newIndex = index + 1;
        if (newIndex >= itemCount) {
          newIndex = loop ? 0 : itemCount - 1;
        }
      } else if (isPrev) {
        newIndex = index - 1;
        if (newIndex < 0) {
          newIndex = loop ? itemCount - 1 : 0;
        }
      } else if (event.key === "Home") {
        newIndex = 0;
      } else if (event.key === "End") {
        newIndex = itemCount - 1;
      } else {
        return; // Don't prevent default for other keys
      }

      event.preventDefault();
      currentIndexRef.current = newIndex;

      // Focus the new element
      const container = (event.target as HTMLElement).parentElement;
      if (container) {
        const items = getFocusableElements(container);
        items[newIndex]?.focus();
      }
    },
    [itemCount, orientation, loop]
  );

  return {
    getItemProps: (index: number) => ({
      tabIndex: index === currentIndexRef.current ? 0 : -1,
      onKeyDown: (e: React.KeyboardEvent) => handleKeyDown(e, index),
    }),
  };
}
