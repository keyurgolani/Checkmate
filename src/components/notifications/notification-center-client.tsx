"use client";

import * as React from "react";
import { NotificationCenter } from "./notification-center";
import { getNotificationService } from "@/lib/services/notification";
import { getCollaborationService } from "@/lib/services/collaboration";
import { useNotificationChanges } from "@/lib/hooks/use-realtime";
import { getPocketBaseClient } from "@/lib/pocketbase";
import type { Notification } from "@/lib/pocketbase-types";

/**
 * Client-side wrapper for NotificationCenter that handles data fetching
 * and state management with realtime updates.
 * 
 * Requirements: 10.5, 12.4
 */
export function NotificationCenterClient() {
  const [notifications, setNotifications] = React.useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = React.useState(0);
  const [isLoading, setIsLoading] = React.useState(true);
  const [userId, setUserId] = React.useState<string | null>(null);

  const notificationService = React.useMemo(() => getNotificationService(), []);
  const collaborationService = React.useMemo(() => getCollaborationService(), []);

  // Get current user ID for realtime subscription
  React.useEffect(() => {
    const pb = getPocketBaseClient();
    if (pb.authStore.isValid && pb.authStore.model) {
      setUserId(pb.authStore.model.id);
    }
  }, []);

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

  // Initial fetch
  React.useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

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
        setNotifications((prev) =>
          prev.map((n) =>
            n.id === event.record.id ? event.record : n
          )
        );
        // Recalculate unread count if read status changed
        setNotifications((prev) => {
          const newUnreadCount = prev.filter((n) => !n.isRead).length;
          setUnreadCount(newUnreadCount);
          return prev;
        });
      } else if (event.action === 'delete') {
        // Notification deleted
        const deletedNotification = notifications.find((n) => n.id === event.record.id);
        setNotifications((prev) => prev.filter((n) => n.id !== event.record.id));
        // Decrement unread count if deleted notification was unread
        if (deletedNotification && !deletedNotification.isRead) {
          setUnreadCount((prev) => Math.max(0, prev - 1));
        }
      }
    }, [notifications])
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
    
    if (result.success) {
      // Mark notification as read
      await handleMarkAsRead(notificationId);
      // Optional: Refresh notifications to show updated state or navigate to template (handled by UI if needed)
    }
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
