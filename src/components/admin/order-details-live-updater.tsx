"use client";

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { socketClient } from '@/lib/client-socket';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';

interface OrderDetailsLiveUpdaterProps {
  orderId: string;
  userId: string;
}

/**
 * Client component that handles real-time updates for the order details page
 * using a direct fetch approach instead of relying on router.refresh()
 */
export function OrderDetailsLiveUpdater({ orderId, userId }: OrderDetailsLiveUpdaterProps) {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdateTime, setLastUpdateTime] = useState<Date>(new Date());
  // Track which status notifications we've already shown
  const shownStatusNotifications = useRef<Set<string>>(new Set());

  // Fetch order data directly from API
  const fetchOrderDetails = async () => {
    setRefreshing(true);
    console.log(`[OrderUpdater] Fetching latest data for order ${orderId.substring(0, 8)}`);
    
    try {
      // Use the admin API endpoint to get the latest order data
      const response = await fetch(`/api/admin/orders/${orderId}`);
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      
      const data = await response.json();
      console.log(`[OrderUpdater] Got fresh data for order ${orderId.substring(0, 8)}`, {
        status: data.status,
        updatedAt: data.updatedAt
      });
      
      // If we got new data, refresh the page
      const orderUpdatedAt = new Date(data.updatedAt);
      if (orderUpdatedAt > lastUpdateTime) {
        console.log(`[OrderUpdater] Order was updated at ${orderUpdatedAt.toISOString()}, refreshing UI`);
        setLastUpdateTime(orderUpdatedAt);
        
        // Use router.refresh to update server components
        router.refresh();
        
        // Check if we've already shown a notification for this status
        const statusNotificationKey = `${data.status}-${data.id}`;
        
        // Only show status notifications if we haven't shown them already
        if (!shownStatusNotifications.current.has(statusNotificationKey)) {
          // Show status-specific notification
          if (data.status === 'COMPLETED') {
            toast.success('Order has been completed');
            shownStatusNotifications.current.add(statusNotificationKey);
          } else if (data.status === 'CANCELLED') {
            toast.error('Order has been cancelled');
            shownStatusNotifications.current.add(statusNotificationKey);
          } else if (['PREPARING', 'RECEIVED', 'OUT_FOR_DELIVERY', 'READY_FOR_PICKUP'].includes(data.status)) {
            toast.info(`Order status: ${data.status.replace('_', ' ').toLowerCase()}`);
            shownStatusNotifications.current.add(statusNotificationKey);
          }
          
          console.log(`[OrderUpdater] Shown notification for status: ${data.status}`);
        } else {
          console.log(`[OrderUpdater] Status notification already shown for: ${data.status}`);
        }
      } else {
        console.log(`[OrderUpdater] No new updates for order ${orderId.substring(0, 8)}`);
      }
    } catch (error) {
      console.error('[OrderUpdater] Error fetching order details:', error);
      toast.error('Could not refresh order data');
    } finally {
      setRefreshing(false);
    }
  };

  // Manual refresh handler
  const handleRefresh = () => {
    fetchOrderDetails();
  };

  useEffect(() => {
    console.log(`[OrderUpdater] Initializing for order ${orderId.substring(0, 8)}`);
    let socketInstance: any = null;
    let isComponentMounted = true;
    
    // Clear notification history when component mounts with a new order
    shownStatusNotifications.current.clear();
    
    // Initialize socket connection
    const initializeSocket = async () => {
      try {
        // Connect to socket
        console.log(`[OrderUpdater] Connecting to socket for user ${userId}`);
        const socket = await socketClient.initialize(userId);
        socketInstance = socket;
        
        console.log(`[OrderUpdater] Socket connected, ID: ${socket.id}`);
        
        // Listen for ALL types of notifications
        socket.on('notification', (notification: any) => {
          if (!isComponentMounted) return;
          
          console.log('[OrderUpdater] Notification received:', notification);
          
          // ANY notification type might indicate an order update
          // Consider events that might match our order ID specifically
          // or general update events that could affect any order
          const shouldRefresh = 
            // Order-specific updates
            notification.orderId === orderId ||
            // General order updates
            notification.type === 'NEW_ORDER' ||
            notification.type === 'NEW_ORDERS' ||
            notification.type === 'ORDER_STATUS' ||
            notification.type === 'ORDERS_UPDATE' ||
            notification.type === 'all';
          
          if (shouldRefresh) {
            console.log(`[OrderUpdater] Relevant notification received, fetching latest data`);
            fetchOrderDetails();
          }
        });
        
        // Initial data fetch
        fetchOrderDetails();
      } catch (error) {
        console.error('[OrderUpdater] Socket initialization error:', error);
      }
    };

    // Initialize socket
    initializeSocket();
    
    // Set up fallback polling every 15 seconds
    const intervalId = setInterval(() => {
      if (!isComponentMounted) return;
      console.log('[OrderUpdater] Performing fallback polling refresh');
      fetchOrderDetails();
    }, 15000);
    
    // Cleanup function
    return () => {
      console.log('[OrderUpdater] Cleaning up component resources');
      isComponentMounted = false;
      
      if (socketInstance) {
        console.log('[OrderUpdater] Removing socket listeners');
        socketInstance.off('notification');
      }
      
      clearInterval(intervalId);
    };
  }, [orderId, userId]);

  return (
    <Button 
      variant="outline" 
      size="sm"
      onClick={handleRefresh} 
      disabled={refreshing}
      className="flex items-center gap-1"
    >
      <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
      {refreshing ? "Refreshing..." : "Refresh"}
    </Button>
  );
} 