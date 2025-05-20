import { Server as NetServer } from 'http';
import { NextApiResponse } from 'next';
import { Server as SocketIOServer } from 'socket.io';

// Define notification type (same as in socket-provider.tsx)
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

// Get the Socket.IO server instance from global
const getSocketIO = (): SocketIOServer | null => {
  // Only run server-side
  if (typeof window !== 'undefined') return null;
  
  return (global as any).__socketio as SocketIOServer || null;
};

/**
 * Emit a notification to a specific user
 */
export async function emitNotificationToUser(userId: string, notification: NotificationType) {
  try {
    const io = getSocketIO();
    if (!io) {
      console.log('Socket.IO server not available, notification will be delivered on next poll');
      return;
    }
    
    // Emit to user's room
    io.to(`user:${userId}`).emit('notification', notification);
    console.log(`Emitted notification to user ${userId}`);
  } catch (error) {
    console.error('Error emitting notification:', error);
  }
}

/**
 * Emit notifications to multiple users
 */
export async function emitNotificationToBulk(userIds: string[], notification: NotificationType) {
  try {
    const io = getSocketIO();
    if (!io) {
      console.log('Socket.IO server not available, notifications will be delivered on next poll');
      return;
    }
    
    // Emit to each user's room
    userIds.forEach(userId => {
      io.to(`user:${userId}`).emit('notification', notification);
    });
    
    console.log(`Emitted notification to ${userIds.length} users`);
  } catch (error) {
    console.error('Error emitting bulk notifications:', error);
  }
} 