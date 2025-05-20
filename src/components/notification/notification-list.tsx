"use client";

import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2 } from "lucide-react";
import { NotificationItem } from "./notification-item";

interface Notification {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  link: string | null;
  createdAt: string;
}

interface NotificationListProps {
  notifications: Notification[];
  loading: boolean;
  onMarkAsRead: (id: string) => Promise<boolean>;
}

export function NotificationList({
  notifications,
  loading,
  onMarkAsRead,
}: NotificationListProps) {
  
  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  
  if (notifications.length === 0) {
    return (
      <div className="text-center py-8 px-4">
        <p className="text-sm text-muted-foreground">No notifications yet</p>
      </div>
    );
  }
  
  return (
    <ScrollArea className="h-[300px]">
      <div className="divide-y divide-border">
        {notifications.map((notification) => (
          <NotificationItem
            key={notification.id}
            id={notification.id}
            title={notification.title}
            message={notification.message}
            type={notification.type}
            read={notification.read}
            link={notification.link}
            createdAt={notification.createdAt}
            onMarkAsRead={onMarkAsRead}
          />
        ))}
      </div>
    </ScrollArea>
  );
} 