import { Server as NetServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { NextApiRequest } from 'next';
import { NextApiResponse } from 'next';

export type NextApiResponseWithSocket = NextApiResponse & {
  socket: {
    server: NetServer & {
      io?: SocketIOServer;
    };
  };
};

// Keep track of connected users by userId
const connectedUsers = new Map<string, string[]>();

// Initialize Socket.IO server
export const initSocketServer = (req: NextApiRequest, res: NextApiResponseWithSocket) => {
  if (!res.socket.server.io) {
    const io = new SocketIOServer(res.socket.server);
    res.socket.server.io = io;

    io.on('connection', (socket) => {
      console.log('Client connected:', socket.id);

      // Handle user authentication and room joining
      socket.on('authenticate', (userId: string) => {
        console.log(`User ${userId} authenticated on socket ${socket.id}`);
        
        // Join user to their private room
        socket.join(`user:${userId}`);
        
        // Store user connection
        if (!connectedUsers.has(userId)) {
          connectedUsers.set(userId, []);
        }
        connectedUsers.get(userId)?.push(socket.id);
      });

      socket.on('disconnect', () => {
        // Clean up connected users map
        for (const [userId, socketIds] of connectedUsers.entries()) {
          const filteredIds = socketIds.filter(id => id !== socket.id);
          if (filteredIds.length === 0) {
            connectedUsers.delete(userId);
          } else {
            connectedUsers.set(userId, filteredIds);
          }
        }

        console.log('Client disconnected:', socket.id);
      });
    });
  }
  
  return res.socket.server.io;
};

// Send notification to a specific user
export const emitNotificationToUser = (
  io: SocketIOServer,
  userId: string,
  notification: any
) => {
  console.log(`Emitting notification to user:${userId}`, notification.title);
  io.to(`user:${userId}`).emit('notification', notification);
};

// Send notification to multiple users
export const emitNotificationToBulk = (
  io: SocketIOServer,
  userIds: string[],
  notification: any
) => {
  userIds.forEach(userId => {
    emitNotificationToUser(io, userId, notification);
  });
};

// Check if a user is online
export const isUserOnline = (userId: string): boolean => {
  return connectedUsers.has(userId) && connectedUsers.get(userId)!.length > 0;
}; 