/**
 * Realtime Hooks
 * 
 * React hooks for PocketBase realtime subscriptions.
 * Provides easy-to-use hooks for subscribing to:
 * - Template changes for collaborators
 * - Checklist progress updates
 * 
 * Requirements: 12.4
 */

'use client';

import { useEffect, useRef, useCallback } from 'react';
import {
  RealtimeService,
  getRealtimeService,
  TemplateChangeCallback,
  TemplateItemChangeCallback,
  ChecklistChangeCallback,
  ChecklistItemChangeCallback,
  CollaboratorChangeCallback,
  NotificationChangeCallback,
  SubscriptionHandle,
} from '../services/realtime';

// ============================================================================
// Hook Options Types
// ============================================================================

interface UseRealtimeOptions {
  /** Whether the subscription is enabled (default: true) */
  enabled?: boolean;
}

// ============================================================================
// Template Hooks
// ============================================================================

/**
 * Hook to subscribe to template changes.
 * Automatically handles subscription lifecycle.
 * 
 * Requirements: 12.4
 * 
 * @param templateId - The template ID to subscribe to
 * @param onTemplateChange - Callback when template changes
 * @param options - Hook options
 * 
 * @example
 * ```tsx
 * useTemplateChanges(templateId, (event) => {
 *   if (event.action === 'update') {
 *     setTemplate(event.record);
 *   }
 * });
 * ```
 */
export function useTemplateChanges(
  templateId: string | null | undefined,
  onTemplateChange: TemplateChangeCallback,
  options: UseRealtimeOptions = {}
): void {
  const { enabled = true } = options;
  const callbackRef = useRef(onTemplateChange);
  const subscriptionRef = useRef<SubscriptionHandle | null>(null);

  // Keep callback ref updated
  useEffect(() => {
    callbackRef.current = onTemplateChange;
  }, [onTemplateChange]);

  useEffect(() => {
    if (!templateId || !enabled) {
      return;
    }

    const realtimeService = getRealtimeService();

    const subscribe = async () => {
      try {
        subscriptionRef.current = await realtimeService.subscribeToTemplateChanges(
          templateId,
          (event) => callbackRef.current(event)
        );
      } catch (error) {
        console.error('Failed to subscribe to template changes:', error);
      }
    };

    subscribe();

    return () => {
      subscriptionRef.current?.unsubscribe();
      subscriptionRef.current = null;
    };
  }, [templateId, enabled]);
}

/**
 * Hook to subscribe to template item changes.
 * Automatically handles subscription lifecycle.
 * 
 * Requirements: 12.4
 * 
 * @param templateId - The template ID whose items to subscribe to
 * @param onItemChange - Callback when items change
 * @param options - Hook options
 * 
 * @example
 * ```tsx
 * useTemplateItemChanges(templateId, (event) => {
 *   if (event.action === 'create') {
 *     setItems(prev => [...prev, event.record]);
 *   }
 * });
 * ```
 */
export function useTemplateItemChanges(
  templateId: string | null | undefined,
  onItemChange: TemplateItemChangeCallback,
  options: UseRealtimeOptions = {}
): void {
  const { enabled = true } = options;
  const callbackRef = useRef(onItemChange);
  const subscriptionRef = useRef<SubscriptionHandle | null>(null);

  // Keep callback ref updated
  useEffect(() => {
    callbackRef.current = onItemChange;
  }, [onItemChange]);

  useEffect(() => {
    if (!templateId || !enabled) {
      return;
    }

    const realtimeService = getRealtimeService();

    const subscribe = async () => {
      try {
        subscriptionRef.current = await realtimeService.subscribeToTemplateItems(
          templateId,
          (event) => callbackRef.current(event)
        );
      } catch (error) {
        console.error('Failed to subscribe to template item changes:', error);
      }
    };

    subscribe();

    return () => {
      subscriptionRef.current?.unsubscribe();
      subscriptionRef.current = null;
    };
  }, [templateId, enabled]);
}

/**
 * Hook to subscribe to collaborator changes for a template.
 * Automatically handles subscription lifecycle.
 * 
 * Requirements: 12.4
 * 
 * @param templateId - The template ID whose collaborators to subscribe to
 * @param onCollaboratorChange - Callback when collaborators change
 * @param options - Hook options
 * 
 * @example
 * ```tsx
 * useCollaboratorChanges(templateId, (event) => {
 *   if (event.action === 'create') {
 *     setCollaborators(prev => [...prev, event.record]);
 *   }
 * });
 * ```
 */
export function useCollaboratorChanges(
  templateId: string | null | undefined,
  onCollaboratorChange: CollaboratorChangeCallback,
  options: UseRealtimeOptions = {}
): void {
  const { enabled = true } = options;
  const callbackRef = useRef(onCollaboratorChange);
  const subscriptionRef = useRef<SubscriptionHandle | null>(null);

  // Keep callback ref updated
  useEffect(() => {
    callbackRef.current = onCollaboratorChange;
  }, [onCollaboratorChange]);

  useEffect(() => {
    if (!templateId || !enabled) {
      return;
    }

    const realtimeService = getRealtimeService();

    const subscribe = async () => {
      try {
        subscriptionRef.current = await realtimeService.subscribeToCollaboratorChanges(
          templateId,
          (event) => callbackRef.current(event)
        );
      } catch (error) {
        console.error('Failed to subscribe to collaborator changes:', error);
      }
    };

    subscribe();

    return () => {
      subscriptionRef.current?.unsubscribe();
      subscriptionRef.current = null;
    };
  }, [templateId, enabled]);
}

// ============================================================================
// Checklist Hooks
// ============================================================================

/**
 * Hook to subscribe to checklist changes.
 * Automatically handles subscription lifecycle.
 * 
 * Requirements: 12.4
 * 
 * @param checklistId - The checklist ID to subscribe to
 * @param onChecklistChange - Callback when checklist changes
 * @param options - Hook options
 * 
 * @example
 * ```tsx
 * useChecklistChanges(checklistId, (event) => {
 *   if (event.action === 'update') {
 *     setChecklist(event.record);
 *   }
 * });
 * ```
 */
export function useChecklistChanges(
  checklistId: string | null | undefined,
  onChecklistChange: ChecklistChangeCallback,
  options: UseRealtimeOptions = {}
): void {
  const { enabled = true } = options;
  const callbackRef = useRef(onChecklistChange);
  const subscriptionRef = useRef<SubscriptionHandle | null>(null);

  // Keep callback ref updated
  useEffect(() => {
    callbackRef.current = onChecklistChange;
  }, [onChecklistChange]);

  useEffect(() => {
    if (!checklistId || !enabled) {
      return;
    }

    const realtimeService = getRealtimeService();

    const subscribe = async () => {
      try {
        subscriptionRef.current = await realtimeService.subscribeToChecklistChanges(
          checklistId,
          (event) => callbackRef.current(event)
        );
      } catch (error) {
        console.error('Failed to subscribe to checklist changes:', error);
      }
    };

    subscribe();

    return () => {
      subscriptionRef.current?.unsubscribe();
      subscriptionRef.current = null;
    };
  }, [checklistId, enabled]);
}

/**
 * Hook to subscribe to checklist item changes for progress tracking.
 * Automatically handles subscription lifecycle.
 * 
 * Requirements: 12.4
 * 
 * @param checklistId - The checklist ID whose items to subscribe to
 * @param onItemChange - Callback when checklist items change
 * @param options - Hook options
 * 
 * @example
 * ```tsx
 * useChecklistItemChanges(checklistId, (event) => {
 *   if (event.action === 'update' && event.record.isCompleted) {
 *     // Item was completed
 *     updateProgress();
 *   }
 * });
 * ```
 */
export function useChecklistItemChanges(
  checklistId: string | null | undefined,
  onItemChange: ChecklistItemChangeCallback,
  options: UseRealtimeOptions = {}
): void {
  const { enabled = true } = options;
  const callbackRef = useRef(onItemChange);
  const subscriptionRef = useRef<SubscriptionHandle | null>(null);

  // Keep callback ref updated
  useEffect(() => {
    callbackRef.current = onItemChange;
  }, [onItemChange]);

  useEffect(() => {
    if (!checklistId || !enabled) {
      return;
    }

    const realtimeService = getRealtimeService();

    const subscribe = async () => {
      try {
        subscriptionRef.current = await realtimeService.subscribeToChecklistItems(
          checklistId,
          (event) => callbackRef.current(event)
        );
      } catch (error) {
        console.error('Failed to subscribe to checklist item changes:', error);
      }
    };

    subscribe();

    return () => {
      subscriptionRef.current?.unsubscribe();
      subscriptionRef.current = null;
    };
  }, [checklistId, enabled]);
}

/**
 * Hook to subscribe to all checklists for the current user.
 * Useful for dashboard progress updates.
 * 
 * Requirements: 12.4
 * 
 * @param userId - The user ID whose checklists to subscribe to
 * @param onChecklistChange - Callback when any user checklist changes
 * @param options - Hook options
 * 
 * @example
 * ```tsx
 * useUserChecklistChanges(userId, (event) => {
 *   // Refresh dashboard data
 *   refetchChecklists();
 * });
 * ```
 */
export function useUserChecklistChanges(
  userId: string | null | undefined,
  onChecklistChange: ChecklistChangeCallback,
  options: UseRealtimeOptions = {}
): void {
  const { enabled = true } = options;
  const callbackRef = useRef(onChecklistChange);
  const subscriptionRef = useRef<SubscriptionHandle | null>(null);

  // Keep callback ref updated
  useEffect(() => {
    callbackRef.current = onChecklistChange;
  }, [onChecklistChange]);

  useEffect(() => {
    if (!userId || !enabled) {
      return;
    }

    const realtimeService = getRealtimeService();

    const subscribe = async () => {
      try {
        subscriptionRef.current = await realtimeService.subscribeToUserChecklists(
          userId,
          (event) => callbackRef.current(event)
        );
      } catch (error) {
        console.error('Failed to subscribe to user checklist changes:', error);
      }
    };

    subscribe();

    return () => {
      subscriptionRef.current?.unsubscribe();
      subscriptionRef.current = null;
    };
  }, [userId, enabled]);
}

// ============================================================================
// Combined Hooks
// ============================================================================

/**
 * Hook to subscribe to all template-related changes (template, items, collaborators).
 * Useful for the template editor to receive all updates.
 * 
 * Requirements: 12.4
 * 
 * @param templateId - The template ID to subscribe to
 * @param callbacks - Object containing callbacks for each event type
 * @param options - Hook options
 * 
 * @example
 * ```tsx
 * useTemplateRealtime(templateId, {
 *   onTemplateChange: (event) => setTemplate(event.record),
 *   onItemChange: (event) => handleItemChange(event),
 *   onCollaboratorChange: (event) => handleCollaboratorChange(event),
 * });
 * ```
 */
export function useTemplateRealtime(
  templateId: string | null | undefined,
  callbacks: {
    onTemplateChange?: TemplateChangeCallback;
    onItemChange?: TemplateItemChangeCallback;
    onCollaboratorChange?: CollaboratorChangeCallback;
  },
  options: UseRealtimeOptions = {}
): void {
  const { enabled = true } = options;

  // Use individual hooks with no-op callbacks if not provided
  useTemplateChanges(
    templateId,
    callbacks.onTemplateChange ?? (() => {}),
    { enabled: enabled && !!callbacks.onTemplateChange }
  );

  useTemplateItemChanges(
    templateId,
    callbacks.onItemChange ?? (() => {}),
    { enabled: enabled && !!callbacks.onItemChange }
  );

  useCollaboratorChanges(
    templateId,
    callbacks.onCollaboratorChange ?? (() => {}),
    { enabled: enabled && !!callbacks.onCollaboratorChange }
  );
}

/**
 * Hook to subscribe to all checklist-related changes (checklist, items).
 * Useful for the checklist tracker to receive all updates.
 * 
 * Requirements: 12.4
 * 
 * @param checklistId - The checklist ID to subscribe to
 * @param callbacks - Object containing callbacks for each event type
 * @param options - Hook options
 * 
 * @example
 * ```tsx
 * useChecklistRealtime(checklistId, {
 *   onChecklistChange: (event) => setChecklist(event.record),
 *   onItemChange: (event) => handleItemChange(event),
 * });
 * ```
 */
export function useChecklistRealtime(
  checklistId: string | null | undefined,
  callbacks: {
    onChecklistChange?: ChecklistChangeCallback;
    onItemChange?: ChecklistItemChangeCallback;
  },
  options: UseRealtimeOptions = {}
): void {
  const { enabled = true } = options;

  // Use individual hooks with no-op callbacks if not provided
  useChecklistChanges(
    checklistId,
    callbacks.onChecklistChange ?? (() => {}),
    { enabled: enabled && !!callbacks.onChecklistChange }
  );

  useChecklistItemChanges(
    checklistId,
    callbacks.onItemChange ?? (() => {}),
    { enabled: enabled && !!callbacks.onItemChange }
  );
}

// ============================================================================
// Notification Hooks
// ============================================================================

/**
 * Hook to subscribe to notifications for the current user.
 * Automatically handles subscription lifecycle.
 * 
 * Requirements: 12.4
 * 
 * @param userId - The user ID whose notifications to subscribe to
 * @param onNotificationChange - Callback when notifications change
 * @param options - Hook options
 * 
 * @example
 * ```tsx
 * useNotificationChanges(userId, (event) => {
 *   if (event.action === 'create') {
 *     // New notification received
 *     setNotifications(prev => [event.record, ...prev]);
 *     setUnreadCount(prev => prev + 1);
 *   }
 * });
 * ```
 */
export function useNotificationChanges(
  userId: string | null | undefined,
  onNotificationChange: NotificationChangeCallback,
  options: UseRealtimeOptions = {}
): void {
  const { enabled = true } = options;
  const callbackRef = useRef(onNotificationChange);
  const subscriptionRef = useRef<SubscriptionHandle | null>(null);

  // Keep callback ref updated
  useEffect(() => {
    callbackRef.current = onNotificationChange;
  }, [onNotificationChange]);

  useEffect(() => {
    if (!userId || !enabled) {
      return;
    }

    const realtimeService = getRealtimeService();

    const subscribe = async () => {
      try {
        subscriptionRef.current = await realtimeService.subscribeToUserNotifications(
          userId,
          (event) => callbackRef.current(event)
        );
      } catch (error) {
        console.error('Failed to subscribe to notification changes:', error);
      }
    };

    subscribe();

    return () => {
      subscriptionRef.current?.unsubscribe();
      subscriptionRef.current = null;
    };
  }, [userId, enabled]);
}
