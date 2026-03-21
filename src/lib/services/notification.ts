/**
 * Notification Service
 * 
 * Provides notification management for the CheckMate application.
 * Handles creating, reading, and managing notifications for users.
 * 
 * Requirements: 4.4, 10.1
 */

import PocketBase, { ClientResponseError } from 'pocketbase';
import { createPocketBaseClient, getPocketBaseClient } from '../pocketbase';
import type {
  Notification,
  NotificationCreate,
  NotificationUpdate,
  NotificationData,
  Blueprint,
  User,
} from '../pocketbase-types';
import { Collections, NotificationType } from '../pocketbase-types';

// ============================================================================
// Types
// ============================================================================

/**
 * Result for notification operations
 */
export interface NotificationResult {
  success: boolean;
  notification: Notification | null;
  error: NotificationError | null;
}

/**
 * Result for listing notifications
 */
export interface NotificationsListResult {
  success: boolean;
  notifications: Notification[];
  totalItems: number;
  error: NotificationError | null;
}

/**
 * Notification error with code and message
 */
export interface NotificationError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

/**
 * Options for creating collaboration notifications
 */
export interface CollaborationNotificationOptions {
  userId: string;
  blueprintId: string;
  blueprintTitle: string;
  collaboratorId?: string;
  inviterName?: string;
  permissionLevel?: string;
  previousPermissionLevel?: string;
}

// ============================================================================
// Error Codes
// ============================================================================

export const NotificationErrorCodes = {
  NOT_FOUND: 'NOTIF_001',
  PERMISSION_DENIED: 'NOTIF_002',
  NOT_AUTHENTICATED: 'NOTIF_003',
  CREATION_FAILED: 'NOTIF_004',
  UNKNOWN_ERROR: 'NOTIF_999',
} as const;

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Creates a successful NotificationResult
 */
function createSuccessResult(notification: Notification): NotificationResult {
  return {
    success: true,
    notification,
    error: null,
  };
}

/**
 * Creates an error NotificationResult
 */
function createErrorResult(error: NotificationError): NotificationResult {
  return {
    success: false,
    notification: null,
    error,
  };
}

/**
 * Parses PocketBase errors into NotificationError
 */
function parseError(err: unknown): NotificationError {
  if (err instanceof ClientResponseError) {
    if (err.status === 404) {
      return {
        code: NotificationErrorCodes.NOT_FOUND,
        message: 'Notification not found',
      };
    }

    if (err.status === 403) {
      return {
        code: NotificationErrorCodes.PERMISSION_DENIED,
        message: 'You do not have permission to perform this action',
      };
    }

    return {
      code: NotificationErrorCodes.UNKNOWN_ERROR,
      message: err.message || 'An unexpected error occurred',
      details: { status: err.status, data: err.data },
    };
  }

  if (err instanceof Error) {
    return {
      code: NotificationErrorCodes.UNKNOWN_ERROR,
      message: err.message,
    };
  }

  return {
    code: NotificationErrorCodes.UNKNOWN_ERROR,
    message: 'An unexpected error occurred',
  };
}

// ============================================================================
// Notification Service Class
// ============================================================================

/**
 * Notification Service
 * 
 * Provides methods for managing user notifications including:
 * - Creating notifications for various events
 * - Listing user notifications
 * - Marking notifications as read
 * - Deleting notifications
 */
export class NotificationService {
  private pb: PocketBase;

  constructor(pb?: PocketBase) {
    this.pb = pb ?? getPocketBaseClient();
  }

  /**
   * Creates a notification for a user.
   * 
   * @param data - Notification data
   * @returns NotificationResult with created notification on success
   */
  async create(data: NotificationCreate): Promise<NotificationResult> {
    try {
      const notification = await this.pb
        .collection(Collections.NOTIFICATIONS)
        .create<Notification>(data);

      return createSuccessResult(notification);
    } catch (err) {
      return createErrorResult(parseError(err));
    }
  }

  /**
   * Creates a notification when a user is invited to collaborate on a blueprint.
   * 
   * Requirements: 4.4, 10.1
   * 
   * @param options - Collaboration notification options
   * @returns NotificationResult with created notification on success
   */
  async createCollaborationInviteNotification(
    options: CollaborationNotificationOptions
  ): Promise<NotificationResult> {
    const { userId, blueprintId, blueprintTitle, collaboratorId, inviterName, permissionLevel } = options;

    const notificationData: NotificationCreate = {
      user: userId,
      type: NotificationType.COLLABORATION_INVITE,
      title: 'New Collaboration Invitation',
      message: inviterName
        ? `${inviterName} invited you to collaborate on "${blueprintTitle}" as ${permissionLevel || 'a collaborator'}.`
        : `You have been invited to collaborate on "${blueprintTitle}" as ${permissionLevel || 'a collaborator'}.`,
      data: {
        blueprintId,
        blueprintTitle,
        collaboratorId,
        permissionLevel,
      },
      isRead: false,
    };

    return this.create(notificationData);
  }

  /**
   * Creates a notification when a collaborator's permission level is changed.
   * 
   * Requirements: 4.4, 10.1
   * 
   * @param options - Collaboration notification options
   * @returns NotificationResult with created notification on success
   */
  async createPermissionChangeNotification(
    options: CollaborationNotificationOptions
  ): Promise<NotificationResult> {
    const { userId, blueprintId, blueprintTitle, collaboratorId, permissionLevel, previousPermissionLevel } = options;

    const notificationData: NotificationCreate = {
      user: userId,
      type: NotificationType.COLLABORATION_INVITE, // Using same type for permission changes
      title: 'Permission Level Changed',
      message: `Your permission level on "${blueprintTitle}" has been changed from ${previousPermissionLevel || 'unknown'} to ${permissionLevel}.`,
      data: {
        blueprintId,
        blueprintTitle,
        collaboratorId,
        permissionLevel,
        previousPermissionLevel,
      },
      isRead: false,
    };

    return this.create(notificationData);
  }

  /**
   * Creates a notification when a collaborator's access is revoked.
   * 
   * Requirements: 4.6, 10.1
   * 
   * @param options - Collaboration notification options
   * @returns NotificationResult with created notification on success
   */
  async createCollaborationRevokedNotification(
    options: CollaborationNotificationOptions
  ): Promise<NotificationResult> {
    const { userId, blueprintId, blueprintTitle } = options;

    const notificationData: NotificationCreate = {
      user: userId,
      type: NotificationType.COLLABORATION_REVOKED,
      title: 'Collaboration Access Revoked',
      message: `Your access to "${blueprintTitle}" has been revoked.`,
      data: {
        blueprintId,
        blueprintTitle,
      },
      isRead: false,
    };

    return this.create(notificationData);
  }

  /**
   * Creates a notification when a user requests access to a private template.
   * 
   * Requirements: 4.4, 10.1 (New)
   * 
   * @param options - Access request notification options
   * @returns NotificationResult with created notification on success
   */
  async createAccessRequestNotification(options: {
    userId: string; // The template owner
    blueprintId: string;
    blueprintTitle: string;
    requesterId: string;
    requesterName: string;
  }): Promise<NotificationResult> {
    const { userId, blueprintId, blueprintTitle, requesterId, requesterName } = options;

    const notificationData: NotificationCreate = {
      user: userId,
      type: NotificationType.ACCESS_REQUEST,
      title: 'Access Request',
      message: `${requesterName} has requested access to "${blueprintTitle}".`,
      data: {
        blueprintId,
        blueprintTitle,
        requesterId,
        requesterName,
      },
      isRead: false,
    };

    return this.create(notificationData);
  }

  /**
   * Gets notifications for the current user.
   * 
   * @param options - Query options
   * @returns List of notifications
   */
  async getNotifications(options?: {
    page?: number;
    perPage?: number;
    unreadOnly?: boolean;
  }): Promise<NotificationsListResult> {
    try {
      const currentUserId = this.pb.authStore.record?.id;
      if (!currentUserId) {
        return {
          success: false,
          notifications: [],
          totalItems: 0,
          error: {
            code: NotificationErrorCodes.NOT_AUTHENTICATED,
            message: 'You must be authenticated to view notifications',
          },
        };
      }

      let filter = `user = "${currentUserId}"`;
      if (options?.unreadOnly) {
        filter += ' && isRead = false';
      }

      const result = await this.pb
        .collection(Collections.NOTIFICATIONS)
        .getList<Notification>(options?.page || 1, options?.perPage || 20, {
          filter,
          sort: '-created',
          requestKey: 'notifications-list',
        });

      return {
        success: true,
        notifications: result.items,
        totalItems: result.totalItems,
        error: null,
      };
    } catch (err) {
      return {
        success: false,
        notifications: [],
        totalItems: 0,
        error: parseError(err),
      };
    }
  }

  /**
   * Marks a notification as read.
   * 
   * @param notificationId - ID of the notification to mark as read
   * @returns NotificationResult with updated notification on success
   */
  async markAsRead(notificationId: string): Promise<NotificationResult> {
    try {
      const currentUserId = this.pb.authStore.record?.id;
      if (!currentUserId) {
        return createErrorResult({
          code: NotificationErrorCodes.NOT_AUTHENTICATED,
          message: 'You must be authenticated to update notifications',
        });
      }

      // Verify the notification belongs to the current user
      const notification = await this.pb
        .collection(Collections.NOTIFICATIONS)
        .getOne<Notification>(notificationId);

      if (notification.user !== currentUserId) {
        return createErrorResult({
          code: NotificationErrorCodes.PERMISSION_DENIED,
          message: 'You can only update your own notifications',
        });
      }

      const updateData: NotificationUpdate = {
        isRead: true,
      };

      const updatedNotification = await this.pb
        .collection(Collections.NOTIFICATIONS)
        .update<Notification>(notificationId, updateData);

      return createSuccessResult(updatedNotification);
    } catch (err) {
      return createErrorResult(parseError(err));
    }
  }

  /**
   * Marks all notifications as read for the current user.
   * 
   * @returns Success status
   */
  async markAllAsRead(): Promise<{ success: boolean; error: NotificationError | null }> {
    try {
      const currentUserId = this.pb.authStore.record?.id;
      if (!currentUserId) {
        return {
          success: false,
          error: {
            code: NotificationErrorCodes.NOT_AUTHENTICATED,
            message: 'You must be authenticated to update notifications',
          },
        };
      }

      // Get all unread notifications for the user
      const unreadNotifications = await this.pb
        .collection(Collections.NOTIFICATIONS)
        .getFullList<Notification>({
          filter: `user = "${currentUserId}" && isRead = false`,
        });

      // Update each notification
      const updatePromises = unreadNotifications.map((notification) =>
        this.pb
          .collection(Collections.NOTIFICATIONS)
          .update<Notification>(notification.id, { isRead: true })
      );

      await Promise.all(updatePromises);

      return { success: true, error: null };
    } catch (err) {
      return { success: false, error: parseError(err) };
    }
  }

  /**
   * Deletes a notification.
   * 
   * @param notificationId - ID of the notification to delete
   * @returns Success status
   */
  async delete(notificationId: string): Promise<{ success: boolean; error: NotificationError | null }> {
    try {
      const currentUserId = this.pb.authStore.record?.id;
      if (!currentUserId) {
        return {
          success: false,
          error: {
            code: NotificationErrorCodes.NOT_AUTHENTICATED,
            message: 'You must be authenticated to delete notifications',
          },
        };
      }

      // Verify the notification belongs to the current user
      const notification = await this.pb
        .collection(Collections.NOTIFICATIONS)
        .getOne<Notification>(notificationId);

      if (notification.user !== currentUserId) {
        return {
          success: false,
          error: {
            code: NotificationErrorCodes.PERMISSION_DENIED,
            message: 'You can only delete your own notifications',
          },
        };
      }

      await this.pb.collection(Collections.NOTIFICATIONS).delete(notificationId);

      return { success: true, error: null };
    } catch (err) {
      return { success: false, error: parseError(err) };
    }
  }

  /**
   * Gets the count of unread notifications for the current user.
   * 
   * @returns Unread count
   */
  async getUnreadCount(): Promise<{ count: number; error: NotificationError | null }> {
    try {
      const currentUserId = this.pb.authStore.record?.id;
      if (!currentUserId) {
        return {
          count: 0,
          error: {
            code: NotificationErrorCodes.NOT_AUTHENTICATED,
            message: 'You must be authenticated to view notifications',
          },
        };
      }

      const result = await this.pb
        .collection(Collections.NOTIFICATIONS)
        .getList<Notification>(1, 1, {
          filter: `user = "${currentUserId}" && isRead = false`,
          requestKey: 'notifications-unread-count',
        });

      return { count: result.totalItems, error: null };
    } catch (err) {
      return { count: 0, error: parseError(err) };
    }
  }

  /**
   * Gets a notification by ID.
   * 
   * @param notificationId - ID of the notification to retrieve
   * @returns NotificationResult with the notification on success
   */
  async getById(notificationId: string): Promise<NotificationResult> {
    try {
      const currentUserId = this.pb.authStore.record?.id;
      if (!currentUserId) {
        return createErrorResult({
          code: NotificationErrorCodes.NOT_AUTHENTICATED,
          message: 'You must be authenticated to view notifications',
        });
      }

      const notification = await this.pb
        .collection(Collections.NOTIFICATIONS)
        .getOne<Notification>(notificationId);

      // Verify the notification belongs to the current user
      if (notification.user !== currentUserId) {
        return createErrorResult({
          code: NotificationErrorCodes.PERMISSION_DENIED,
          message: 'You can only view your own notifications',
        });
      }

      return createSuccessResult(notification);
    } catch (err) {
      return createErrorResult(parseError(err));
    }
  }

  /**
   * Marks multiple notifications as read.
   * 
   * Requirements: 10.5
   * 
   * @param notificationIds - Array of notification IDs to mark as read
   * @returns Result with count of updated notifications
   */
  async bulkMarkAsRead(notificationIds: string[]): Promise<{
    success: boolean;
    updatedCount: number;
    error: NotificationError | null;
  }> {
    try {
      const currentUserId = this.pb.authStore.record?.id;
      if (!currentUserId) {
        return {
          success: false,
          updatedCount: 0,
          error: {
            code: NotificationErrorCodes.NOT_AUTHENTICATED,
            message: 'You must be authenticated to update notifications',
          },
        };
      }

      if (notificationIds.length === 0) {
        return { success: true, updatedCount: 0, error: null };
      }

      // Fetch all notifications to verify ownership
      const notifications = await Promise.all(
        notificationIds.map(async (id) => {
          try {
            return await this.pb
              .collection(Collections.NOTIFICATIONS)
              .getOne<Notification>(id);
          } catch {
            return null;
          }
        })
      );

      // Filter to only notifications owned by the current user
      const ownedNotifications = notifications.filter(
        (n): n is Notification => n !== null && n.user === currentUserId
      );

      // Update each notification
      const updatePromises = ownedNotifications.map((notification) =>
        this.pb
          .collection(Collections.NOTIFICATIONS)
          .update<Notification>(notification.id, { isRead: true })
      );

      await Promise.all(updatePromises);

      return {
        success: true,
        updatedCount: ownedNotifications.length,
        error: null,
      };
    } catch (err) {
      return { success: false, updatedCount: 0, error: parseError(err) };
    }
  }

  /**
   * Deletes multiple notifications.
   * 
   * Requirements: 10.5
   * 
   * @param notificationIds - Array of notification IDs to delete
   * @returns Result with count of deleted notifications
   */
  async bulkDelete(notificationIds: string[]): Promise<{
    success: boolean;
    deletedCount: number;
    error: NotificationError | null;
  }> {
    try {
      const currentUserId = this.pb.authStore.record?.id;
      if (!currentUserId) {
        return {
          success: false,
          deletedCount: 0,
          error: {
            code: NotificationErrorCodes.NOT_AUTHENTICATED,
            message: 'You must be authenticated to delete notifications',
          },
        };
      }

      if (notificationIds.length === 0) {
        return { success: true, deletedCount: 0, error: null };
      }

      // Fetch all notifications to verify ownership
      const notifications = await Promise.all(
        notificationIds.map(async (id) => {
          try {
            return await this.pb
              .collection(Collections.NOTIFICATIONS)
              .getOne<Notification>(id);
          } catch {
            return null;
          }
        })
      );

      // Filter to only notifications owned by the current user
      const ownedNotifications = notifications.filter(
        (n): n is Notification => n !== null && n.user === currentUserId
      );

      // Delete each notification
      const deletePromises = ownedNotifications.map((notification) =>
        this.pb.collection(Collections.NOTIFICATIONS).delete(notification.id)
      );

      await Promise.all(deletePromises);

      return {
        success: true,
        deletedCount: ownedNotifications.length,
        error: null,
      };
    } catch (err) {
      return { success: false, deletedCount: 0, error: parseError(err) };
    }
  }

  /**
   * Deletes all notifications for the current user.
   * 
   * @returns Result with count of deleted notifications
   */
  async deleteAll(): Promise<{
    success: boolean;
    deletedCount: number;
    error: NotificationError | null;
  }> {
    try {
      const currentUserId = this.pb.authStore.record?.id;
      if (!currentUserId) {
        return {
          success: false,
          deletedCount: 0,
          error: {
            code: NotificationErrorCodes.NOT_AUTHENTICATED,
            message: 'You must be authenticated to delete notifications',
          },
        };
      }

      // Get all notifications for the user
      const notifications = await this.pb
        .collection(Collections.NOTIFICATIONS)
        .getFullList<Notification>({
          filter: `user = "${currentUserId}"`,
        });

      // Delete each notification
      const deletePromises = notifications.map((notification) =>
        this.pb.collection(Collections.NOTIFICATIONS).delete(notification.id)
      );

      await Promise.all(deletePromises);

      return {
        success: true,
        deletedCount: notifications.length,
        error: null,
      };
    } catch (err) {
      return { success: false, deletedCount: 0, error: parseError(err) };
    }
  }

  /**
   * Gets the underlying PocketBase client.
   */
  getPocketBase(): PocketBase {
    return this.pb;
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Creates a new NotificationService instance with a fresh PocketBase client.
 * Use this for server-side operations.
 */
export function createNotificationService(): NotificationService {
  return new NotificationService(createPocketBaseClient());
}

/**
 * Gets the singleton NotificationService instance for client-side usage.
 */
let clientNotificationService: NotificationService | null = null;

export function getNotificationService(): NotificationService {
  if (typeof window === 'undefined') {
    // Server-side: always create a new instance
    return createNotificationService();
  }

  // Client-side: reuse the same instance
  if (!clientNotificationService) {
    clientNotificationService = new NotificationService();
  }

  return clientNotificationService;
}
