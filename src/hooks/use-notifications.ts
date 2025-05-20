"use client";

import { useState, useEffect, useCallback } from "react";

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

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchNotifications = useCallback(async () => {
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
  }, []);

  const markAsRead = useCallback(async (id: string) => {
    try {
      const response = await fetch('/api/notifications', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to mark notification as read');
      }
      
      // Update the notification in the local state
      setNotifications(prev => 
        prev.map(notification => 
          notification.id === id 
            ? { ...notification, read: true } 
            : notification
        )
      );
      
      return true;
    } catch (err) {
      console.error('Error marking notification as read:', err);
      return false;
    }
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

  useEffect(() => {
    fetchNotifications();
    
    // Poll for new notifications every 30 seconds
    const intervalId = setInterval(() => {
      fetchNotifications();
    }, 30000);
    
    return () => clearInterval(intervalId);
  }, [fetchNotifications]);

  return {
    notifications,
    unreadCount,
    loading,
    error,
    fetchNotifications,
    markAsRead,
  };
} 