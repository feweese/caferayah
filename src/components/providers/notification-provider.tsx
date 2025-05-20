"use client";

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";
import { useSocket, NOTIFICATION_EVENT } from "./socket-provider";
import { useSession } from "next-auth/react";

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

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  error: string | null;
  fetchNotifications: () => Promise<void>;
  markAsRead: (id: string) => Promise<boolean>;
  deleteAllNotifications: () => Promise<boolean>;
  batchMarkAsRead: (ids: string[]) => Promise<boolean>;
  batchDeleteNotifications: (ids: string[]) => Promise<boolean>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { socket, isConnected } = useSocket();
  const { status } = useSession();

  const fetchNotifications = useCallback(async () => {
    // Skip fetching if user is not authenticated
    if (status !== "authenticated") {
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/notifications');
      
      if (!response.ok) {
        throw new Error('Failed to fetch notifications');
      }
      
      const data = await response.json();
      setNotifications(data);
    } catch (err) {
      console.error('Error fetching notifications:', err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setLoading(false);
    }
  }, [status]);

  const markAsRead = useCallback(async (id: string) => {
    console.log(`Attempting to mark notification ${id} as read`);
    
    // Optimistically update the UI immediately
    setNotifications(prev => 
      prev.map(notification => 
        notification.id === id 
          ? { ...notification, read: true } 
          : notification
      )
    );
    
    // Then try to update on the server
    try {
      const response = await fetch(`/api/notifications/${id}/read`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      if (!response.ok) {
        // If server update fails, revert the optimistic update
        console.error(`Server error marking notification as read: ${response.status} ${response.statusText}`);
        
        // Refresh notifications to get the correct state
        await fetchNotifications();
        return false;
      }
      
      console.log(`Successfully marked notification ${id} as read`);
      return true;
    } catch (err) {
      console.error('Error marking notification as read:', err);
      
      // Refresh notifications to get the correct state on error
      await fetchNotifications();
      return false;
    }
  }, [fetchNotifications]);

  const deleteAllNotifications = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/notifications/delete-all', {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete notifications');
      }
      
      // Reset notifications
      setNotifications([]);
      setLoading(false);
      return true;
    } catch (err) {
      console.error('Error deleting all notifications:', err);
      setLoading(false);
      return false;
    }
  }, []);

  const batchMarkAsRead = useCallback(async (ids: string[]) => {
    if (!ids.length) return true;
    
    // Optimistically update UI
    setNotifications(prev => 
      prev.map(notification => 
        ids.includes(notification.id) 
          ? { ...notification, read: true } 
          : notification
      )
    );
    
    try {
      const response = await fetch('/api/notifications/batch-action', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'markAsRead',
          notificationIds: ids
        })
      });
      
      if (!response.ok) {
        // Revert optimistic update on failure
        await fetchNotifications();
        return false;
      }
      
      return true;
    } catch (err) {
      console.error('Error in batch mark as read:', err);
      await fetchNotifications();
      return false;
    }
  }, [fetchNotifications]);
  
  const batchDeleteNotifications = useCallback(async (ids: string[]) => {
    if (!ids.length) return true;
    
    // Optimistically update UI
    setNotifications(prev => prev.filter(notification => !ids.includes(notification.id)));
    
    try {
      const response = await fetch('/api/notifications/batch-action', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'delete',
          notificationIds: ids
        })
      });
      
      if (!response.ok) {
        // Revert optimistic update on failure
        await fetchNotifications();
        return false;
      }
      
      return true;
    } catch (err) {
      console.error('Error in batch delete:', err);
      await fetchNotifications();
      return false;
    }
  }, [fetchNotifications]);

  const unreadCount = notifications.filter(n => !n.read).length;

  // Initial fetch
  useEffect(() => {
    if (status === "authenticated") {
      console.log("NotificationProvider: Initial fetch");
      fetchNotifications();
      
      // Always enable polling regardless of socket connection
      const intervalId = setInterval(() => {
        console.log("NotificationProvider: Polling for notifications");
        fetchNotifications();
      }, 30000); // 30 seconds
      
      return () => clearInterval(intervalId);
    } else {
      // Clear notifications when user is not authenticated
      setNotifications([]);
    }
  }, [fetchNotifications, status]);
  
  // Listen for real-time notifications via custom events
  useEffect(() => {
    if (status !== "authenticated") {
      return;
    }

    console.log("NotificationProvider: Setting up custom notification listener");

    const handleNotification = (event: CustomEvent) => {
      const newNotification = event.detail;
      console.log("NotificationProvider: Received real-time notification:", newNotification.title);
      
      // Check if notification already exists to avoid duplicates
      setNotifications(prev => {
        const exists = prev.some(n => n.id === newNotification.id);
        if (exists) {
          console.log("NotificationProvider: Duplicate notification skipped");
          return prev;
        }
        return [newNotification, ...prev];
      });
    };

    // Use standard DOM events instead of socket events for better reliability
    window.addEventListener(NOTIFICATION_EVENT, handleNotification as EventListener);

    return () => {
      console.log("NotificationProvider: Removing custom notification listener");
      window.removeEventListener(NOTIFICATION_EVENT, handleNotification as EventListener);
    };
  }, [status]);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        loading,
        error,
        fetchNotifications,
        markAsRead,
        deleteAllNotifications,
        batchMarkAsRead,
        batchDeleteNotifications,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  
  return context;
} 