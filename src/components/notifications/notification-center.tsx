"use client";

/**
 * Notification Center Component
 * 
 * Displays a notification bell icon with unread count badge.
 * Opens a modal dialog showing all notifications with read/unread status.
 * Provides mark as read and delete functionality.
 * 
 * Requirements: 10.5 - Notification display and management
 * Requirements: 13.3 - Proper ARIA labels for interactive elements
 * Requirements: 13.4 - Announce state changes to screen readers
 */

import * as React from "react";
import { Bell, Check, CheckCheck, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import type { Notification } from "@/lib/pocketbase-types";
import { NotificationType } from "@/lib/pocketbase-types";
import { LiveRegion, useStatusAnnouncer } from "@/components/ui/live-region";

interface NotificationCenterProps {
  notifications: Notification[];
  unreadCount: number;
  isLoading?: boolean;
  onMarkAsRead: (notificationId: string) => Promise<void>;
  onMarkAllAsRead: () => Promise<void>;
  onDelete: (notificationId: string) => Promise<void>;
  onAccept: (notificationId: string, collaboratorId: string) => Promise<void>;
  onRefresh?: () => Promise<void>;
}

export function NotificationCenter({
  notifications,
  unreadCount,
  isLoading = false,
  onMarkAsRead,
  onMarkAllAsRead,
  onDelete,
  onAccept,
  onRefresh,
}: NotificationCenterProps) {
  const [open, setOpen] = React.useState(false);
  const [actionLoading, setActionLoading] = React.useState<string | null>(null);
  const [mounted, setMounted] = React.useState(false);
  const { message: statusMessage, politeness, announce } = useStatusAnnouncer();

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const handleMarkAsRead = async (notificationId: string) => {
    setActionLoading(notificationId);
    try {
      await onMarkAsRead(notificationId);
      announce("Notification marked as read");
    } finally {
      setActionLoading(null);
    }
  };

  const handleMarkAllAsRead = async () => {
    setActionLoading("all");
    try {
      await onMarkAllAsRead();
      announce("All notifications marked as read");
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (notificationId: string) => {
    setActionLoading(`delete-${notificationId}`);
    try {
      await onDelete(notificationId);
      announce("Notification deleted");
    } finally {
      setActionLoading(null);
    }
  };

  const handleAccept = async (notificationId: string, collaboratorId: string) => {
    setActionLoading(`accept-${notificationId}`);
    try {
      await onAccept(notificationId, collaboratorId);
      announce("Invitation accepted");
    } finally {
      setActionLoading(null);
    }
  };

  if (!mounted) {
    return (
      <Button 
        variant="ghost" 
        size="icon" 
        className="relative"
        aria-label="Open notifications"
        disabled
      >
        <Bell className="h-5 w-5" aria-hidden="true" />
        {unreadCount > 0 && (
          <span 
            className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-[10px] font-medium text-destructive-foreground"
            aria-hidden="true"
          >
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </Button>
    );
  }

  return (
    <>
      <LiveRegion message={statusMessage} politeness={politeness} />
      
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button 
            variant="ghost" 
            size="icon" 
            className="relative"
            aria-label={`Open notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ""}`}
            aria-haspopup="dialog"
          >
            <Bell className="h-5 w-5" aria-hidden="true" />
            {unreadCount > 0 && (
              <span 
                className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-[10px] font-medium text-destructive-foreground"
                aria-hidden="true"
              >
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </Button>
        </DialogTrigger>
        <DialogContent 
          className="sm:max-w-md p-0 gap-0 overflow-hidden"
          aria-label="Notifications"
        >
          <DialogHeader className="px-6 pt-6 pb-4 border-b bg-muted/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-primary/10 text-primary">
                  <Bell className="h-5 w-5" />
                </div>
                <div>
                  <DialogTitle>Notifications</DialogTitle>
                  <DialogDescription className="text-xs mt-0.5">
                    {unreadCount > 0 ? `${unreadCount} unread` : "All caught up!"}
                  </DialogDescription>
                </div>
              </div>
              {unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleMarkAllAsRead}
                  disabled={actionLoading === "all"}
                  className="text-xs h-8 rounded-lg"
                  aria-label={`Mark all ${unreadCount} notifications as read`}
                >
                  {actionLoading === "all" ? (
                    <Loader2 className="mr-1.5 h-3 w-3 animate-spin" aria-hidden="true" />
                  ) : (
                    <CheckCheck className="mr-1.5 h-3 w-3" aria-hidden="true" />
                  )}
                  Mark all read
                </Button>
              )}
            </div>
          </DialogHeader>
          
          <ScrollArea className="max-h-[60vh]">
            <div 
              className="p-4"
              role="region"
              aria-labelledby="notifications-title"
              aria-busy={isLoading}
            >
              {isLoading ? (
                <div className="flex items-center justify-center py-12" role="status">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" aria-hidden="true" />
                  <span className="sr-only">Loading notifications</span>
                </div>
              ) : notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center" role="status">
                  <div className="p-4 rounded-full bg-muted/50 mb-4">
                    <Bell className="h-8 w-8 text-muted-foreground/50" aria-hidden="true" />
                  </div>
                  <p className="text-sm font-medium">No notifications yet</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    You&apos;ll see notifications here when you have them
                  </p>
                </div>
              ) : (
                <ul className="space-y-2" role="list" aria-label={`${notifications.length} notifications`}>
                  {notifications.map((notification) => (
                    <NotificationItem
                      key={notification.id}
                      notification={notification}
                      isLoading={
                        actionLoading === notification.id ||
                        actionLoading === `delete-${notification.id}` ||
                        actionLoading === `accept-${notification.id}`
                      }
                      onMarkAsRead={() => handleMarkAsRead(notification.id)}
                      onDelete={() => handleDelete(notification.id)}
                      onAccept={(collaboratorId) => handleAccept(notification.id, collaboratorId)}
                    />
                  ))}
                </ul>
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  );
}


interface NotificationItemProps {
  notification: Notification;
  isLoading: boolean;
  onMarkAsRead: () => void;
  onDelete: () => void;
  onAccept: (collaboratorId: string) => void;
}

function NotificationItem({
  notification,
  isLoading,
  onMarkAsRead,
  onDelete,
  onAccept,
}: NotificationItemProps) {
  const isUnread = !notification.isRead;
  const timeAgo = getTimeAgo(new Date(notification.created));
  const icon = getNotificationIcon(notification.type);

  return (
    <li
      className={cn(
        "group relative flex gap-3 rounded-xl p-3 transition-all",
        isUnread
          ? "bg-primary/5 hover:bg-primary/10 border border-primary/10"
          : "hover:bg-muted/50 border border-transparent"
      )}
      aria-label={`${isUnread ? "Unread: " : ""}${notification.title}, ${timeAgo}`}
    >
      {isUnread && (
        <div 
          className="absolute left-1.5 top-1/2 -translate-y-1/2 h-2 w-2 rounded-full bg-primary" 
          aria-hidden="true"
        />
      )}

      <div className="flex-shrink-0 mt-0.5" aria-hidden="true">
        <div className={cn(
          "flex h-9 w-9 items-center justify-center rounded-xl",
          isUnread ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
        )}>
          {icon}
        </div>
      </div>

      <div className="flex-1 min-w-0">
        <p className={cn(
          "text-sm",
          isUnread ? "font-medium" : "text-muted-foreground"
        )}>
          {notification.title}
        </p>
        {notification.message && (
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
            {notification.message}
          </p>
        )}
        <p className="text-xs text-muted-foreground/70 mt-1.5">
          <time dateTime={notification.created}>{timeAgo}</time>
        </p>
      </div>

      {notification.type === NotificationType.COLLABORATION_INVITE && notification.data?.collaboratorId && (
        <div className="flex-shrink-0 self-center">
            <Button
              size="sm"
              className="h-7 px-2.5 text-xs rounded-lg"
              onClick={() => onAccept(notification.data?.collaboratorId as string)}
              disabled={isLoading}
              aria-label={`Accept invitation to ${notification.data?.templateTitle}`}
            >
              {isLoading && (isLoading as any) === `accept-${notification.id}` ? (
                <Loader2 className="mr-1 h-3 w-3 animate-spin" />
              ) : (
                <Check className="mr-1 h-3 w-3" />
              )}
              Accept
            </Button>
        </div>
      )}

      <div 
        className="flex-shrink-0 flex items-start gap-1 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity"
        role="group"
        aria-label="Notification actions"
      >
        {isUnread && (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 rounded-lg"
            onClick={onMarkAsRead}
            disabled={isLoading}
            aria-label={`Mark "${notification.title}" as read`}
          >
            {isLoading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
            ) : (
              <Check className="h-3.5 w-3.5" aria-hidden="true" />
            )}
          </Button>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 rounded-lg text-muted-foreground hover:text-destructive"
          onClick={onDelete}
          disabled={isLoading}
          aria-label={`Delete notification "${notification.title}"`}
        >
          {isLoading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
          ) : (
            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
          )}
        </Button>
      </div>
    </li>
  );
}

function getTimeAgo(date: Date): string {
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return "Just now";
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours}h ago`;
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) return `${diffInDays}d ago`;
  const diffInWeeks = Math.floor(diffInDays / 7);
  if (diffInWeeks < 4) return `${diffInWeeks}w ago`;
  const diffInMonths = Math.floor(diffInDays / 30);
  if (diffInMonths < 12) return `${diffInMonths}mo ago`;
  const diffInYears = Math.floor(diffInDays / 365);
  return `${diffInYears}y ago`;
}

function getNotificationIcon(type: NotificationType): React.ReactNode {
  switch (type) {
    case NotificationType.COLLABORATION_INVITE:
      return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <line x1="19" x2="19" y1="8" y2="14" />
          <line x1="22" x2="16" y1="11" y2="11" />
        </svg>
      );
    case NotificationType.COLLABORATION_ACCEPTED:
      return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <polyline points="16 11 18 13 22 9" />
        </svg>
      );
    case NotificationType.COLLABORATION_REVOKED:
      return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <line x1="17" x2="22" y1="8" y2="13" />
          <line x1="22" x2="17" y1="8" y2="13" />
        </svg>
      );
    case NotificationType.TEMPLATE_UPDATED:
      return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
          <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
          <polyline points="14 2 14 8 20 8" />
          <path d="M12 18v-6" />
          <path d="m9 15 3-3 3 3" />
        </svg>
      );
    case NotificationType.CHECKLIST_REMINDER:
      return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
      );
    case NotificationType.SYSTEM:
    default:
      return <Bell className="h-4 w-4" />;
  }
}

export { NotificationItem };
