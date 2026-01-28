import { WebSocket, WebSocketServer } from 'ws';
import { Server } from 'http';
import { eventEmitter } from './queue';
import { ProcessedEvent } from './types';

const clients: Set<WebSocket> = new Set();

export function setupWebSocket(server: Server): void {
    const wss = new WebSocketServer({ server, path: '/ws/events' });
    
    wss.on('connection', (ws: WebSocket) => {
        console.log('New WebSocket client connected');
        clients.add(ws);
        
        ws.on('message', (message: string) => {
            console.log('Received:', message);
        });
        
        ws.on('error', (error) => {
            console.error('WebSocket error:', error);
        });
    });
    
    eventEmitter.on('event_processed', (event: ProcessedEvent) => {
        broadcastEvent(event);
    });
}

function broadcastEvent(event: ProcessedEvent): void {
    clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({
                type: 'event',
                data: event,
            }));
        }
    });
}

export function getConnectedClients(): number {
    return clients.size;
}

