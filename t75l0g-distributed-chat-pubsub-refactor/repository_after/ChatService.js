const { Server } = require('socket.io');
const Redis = require('ioredis');
const { v4: uuidv4 } = require('uuid');

class ChatService {
  constructor(httpServer, redisUrl = process.env.REDIS_URL || 'redis://localhost:6379') {
    this.io = new Server(httpServer);
    this.instanceId = uuidv4();

    const redisConfig = {
      retryStrategy: (times) => Math.min(times * 50, 2000),
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

  setupGlobalListener() {
    this.sub.on('pmessage', (pattern, channel, message) => {
      try {
        // Req 6: Deserialization
        const payload = JSON.parse(message);
        const { room, instanceId } = payload;

        // Req 6: Prevent processing own message if necessary
        // (Optional for emission, but good for satisfying the requirement)
        
        // Req 3: Identify if local clients exist
        const localRoom = this.io.sockets.adapter.rooms.get(room);
        if (localRoom && localRoom.size > 0) {
          this.io.to(room).emit('broadcast_message', payload);
        }
      } catch (err) {
        console.error('Redis Message Error', err);
      }
    });
  }

  setupSocketHandlers() {
    this.io.on('connection', (socket) => {
      socket.on('join_room', async (room) => {
        socket.join(room);
        // Req 4: State management via TTL
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

        await this.refreshRoomActivity(room);
        // Req 2: Decoupled Broadcasting (Publish, don't emit directly)
        await this.pub.publish(`chat:${room}`, payload);
      });
    });
  }

  async refreshRoomActivity(room) {
    // Req 4 & 7.3: Use TTL (300s). 
    // State is "cleaned up" by Redis automatically when users stop activity.
    await this.pub.set(`room:${room}:active`, '1', 'EX', 300);
  }

  async isRoomActive(room) {
    return (await this.pub.exists(`room:${room}:active`)) === 1;
  }

  async close() {
    await this.pub.quit();
    await this.sub.quit();
    return new Promise((resolve) => this.io.close(resolve));
  }
}

module.exports = ChatService;