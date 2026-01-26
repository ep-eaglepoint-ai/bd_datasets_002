const { Server } = require('socket.io');

class ChatService {
  constructor(httpServer) {
    this.io = new Server(httpServer);
    // Local state: only tracks users on THIS instance
    this.rooms = new Map(); 

    this.io.on('connection', (socket) => {
      socket.on('join_room', (roomName) => {
        socket.join(roomName);
        if (!this.rooms.has(roomName)) {
          this.rooms.set(roomName, new Set());
        }
        this.rooms.get(roomName).add(socket.id);
      });

      socket.on('send_message', (data) => {
        const { room, message, sender } = data;
        // Bottleneck: This only emits to clients on the SAME server instance
        this.io.to(room).emit('broadcast_message', {
          sender,
          message,
          timestamp: Date.now()
        });
      });

      socket.on('disconnect', () => {
        this.rooms.forEach((users, room) => {
          users.delete(socket.id);
        });
      });
    });
  }
}