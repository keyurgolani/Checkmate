"use client";

/**
 * Live Region Component
 *
 * Provides ARIA live regions for announcing status updates to screen readers.
 * Supports different politeness levels and announcement types.
 *
 * Requirements: 13.3, 13.4
 * - Add live regions for status updates
 * - Announce state changes to screen readers
 */

import * as React from "react";
import { cn } from "@/lib/utils";

// ============================================================================
// Types
// ============================================================================

export type LiveRegionPoliteness = "polite" | "assertive" | "off";

export interface LiveRegionProps {
  /** The message to announce */
  message: string;
  /** Politeness level - "polite" waits for user to finish, "assertive" interrupts */
  politeness?: LiveRegionPoliteness;
  /** Whether to clear the message after announcing */
  clearOnAnnounce?: boolean;
  /** Delay in ms before clearing (if clearOnAnnounce is true) */
  clearDelay?: number;
  /** Additional CSS classes */
  className?: string;
  /** Whether the region is atomic (announces entire region on change) */
  atomic?: boolean;
  /** Relevant changes to announce */
  relevant?: "additions" | "removals" | "text" | "all";
}

// ============================================================================
// Live Region Component
// ============================================================================

/**
 * LiveRegion - Announces messages to screen readers
 * 
 * Use "polite" for non-urgent updates (form success, progress updates)
 * Use "assertive" for urgent updates (errors, critical alerts)
 */
export function LiveRegion({
  message,
  politeness = "polite",
  clearOnAnnounce = true,
  clearDelay = 1000,
  className,
  atomic = true,
  relevant = "additions",
}: LiveRegionProps) {
  const [announcement, setAnnouncement] = React.useState(message);

  React.useEffect(() => {
    setAnnouncement(message);

    if (clearOnAnnounce && message) {
      const timer = setTimeout(() => {
        setAnnouncement("");
      }, clearDelay);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [message, clearOnAnnounce, clearDelay]);

  return (
    <div
      role="status"
      aria-live={politeness}
      aria-atomic={atomic}
      aria-relevant={relevant}
      className={cn("sr-only", className)}
    >
      {announcement}
    </div>
  );
}

// ============================================================================
// Status Announcer Hook
// ============================================================================

export interface UseStatusAnnouncerOptions {
  /** Default politeness level */
  defaultPoliteness?: LiveRegionPoliteness;
  /** Delay before clearing announcements */
  clearDelay?: number;
}

export interface StatusAnnouncerReturn {
  /** Current announcement message */
  message: string;
  /** Current politeness level */
  politeness: LiveRegionPoliteness;
  /** Announce a message politely (waits for user) */
  announce: (message: string) => void;
  /** Announce a message assertively (interrupts) */
  announceAssertive: (message: string) => void;
  /** Clear the current announcement */
  clear: () => void;
}

/**
 * Hook for managing status announcements
 * 
 * @example
 * const { message, politeness, announce, announceAssertive } = useStatusAnnouncer();
 * 
 * // In your component
 * <LiveRegion message={message} politeness={politeness} />
 * 
 * // When something happens
 * announce("Item saved successfully");
 * announceAssertive("Error: Failed to save");
 */
export function useStatusAnnouncer(
  options: UseStatusAnnouncerOptions = {}
): StatusAnnouncerReturn {
  const { defaultPoliteness = "polite", clearDelay = 3000 } = options;

  const [message, setMessage] = React.useState("");
  const [politeness, setPoliteness] = React.useState<LiveRegionPoliteness>(defaultPoliteness);
  const timeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  const clear = React.useCallback(() => {
    setMessage("");
  }, []);

  const announce = React.useCallback(
    (newMessage: string) => {
      // Clear any existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      setPoliteness("polite");
      setMessage(newMessage);

      // Auto-clear after delay
      timeoutRef.current = setTimeout(clear, clearDelay);
    },
    [clear, clearDelay]
  );

  const announceAssertive = React.useCallback(
    (newMessage: string) => {
      // Clear any existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      setPoliteness("assertive");
      setMessage(newMessage);

      // Auto-clear after delay
      timeoutRef.current = setTimeout(clear, clearDelay);
    },
    [clear, clearDelay]
  );

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return {
    message,
    politeness,
    announce,
    announceAssertive,
    clear,
  };
}

// ============================================================================
// Status Announcer Context
// ============================================================================

interface StatusAnnouncerContextValue extends StatusAnnouncerReturn {}

const StatusAnnouncerContext = React.createContext<StatusAnnouncerContextValue | null>(null);

/**
 * Provider for global status announcements
 * Wrap your app with this to enable useGlobalAnnouncer hook
 */
export function StatusAnnouncerProvider({ children }: { children: React.ReactNode }) {
  const announcer = useStatusAnnouncer();

  return (
    <StatusAnnouncerContext.Provider value={announcer}>
      {children}
      <LiveRegion
        message={announcer.message}
        politeness={announcer.politeness}
        clearOnAnnounce={false}
      />
    </StatusAnnouncerContext.Provider>
  );
}

/**
 * Hook to access the global status announcer
 * Must be used within StatusAnnouncerProvider
 */
export function useGlobalAnnouncer(): StatusAnnouncerReturn {
  const context = React.useContext(StatusAnnouncerContext);
  if (!context) {
    throw new Error("useGlobalAnnouncer must be used within StatusAnnouncerProvider");
  }
  return context;
}

// ============================================================================
// Preset Announcement Components
// ============================================================================

interface AnnouncementProps {
  /** The message to announce */
  children: string;
  /** Whether to show the announcement visually as well */
  visible?: boolean;
  /** Additional CSS classes for visible announcements */
  className?: string;
}

/**
 * Polite announcement - for non-urgent status updates
 */
export function PoliteAnnouncement({ children, visible = false, className }: AnnouncementProps) {
  if (visible) {
    return (
      <div role="status" aria-live="polite" className={className}>
        {children}
      </div>
    );
  }

  return <LiveRegion message={children} politeness="polite" />;
}

/**
 * Assertive announcement - for urgent updates like errors
 */
export function AssertiveAnnouncement({ children, visible = false, className }: AnnouncementProps) {
  if (visible) {
    return (
      <div role="alert" aria-live="assertive" className={className}>
        {children}
      </div>
    );
  }

  return <LiveRegion message={children} politeness="assertive" />;
}
