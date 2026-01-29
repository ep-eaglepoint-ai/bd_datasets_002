import { WebSocketServer } from 'ws';
import { createServer } from 'http';
import { setupWebSocket, getBroadcastFn, getConnectedClients } from '../repository_after/src/websocket';

describe('websocket', () => {
    let server: ReturnType<typeof createServer>;
    let wss: WebSocketServer;

    beforeAll(() => {
        server = createServer((req, res) => res.end());
        wss = setupWebSocket(server);
    });

    afterAll((done) => {
        wss.close(() => { server.close(() => done()); });
    });

    it('getBroadcastFn returns a function', () => {
        expect(typeof getBroadcastFn()).toBe('function');
    });

    it('getConnectedClients returns 0 when no clients', () => {
        expect(getConnectedClients()).toBe(0);
    });

    it('broadcast stringifies once per event', () => {
        const stringifySpy = jest.spyOn(JSON, 'stringify');
        const broadcast = getBroadcastFn();
        const event = {
            event_id: 'e1', device_id: 'd1', sensor_type: 'temp', value: 25, unit: 'C',
            timestamp: '2024-01-01T00:00:00Z', processed_at: new Date(), received_at: new Date(),
        };
        broadcast(event);
        expect(stringifySpy).toHaveBeenCalledTimes(1);
        stringifySpy.mockRestore();
    });
});
