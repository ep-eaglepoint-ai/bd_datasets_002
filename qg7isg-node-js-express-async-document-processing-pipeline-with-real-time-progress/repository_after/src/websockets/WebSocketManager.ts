import { WebSocket, WebSocketServer } from 'ws';
import { IncomingMessage } from 'http';
import { parse } from 'url';
import prisma from '../config/database';
import { WebSocketMessage } from '../types';

interface WebSocketClient extends WebSocket {
  jobId?: string;
  partnerId?: string;
  isAlive?: boolean;
}

class WebSocketManager {
  private wss: WebSocketServer;
  private connections: Map<string, Set<WebSocketClient>>;
  private heartbeatInterval: NodeJS.Timeout | null;

  constructor(wss: WebSocketServer) {
    this.wss = wss;
    this.connections = new Map();
    this.heartbeatInterval = null;
    this.setupHeartbeat();
  }

  private setupHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      this.wss.clients.forEach((ws: WebSocket) => {
        const client = ws as WebSocketClient;
        if (client.isAlive === false) {
          this.removeConnection(client);
          return client.terminate();
        }
        client.isAlive = false;
        client.ping();
      });
    }, 30000); // 30 seconds
  }

  async handleConnection(ws: WebSocketClient, request: IncomingMessage): Promise<void> {
    const { pathname, query } = parse(request.url || '', true);
    
    // Extract jobId from path: /ws/jobs/:jobId
    const match = pathname?.match(/^\/ws\/jobs\/([^/]+)$/);
    if (!match) {
      ws.close(1008, 'Invalid path');
      return;
    }

    const jobId = match[1];
    const partnerId = query.partnerId as string;

    if (!partnerId) {
      ws.close(1008, 'partnerId query parameter is required');
      return;
    }

    // Verify job exists and belongs to partner
    try {
      const job = await prisma.job.findFirst({
        where: { id: jobId, partnerId },
      });

      if (!job) {
        ws.close(1008, 'Job not found or access denied');
        return;
      }

      ws.jobId = jobId;
      ws.partnerId = partnerId;
      ws.isAlive = true;

      // Add to connections map
      if (!this.connections.has(jobId)) {
        this.connections.set(jobId, new Set());
      }
      this.connections.get(jobId)!.add(ws);

      console.log(`WebSocket connected for job ${jobId}, total connections: ${this.connections.get(jobId)!.size}`);

      ws.on('pong', () => {
        ws.isAlive = true;
      });

      ws.on('close', () => {
        this.removeConnection(ws);
      });

      ws.on('error', (error) => {
        console.error('WebSocket error:', error);
        this.removeConnection(ws);
      });

      // Send initial status
      ws.send(JSON.stringify({
        type: 'connected',
        jobId,
        status: job.status,
        progress: job.progress,
      }));
    } catch (error) {
      console.error('WebSocket connection error:', error);
      ws.close(1011, 'Internal server error');
    }
  }

  private removeConnection(ws: WebSocketClient): void {
    if (ws.jobId) {
      const jobConnections = this.connections.get(ws.jobId);
      if (jobConnections) {
        jobConnections.delete(ws);
        if (jobConnections.size === 0) {
          this.connections.delete(ws.jobId);
        }
      }
      console.log(`WebSocket disconnected for job ${ws.jobId}`);
    }
  }

  broadcast(jobId: string, message: WebSocketMessage): void {
    const jobConnections = this.connections.get(jobId);
    if (!jobConnections || jobConnections.size === 0) {
      return;
    }

    const messageStr = JSON.stringify(message);
    jobConnections.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(messageStr);
      }
    });
  }

  close(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    this.wss.clients.forEach((client) => {
      client.close(1001, 'Server shutting down');
    });
  }
}

export default WebSocketManager;
