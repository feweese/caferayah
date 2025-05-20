import { Server } from 'socket.io';
import { NextResponse } from 'next/server';
import { createServer } from 'http';

// Map to store active socket connections by user ID
const userSockets = new Map();

// Create Socket.IO server instance
const io = new Server({
  path: '/socket.io', // Explicitly set the path
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
  addTrailingSlash: false, // Fix for some routing issues
});

// Socket authentication
io.use((socket, next) => {
  const userId = socket.handshake.auth.userId;
  if (!userId) {
    return next(new Error('Authentication error'));
  }
  
  // Store the socket for this user
  if (!userSockets.has(userId)) {
    userSockets.set(userId, new Set());
  }
  userSockets.get(userId).add(socket.id);
  
  socket.userId = userId;
  console.log(`Socket authenticated for user ${userId}`);
  next();
});

// Connection handler
io.on('connection', (socket) => {
  console.log(`New socket connected: ${socket.id}`);
  
  // Handle disconnect
  socket.on('disconnect', () => {
    console.log(`Socket disconnected: ${socket.id}`);
    if (socket.userId && userSockets.has(socket.userId)) {
      userSockets.get(socket.userId).delete(socket.id);
      if (userSockets.get(socket.userId).size === 0) {
        userSockets.delete(socket.userId);
      }
    }
  });
});

// Function to send notification to a specific user
export function sendNotificationToUser(userId, notification) {
  if (userSockets.has(userId)) {
    const userSocketIds = userSockets.get(userId);
    console.log(`Sending notification to user ${userId} on ${userSocketIds.size} sockets`);
    
    for (const socketId of userSocketIds) {
      io.to(socketId).emit('notification', notification);
    }
    return true;
  }
  console.log(`User ${userId} not connected, notification not sent in real-time`);
  return false;
}

// Handler for Edge API route
export async function GET(req) {
  // This is just a health check endpoint, actual socket handling is done separately
  return NextResponse.json({ status: 'ok', message: 'Socket.IO server is running' }, { status: 200 });
}

// Attach the io instance to the global object
if (typeof global !== 'undefined') {
  (global as any).__socketio = io;
}

export { io };

export const config = {
  runtime: 'edge',
}; 