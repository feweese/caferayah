"use client";

import { createContext, useContext, useEffect, useState, useRef, ReactNode } from "react";
import { Socket } from "socket.io-client";
import { useSession } from "next-auth/react";
import { socketClient } from "@/lib/client-socket";

// Define notification type
interface NotificationType {
  id?: string;
  title: string;
  message?: string;
  type?: string;
  read?: boolean;
  createdAt?: string;
  userId?: string;
  metadata?: Record<string, unknown>;
}

// Create a custom event for notifications to decouple from socket
export const NOTIFICATION_EVENT = "app:notification";

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  isConnected: false,
});

// Helper to dispatch notification events
export function dispatchNotificationEvent(notification: NotificationType) {
  const event = new CustomEvent(NOTIFICATION_EVENT, { detail: notification });
  window.dispatchEvent(event);
  console.log("SocketProvider: Dispatched notification event:", notification.title);
}

export function SocketProvider({ children }: { children: ReactNode }) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const { data: session, status } = useSession();
  const reconnectInterval = useRef<NodeJS.Timeout | null>(null);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    console.log("SocketProvider: Checking authentication status", status);
    
    // Only initialize socket if user is authenticated
    if (status !== "authenticated" || !session?.user?.id) {
      console.log("SocketProvider: User not authenticated yet");
      return;
    }

    console.log("SocketProvider: Setting up socket for user", session.user.id);
    
    const setupSocket = async () => {
      try {
        console.log("SocketProvider: Initializing socketClient");
        // Initialize socket using the singleton
        const socketInstance = await socketClient.initialize(session.user.id);
        console.log("SocketProvider: Socket initialized with ID", socketInstance.id);
        
        // Store in ref for persistence across renders
        socketRef.current = socketInstance;
        
        // Update state with the singleton socket
        setSocket(socketInstance);
        setIsConnected(socketInstance.connected);
        
        // Set up connection status listeners
        const onConnect = () => {
          console.log("SocketProvider: Socket connected event");
          setIsConnected(true);
          
          // Re-authenticate when reconnected
          socketClient.authenticate(session.user.id);
        };
        
        const onDisconnect = (reason) => {
          console.log("SocketProvider: Socket disconnected event, reason:", reason);
          setIsConnected(false);
          
          // Start reconnection attempts if not already trying
          if (!reconnectInterval.current) {
            reconnectInterval.current = setInterval(() => {
              if (socketRef.current?.connected) {
                if (reconnectInterval.current) {
                  clearInterval(reconnectInterval.current);
                  reconnectInterval.current = null;
                }
                return;
              }
              
              console.log("SocketProvider: Attempting reconnection...");
              socketClient.authenticate(session.user.id);
            }, 5000);
          }
        };
        
        // Handle incoming notifications
        const onNotification = (data: NotificationType) => {
          console.log("SocketProvider: Notification received", data.title);
          // Dispatch the notification as a DOM event to decouple from React rendering
          dispatchNotificationEvent(data);
        };
        
        socketInstance.on('connect', onConnect);
        socketInstance.on('disconnect', onDisconnect);
        socketInstance.on('notification', onNotification);
        socketInstance.on('newNotification', onNotification);
        
        socketInstance.io.on("reconnect", () => {
          console.log("SocketProvider: Socket reconnected");
          socketClient.authenticate(session.user.id);
        });
        
        // Clean up listeners, but don't disconnect the socket
        return () => {
          console.log("SocketProvider: Cleaning up listeners only");
          socketInstance.off('connect', onConnect);
          socketInstance.off('disconnect', onDisconnect);
          socketInstance.off('notification', onNotification);
          socketInstance.off('newNotification', onNotification);
          socketInstance.io.off("reconnect");
          
          if (reconnectInterval.current) {
            clearInterval(reconnectInterval.current);
            reconnectInterval.current = null;
          }
        };
      } catch (error) {
        console.error('Socket setup error:', error);
      }
    };
    
    const cleanupPromise = setupSocket();
    
    // Only clean up event listeners, not the socket itself
    return () => {
      console.log("SocketProvider: Component unmounting, preserving socket");
      cleanupPromise.then(cleanupFn => cleanupFn && cleanupFn());
    };
  }, [session, status]);

  return (
    <SocketContext.Provider value={{ socket: socketRef.current || socket, isConnected }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  return useContext(SocketContext);
} 