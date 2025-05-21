import { Socket, io } from "socket.io-client";

// Singleton pattern for Socket.IO client
class SocketClient {
  private static instance: SocketClient;
  private socket: Socket | null = null;
  private initialized = false;
  private reconnecting = false;
  private userId: string | null = null;
  
  private constructor() {
    console.log("SocketClient: Singleton instance created");
  }
  
  static getInstance(): SocketClient {
    if (!SocketClient.instance) {
      console.log("SocketClient: Creating new singleton instance");
      SocketClient.instance = new SocketClient();
    }
    return SocketClient.instance;
  }
  
  async initialize(userId?: string): Promise<Socket> {
    console.log("SocketClient: Initialize called with userId:", userId);
    
    // We need a userId to initialize the socket
    if (!userId) {
      console.error("SocketClient: Cannot initialize without userId");
      throw new Error("userId is required for socket initialization");
    }
    
    // Store userId for reconnection
    this.userId = userId;
    
    // If already initialized and socket is connected, return existing socket
    if (this.initialized && this.socket && this.socket.connected) {
      console.log("SocketClient: Already initialized and connected, reusing socket:", this.socket.id);
      // Re-authenticate just to be safe
      this.authenticate(userId);
      return this.socket;
    }
    
    console.log("SocketClient: Initializing new socket connection for user", userId);
    
    try {
      // Get the current origin for dynamic URL construction
      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      console.log(`SocketClient: Using origin: ${origin}`);
      
      // Initialize the socket.io server
      await fetch(`${origin}/api/socketio`);
      
      // Create a socket instance with auth data included
      this.socket = io({
        auth: {
          userId: userId
        },
        reconnectionAttempts: 10,
        reconnectionDelay: 1000,
        timeout: 20000,
        // Force WebSocket transport in production
        transports: ['websocket', 'polling'],
        // Add more configuration for production
        path: '/api/socketio',
        // Use absolute URL based on current origin
        ...(origin ? { host: origin } : {})
      });
      
      console.log("SocketClient: Socket instance created with auth userId:", userId);
      
      // Set up event listeners
      this.socket.on('connect', () => {
        console.log('SocketClient: Socket connected with ID:', this.socket?.id);
        this.reconnecting = false;
        
        // Also emit authenticate event for good measure
        this.authenticate(userId);
      });
      
      this.socket.on('connect_error', (error) => {
        console.error('SocketClient: Connection error:', error.message);
        if (!this.reconnecting && this.userId) {
          this.reconnecting = true;
          console.log('SocketClient: Will attempt to reconnect...');
        }
      });
      
      this.socket.on('disconnect', (reason) => {
        console.log('SocketClient: Socket disconnected. Reason:', reason);
        if (!this.reconnecting && this.userId) {
          this.reconnecting = true;
          console.log('SocketClient: Will attempt to reconnect after disconnect...');
        }
      });
      
      this.socket.io.on('reconnect', (attempt) => {
        console.log(`SocketClient: Socket reconnected after ${attempt} attempts`);
        this.reconnecting = false;
        if (this.userId) {
          this.authenticate(this.userId);
        }
      });
      
      this.socket.io.on('reconnect_attempt', (attempt) => {
        console.log(`SocketClient: Reconnection attempt ${attempt}`);
      });
      
      this.socket.io.on('reconnect_error', (error) => {
        console.error('SocketClient: Reconnection error:', error);
      });
      
      this.socket.io.on('reconnect_failed', () => {
        console.error('SocketClient: Failed to reconnect after all attempts');
        this.reconnecting = false;
      });
      
      this.socket.on('error', (error) => {
        console.error('SocketClient: Socket error:', error);
      });
      
      this.initialized = true;
      return this.socket;
    } catch (error) {
      console.error('SocketClient: Error initializing socket:', error);
      throw error;
    }
  }
  
  authenticate(userId: string): void {
    console.log(`SocketClient: Authenticating user ${userId}`);
    if (this.socket && this.socket.connected) {
      this.socket.emit('authenticate', userId);
      console.log(`SocketClient: User ${userId} authenticated with socket ${this.socket.id}`);
    } else {
      console.warn(`SocketClient: Cannot authenticate, socket not connected`);
    }
  }
  
  getSocket(): Socket | null {
    return this.socket;
  }
  
  disconnect(): void {
    if (this.socket) {
      console.log('SocketClient: Disconnecting socket');
      this.socket.disconnect();
      this.socket = null;
      this.initialized = false;
      this.userId = null;
      this.reconnecting = false;
    }
  }
}

// Export singleton instance
export const socketClient = SocketClient.getInstance(); 