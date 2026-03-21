"use client";

import * as React from "react";
import { NotificationCenter } from "./notification-center";
import { getNotificationService } from "@/lib/services/notification";
import { getCollaborationService } from "@/lib/services/collaboration";
import { useNotificationChanges } from "@/lib/hooks/use-realtime";
import { getPocketBaseClient } from "@/lib/pocketbase";
import type { Notification } from "@/lib/pocketbase-types";

interface PbAuthData {
  token: string;
  model: { id: string; collectionId: string; collectionName: string; [key: string]: unknown };
}

interface NotificationCenterClientProps {
  pbAuth?: PbAuthData | null;
}

/**
 * Client-side wrapper for NotificationCenter that handles data fetching
 * and state management with realtime updates.
 *
 * Requirements: 10.5, 12.4
 */
export function NotificationCenterClient({ pbAuth }: NotificationCenterClientProps) {
  const [notifications, setNotifications] = React.useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = React.useState(0);
  const [isLoading, setIsLoading] = React.useState(true);
  const [userId, setUserId] = React.useState<string | null>(null);

  const notificationService = React.useMemo(() => getNotificationService(), []);
  const collaborationService = React.useMemo(() => getCollaborationService(), []);

  // Hydrate client-side PocketBase auth from server-provided data
  React.useEffect(() => {
    const pb = getPocketBaseClient();
    if (pbAuth?.token && pbAuth?.model) {
      pb.authStore.save(pbAuth.token, pbAuth.model);
    }
    if (pb.authStore.isValid && pb.authStore.record) {
      setUserId(pb.authStore.record.id);
    }
  }, [pbAuth]);

  const fetchNotifications = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const [notificationsResult, countResult] = await Promise.all([
        notificationService.getNotifications({ perPage: 50 }),
        notificationService.getUnreadCount(),
      ]);

      if (notificationsResult.success) {
        setNotifications(notificationsResult.notifications);
      }

      if (!countResult.error) {
        setUnreadCount(countResult.count);
      }
    } catch (error) {
      console.error("Failed to fetch notifications:", error);
    } finally {
      setIsLoading(false);
    }
  }, [notificationService]);

  // Initial fetch - only after auth is hydrated
  React.useEffect(() => {
    if (userId) {
      fetchNotifications();
    }
  }, [userId, fetchNotifications]);

  // Subscribe to realtime notification updates
  // Requirements: 12.4
  useNotificationChanges(
    userId,
    React.useCallback((event) => {
      if (event.action === 'create') {
        // New notification received - add to the beginning of the list
        setNotifications((prev) => {
          // Check if notification already exists (avoid duplicates)
          if (prev.some((n) => n.id === event.record.id)) {
            return prev;
          }
          return [event.record, ...prev];
        });
        // Increment unread count for new notifications
        if (!event.record.isRead) {
          setUnreadCount((prev) => prev + 1);
        }
      } else if (event.action === 'update') {
        // Notification updated (e.g., marked as read)
        // Only update the notification record; count is managed by local handlers
        // to avoid race conditions with optimistic updates
        setNotifications((prev) =>
          prev.map((n) =>
            n.id === event.record.id ? event.record : n
          )
        );
      } else if (event.action === 'delete') {
        // Notification deleted - use state updater to avoid stale closure
        setNotifications((prev) => {
          const deletedNotification = prev.find((n) => n.id === event.record.id);
          if (deletedNotification && !deletedNotification.isRead) {
            setUnreadCount((c) => Math.max(0, c - 1));
          }
          return prev.filter((n) => n.id !== event.record.id);
        });
      }
    }, [])
  );

  const handleMarkAsRead = async (notificationId: string) => {
    const result = await notificationService.markAsRead(notificationId);
    if (result.success) {
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === notificationId ? { ...n, isRead: true } : n
        )
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    }
  };

  const handleMarkAllAsRead = async () => {
    const result = await notificationService.markAllAsRead();
    if (result.success) {
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, isRead: true }))
      );
      setUnreadCount(0);
    }
  };

  const handleDelete = async (notificationId: string) => {
    const notification = notifications.find((n) => n.id === notificationId);
    const result = await notificationService.delete(notificationId);
    if (result.success) {
      setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
      if (notification && !notification.isRead) {
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    }
  };

  const handleAcceptInvitation = async (notificationId: string, collaboratorId: string) => {
    // Accept the invitation
    const result = await collaborationService.acceptInvitation(collaboratorId);

    if (!result.success) {
      throw new Error(result.error?.message || 'Failed to accept invitation');
    }

    // Mark notification as read on success
    await handleMarkAsRead(notificationId);
  };

  return (
    <NotificationCenter
      notifications={notifications}
      unreadCount={unreadCount}
      isLoading={isLoading}
      onMarkAsRead={handleMarkAsRead}
      onMarkAllAsRead={handleMarkAllAsRead}
      onDelete={handleDelete}
      onAccept={handleAcceptInvitation}
      onRefresh={fetchNotifications}
    />
  );
}
