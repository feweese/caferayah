import { Server } from 'socket.io';

// Map to store active socket connections by user ID
const userSockets = new Map();

export default function handler(req, res) {
  if (res.socket.server.io) {
    console.log('Socket.IO already running');
    res.end();
    return;
  }

  console.log('Setting up Socket.IO server');
  
  const io = new Server(res.socket.server);
  res.socket.server.io = io;

  // Socket authentication
  io.use((socket, next) => {
    console.log('Socket auth middleware called with handshake:', 
      JSON.stringify({
        auth: socket.handshake.auth,
        query: socket.handshake.query
      }));
    
    const userId = socket.handshake.auth.userId;
    if (!userId) {
      console.log('Socket auth failed: No userId provided');
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
    console.log(`New client connected: ${socket.id}`);
    
    // Handle authentication event
    socket.on('authenticate', (userId) => {
      console.log(`User ${userId} authenticated on socket ${socket.id}`);
      
      // Join user to their private room
      socket.join(`user:${userId}`);
      
      // Store user connection
      if (!userSockets.has(userId)) {
        userSockets.set(userId, new Set());
      }
      userSockets.get(userId).add(socket.id);
      socket.userId = userId;
    });
    
    // Handle disconnect
    socket.on('disconnect', () => {
      console.log(`Client disconnected: ${socket.id}`);
      if (socket.userId && userSockets.has(socket.userId)) {
        userSockets.get(socket.userId).delete(socket.id);
        if (userSockets.get(socket.userId).size === 0) {
          userSockets.delete(socket.userId);
        }
      }
    });
  });

  // Attach to global for usage in other files
  global.__socketio = io;

  res.end();
} 