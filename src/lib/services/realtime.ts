/**
 * Realtime Service
 * 
 * Provides PocketBase realtime subscriptions for:
 * - Template changes for collaborators
 * - Checklist progress updates
 * 
 * Requirements: 12.4
 */

import PocketBase, { RecordSubscription, UnsubscribeFunc } from 'pocketbase';
import { getPocketBaseClient } from '../pocketbase';
import type {
  Template,
  Instance,
  InstanceItem,
  Item,
  Collaborator,
  Notification,
} from '../pocketbase-types';
import { Collections } from '../pocketbase-types';

// ============================================================================
// Types
// ============================================================================

/**
 * Realtime event action types
 */
export type RealtimeAction = 'create' | 'update' | 'delete';

/**
 * Generic realtime event
 */
export interface RealtimeEvent<T> {
  action: RealtimeAction;
  record: T;
}

/**
 * Template change event
 */
export interface TemplateChangeEvent extends RealtimeEvent<Template> {
  type: 'template';
}

/**
 * Template item change event
 */
export interface TemplateItemChangeEvent extends RealtimeEvent<Item> {
  type: 'item';
  templateId: string;
}

/**
 * Checklist change event
 */
export interface ChecklistChangeEvent extends RealtimeEvent<Instance> {
  type: 'checklist';
}

/**
 * Checklist item change event (for progress tracking)
 */
export interface ChecklistItemChangeEvent extends RealtimeEvent<InstanceItem> {
  type: 'checklistItem';
  checklistId: string;
}

/**
 * Collaborator change event
 */
export interface CollaboratorChangeEvent extends RealtimeEvent<Collaborator> {
  type: 'collaborator';
  templateId: string;
}

/**
 * Notification change event
 */
export interface NotificationChangeEvent extends RealtimeEvent<Notification> {
  type: 'notification';
  userId: string;
}

/**
 * Callback types for subscriptions
 */
export type TemplateChangeCallback = (event: TemplateChangeEvent) => void;
export type TemplateItemChangeCallback = (event: TemplateItemChangeEvent) => void;
export type ChecklistChangeCallback = (event: ChecklistChangeEvent) => void;
export type ChecklistItemChangeCallback = (event: ChecklistItemChangeEvent) => void;
export type CollaboratorChangeCallback = (event: CollaboratorChangeEvent) => void;
export type NotificationChangeCallback = (event: NotificationChangeEvent) => void;

/**
 * Subscription handle for cleanup
 */
export interface SubscriptionHandle {
  unsubscribe: () => Promise<void>;
}

// ============================================================================
// Realtime Service Class
// ============================================================================

/**
 * Realtime Service
 * 
 * Manages PocketBase realtime subscriptions for collaborative features.
 * Provides methods to subscribe to template and checklist changes.
 */
export class RealtimeService {
  private pb: PocketBase;
  private subscriptions: Map<string, UnsubscribeFunc> = new Map();

  constructor(pb?: PocketBase) {
    this.pb = pb ?? getPocketBaseClient();
  }

  // ============================================================================
  // Template Subscriptions
  // ============================================================================

  /**
   * Subscribe to changes on a specific template.
   * Useful for collaborators to receive real-time updates.
   * 
   * Requirements: 12.4
   * 
   * @param templateId - The template ID to subscribe to
   * @param callback - Function called when template changes
   * @returns SubscriptionHandle for cleanup
   */
  async subscribeToTemplateChanges(
    templateId: string,
    callback: TemplateChangeCallback
  ): Promise<SubscriptionHandle> {
    const topic = templateId;
    const subscriptionKey = `template:${templateId}`;

    // Unsubscribe from existing subscription if any
    await this.unsubscribeByKey(subscriptionKey);

    const unsubscribe = await this.pb
      .collection(Collections.TEMPLATES)
      .subscribe<Template>(topic, (e: RecordSubscription<Template>) => {
        callback({
          type: 'template',
          action: e.action as RealtimeAction,
          record: e.record,
        });
      });

    this.subscriptions.set(subscriptionKey, unsubscribe);

    return {
      unsubscribe: async () => {
        await this.unsubscribeByKey(subscriptionKey);
      },
    };
  }

  /**
   * Subscribe to item changes for a specific template.
   * Useful for collaborators to see item additions/modifications in real-time.
   * 
   * Requirements: 12.4
   * 
   * @param templateId - The template ID whose items to subscribe to
   * @param callback - Function called when items change
   * @returns SubscriptionHandle for cleanup
   */
  async subscribeToTemplateItems(
    templateId: string,
    callback: TemplateItemChangeCallback
  ): Promise<SubscriptionHandle> {
    const subscriptionKey = `templateItems:${templateId}`;

    // Unsubscribe from existing subscription if any
    await this.unsubscribeByKey(subscriptionKey);

    // Subscribe to all items and filter by templateId
    const unsubscribe = await this.pb
      .collection(Collections.ITEMS)
      .subscribe<Item>('*', (e: RecordSubscription<Item>) => {
        // Filter to only items belonging to this template
        // Note: DB field is still 'blueprint'
        if (e.record.blueprint === templateId) {
          callback({
            type: 'item',
            action: e.action as RealtimeAction,
            record: e.record,
            templateId,
          });
        }
      });

    this.subscriptions.set(subscriptionKey, unsubscribe);

    return {
      unsubscribe: async () => {
        await this.unsubscribeByKey(subscriptionKey);
      },
    };
  }

  /**
   * Subscribe to collaborator changes for a specific template.
   * Useful for owners to see when collaborators are added/removed.
   * 
   * Requirements: 12.4
   * 
   * @param templateId - The template ID whose collaborators to subscribe to
   * @param callback - Function called when collaborators change
   * @returns SubscriptionHandle for cleanup
   */
  async subscribeToCollaboratorChanges(
    templateId: string,
    callback: CollaboratorChangeCallback
  ): Promise<SubscriptionHandle> {
    const subscriptionKey = `collaborators:${templateId}`;

    // Unsubscribe from existing subscription if any
    await this.unsubscribeByKey(subscriptionKey);

    // Subscribe to all collaborators and filter by templateId
    const unsubscribe = await this.pb
      .collection(Collections.COLLABORATORS)
      .subscribe<Collaborator>('*', (e: RecordSubscription<Collaborator>) => {
        // Filter to only collaborators for this template
        // Note: DB field is still 'blueprint'
        if (e.record.blueprint === templateId) {
          callback({
            type: 'collaborator',
            action: e.action as RealtimeAction,
            record: e.record,
            templateId,
          });
        }
      });

    this.subscriptions.set(subscriptionKey, unsubscribe);

    return {
      unsubscribe: async () => {
        await this.unsubscribeByKey(subscriptionKey);
      },
    };
  }

  // ============================================================================
  // Checklist Subscriptions
  // ============================================================================

  /**
   * Subscribe to changes on a specific checklist.
   * Useful for tracking progress updates in real-time.
   * 
   * Requirements: 12.4
   * 
   * @param checklistId - The checklist ID to subscribe to
   * @param callback - Function called when checklist changes
   * @returns SubscriptionHandle for cleanup
   */
  async subscribeToChecklistChanges(
    checklistId: string,
    callback: ChecklistChangeCallback
  ): Promise<SubscriptionHandle> {
    const topic = checklistId;
    const subscriptionKey = `checklist:${checklistId}`;

    // Unsubscribe from existing subscription if any
    await this.unsubscribeByKey(subscriptionKey);

    const unsubscribe = await this.pb
      .collection(Collections.CHECKLISTS)
      .subscribe<Instance>(topic, (e: RecordSubscription<Instance>) => {
        callback({
          type: 'checklist',
          action: e.action as RealtimeAction,
          record: e.record,
        });
      });

    this.subscriptions.set(subscriptionKey, unsubscribe);

    return {
      unsubscribe: async () => {
        await this.unsubscribeByKey(subscriptionKey);
      },
    };
  }

  /**
   * Subscribe to checklist item changes for progress tracking.
   * Useful for seeing completion status updates in real-time.
   * 
   * Requirements: 12.4
   * 
   * @param checklistId - The checklist ID whose items to subscribe to
   * @param callback - Function called when checklist items change
   * @returns SubscriptionHandle for cleanup
   */
  async subscribeToChecklistItems(
    checklistId: string,
    callback: ChecklistItemChangeCallback
  ): Promise<SubscriptionHandle> {
    const subscriptionKey = `checklistItems:${checklistId}`;

    // Unsubscribe from existing subscription if any
    await this.unsubscribeByKey(subscriptionKey);

    // Subscribe to all instance items and filter by checklistId
    const unsubscribe = await this.pb
      .collection(Collections.CHECKLIST_ITEMS)
      .subscribe<InstanceItem>('*', (e: RecordSubscription<InstanceItem>) => {
        // Filter to only items belonging to this checklist
        // Note: DB field is 'instance' or 'checklist' - strictly it's 'instance' per pocketbase-types aliases
        // but 'checklist' in our new terminology. The type definition for InstanceItem calls it 'instance'.
        // Let's check pocketbase-types. It says collectionName: 'instanceItems', and field "instance".
        if (e.record.instance === checklistId) {
          callback({
            type: 'checklistItem',
            action: e.action as RealtimeAction,
            record: e.record,
            checklistId,
          });
        }
      });

    this.subscriptions.set(subscriptionKey, unsubscribe);

    return {
      unsubscribe: async () => {
        await this.unsubscribeByKey(subscriptionKey);
      },
    };
  }

  /**
   * Subscribe to all checklists for the current user.
   * Useful for dashboard progress updates.
   * 
   * Requirements: 12.4
   * 
   * @param userId - The user ID whose checklists to subscribe to
   * @param callback - Function called when any user checklist changes
   * @returns SubscriptionHandle for cleanup
   */
  async subscribeToUserChecklists(
    userId: string,
    callback: ChecklistChangeCallback
  ): Promise<SubscriptionHandle> {
    const subscriptionKey = `userChecklists:${userId}`;

    // Unsubscribe from existing subscription if any
    await this.unsubscribeByKey(subscriptionKey);

    // Subscribe to all checklists and filter by userId
    const unsubscribe = await this.pb
      .collection(Collections.CHECKLISTS)
      .subscribe<Instance>('*', (e: RecordSubscription<Instance>) => {
        // Filter to only checklists belonging to this user
        if (e.record.user === userId) {
          callback({
            type: 'checklist',
            action: e.action as RealtimeAction,
            record: e.record,
          });
        }
      });

    this.subscriptions.set(subscriptionKey, unsubscribe);

    return {
      unsubscribe: async () => {
        await this.unsubscribeByKey(subscriptionKey);
      },
    };
  }

  // ============================================================================
  // Notification Subscriptions
  // ============================================================================

  /**
   * Subscribe to notifications for a specific user.
   * Useful for receiving real-time notification updates.
   * 
   * Requirements: 12.4
   * 
   * @param userId - The user ID whose notifications to subscribe to
   * @param callback - Function called when notifications change
   * @returns SubscriptionHandle for cleanup
   */
  async subscribeToUserNotifications(
    userId: string,
    callback: NotificationChangeCallback
  ): Promise<SubscriptionHandle> {
    const subscriptionKey = `notifications:${userId}`;

    // Unsubscribe from existing subscription if any
    await this.unsubscribeByKey(subscriptionKey);

    // Subscribe to all notifications and filter by userId
    const unsubscribe = await this.pb
      .collection(Collections.NOTIFICATIONS)
      .subscribe<Notification>('*', (e: RecordSubscription<Notification>) => {
        // Filter to only notifications belonging to this user
        if (e.record.user === userId) {
          callback({
            type: 'notification',
            action: e.action as RealtimeAction,
            record: e.record,
            userId,
          });
        }
      });

    this.subscriptions.set(subscriptionKey, unsubscribe);

    return {
      unsubscribe: async () => {
        await this.unsubscribeByKey(subscriptionKey);
      },
    };
  }

  // ============================================================================
  // Utility Methods
  // ============================================================================

  /**
   * Unsubscribe from a specific subscription by key.
   * 
   * @param key - The subscription key
   */
  private async unsubscribeByKey(key: string): Promise<void> {
    const unsubscribe = this.subscriptions.get(key);
    if (unsubscribe) {
      await unsubscribe();
      this.subscriptions.delete(key);
    }
  }

  /**
   * Unsubscribe from all active subscriptions.
   * Should be called when the component unmounts or user logs out.
   */
  async unsubscribeAll(): Promise<void> {
    const unsubscribePromises = Array.from(this.subscriptions.values()).map(
      (unsubscribe) => unsubscribe()
    );
    await Promise.all(unsubscribePromises);
    this.subscriptions.clear();
  }

  /**
   * Get the count of active subscriptions.
   * Useful for debugging.
   */
  getActiveSubscriptionCount(): number {
    return this.subscriptions.size;
  }

  /**
   * Get the underlying PocketBase client.
   */
  getPocketBase(): PocketBase {
    return this.pb;
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Creates a new RealtimeService instance.
 * Use this for creating isolated service instances.
 */
export function createRealtimeService(pb?: PocketBase): RealtimeService {
  return new RealtimeService(pb);
}

/**
 * Gets the singleton RealtimeService instance for client-side usage.
 * Reuses the same PocketBase connection for all subscriptions.
 */
let clientRealtimeService: RealtimeService | null = null;

export function getRealtimeService(): RealtimeService {
  if (typeof window === 'undefined') {
    // Server-side: always create a new instance (though realtime is client-only)
    return createRealtimeService();
  }

  // Client-side: reuse the same instance
  if (!clientRealtimeService) {
    clientRealtimeService = new RealtimeService();
  }

  return clientRealtimeService;
}
