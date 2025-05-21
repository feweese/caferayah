import { Server } from 'socket.io';

// Map to store active socket connections by user ID
const userSockets = new Map();

export default function handler(req, res) {
  // Always respond with 200 for OPTIONS requests (CORS preflight)
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (res.socket.server.io) {
    console.log('Socket.IO already running');
    res.end();
    return;
  }

  console.log('Setting up Socket.IO server');
  
  // Determine current origin for CORS
  const origin = req.headers.origin || '*';
  console.log(`Socket.IO server initializing with CORS origin: ${origin}`);
  
  // Detect if we're on Vercel
  const isVercel = process.env.VERCEL || false;
  console.log(`Running on Vercel: ${isVercel}`);
  
  // Create Socket.IO server with proper configuration
  const io = new Server(res.socket.server, {
    path: '/api/socketio',
    addTrailingSlash: false,
    cors: {
      origin: ['*', origin, 'https://caferayah.vercel.app'], // Add your production domain
      methods: ['GET', 'POST'],
      credentials: true
    },
    // Use polling on Vercel since WebSockets are not supported
    transports: isVercel ? ['polling'] : ['websocket', 'polling'],
    // Lower values for polling to ensure more responsiveness
    connectTimeout: 10000,
    pingTimeout: 5000,
    pingInterval: 10000,
    // Polling specific options
    polling: {
      responseTimeout: 15000,
    },
    // Allow upgrading later if possible
    allowUpgrades: true,
    // Reduce payload size
    maxHttpBufferSize: 1e6, // 1MB
  });
  
  res.socket.server.io = io;

  // Socket authentication
  io.use((socket, next) => {
    console.log('Socket auth middleware called with handshake:', 
      JSON.stringify({
        auth: socket.handshake.auth,
        query: socket.handshake.query,
        transport: socket.conn.transport.name
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
    console.log(`Socket authenticated for user ${userId} using transport: ${socket.conn.transport.name}`);
    next();
  });

  // Connection handler
  io.on('connection', (socket) => {
    console.log(`New client connected: ${socket.id}, transport: ${socket.conn.transport.name}`);
    
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