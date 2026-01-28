const { Server } = require('socket.io');
const Redis = require('ioredis');
const { v4: uuidv4 } = require('uuid');

class ChatService {
  constructor(httpServer, redisUrl = 'redis://localhost:6379') {
    this.io = new Server(httpServer);
    this.instanceId = uuidv4();

    // Resilience: Retry strategy
    const redisConfig = {
      retryStrategy: (times) => Math.min(times * 50, 2000),
      reconnectOnError: (err) => true
    };

    // Req 1: Separate connections
    this.pub = new Redis(redisUrl, redisConfig);
    this.sub = new Redis(redisUrl, redisConfig);

    this.setupGlobalListener();
    this.setupSocketHandlers();
    
    // Req 5: Resilience - Re-subscribe on reconnection
    this.sub.on('ready', () => {
      this.sub.psubscribe('chat:*');
    });
  }

  /* ---------------- Redis Global Listener ---------------- */

  setupGlobalListener() {
    this.sub.on('pmessage', (_pattern, _channel, message) => {
      try {
        // Req 6: Deserialization
        const payload = JSON.parse(message);
        const { room } = payload;

        if (!room) return;

        // Req 3: Global Listener -> Local Check
        // We DO NOT check instanceId here. 
        // We rely on the "Fire and Forget" pattern. The sender's instance 
        // receives this message from Redis and broadcasts it to its local users.
        // This ensures consistent ordering and logic for all clients.
        
        const localRoom = this.io.sockets.adapter.rooms.get(room);
        if (localRoom && localRoom.size > 0) {
           this.io.to(room).emit('broadcast_message', payload);
        }
      } catch (err) {
        console.error('Redis parse error:', err);
      }
    });
  }

  /* ---------------- Socket Handlers ---------------- */

  setupSocketHandlers() {
    this.io.on('connection', (socket) => {

      socket.on('join_room', async (room) => {
        socket.join(room);
        // Req 4: State Management (Occupancy)
        // We bump the TTL. We do NOT delete this key manually when a user leaves
        // because we don't know if other servers have users. 
        // We let Redis expire it naturally.
        await this.refreshRoomActivity(room);
      });

      socket.on('send_message', async ({ room, message, sender }) => {
        // Req 6: Serialization with Instance ID
        const payload = JSON.stringify({
          instanceId: this.instanceId,
          room,
          sender,
          message,
          timestamp: Date.now()
        });

        // Keep room active while chatting
        await this.refreshRoomActivity(room);

        // Req 2: Decoupled Broadcasting
        await this.pub.publish(`chat:${room}`, payload);
      });

      // FIX: Use 'disconnecting' to access socket.rooms before they are cleared
      socket.on('disconnecting', () => {
        // We don't need manual cleanup of Redis keys here.
        // The TTL (Time To Live) strategy handles "global emptiness".
      });
    });
  }

  async refreshRoomActivity(room) {
    // Req 4: Set/Refresh TTL. 'EX' is Seconds.
    // 300 seconds = 5 minutes.
    await this.pub.set(`room:${room}:active`, '1', 'EX', 300);
  }

  async isRoomActive(room) {
    // Returns 1 if exists, 0 if not
    const exists = await this.pub.exists(`room:${room}:active`);
    return exists === 1;
  }

  async close() {
    await this.pub.quit();
    await this.sub.quit();
    this.io.close();
  }
}

module.exports = ChatService;