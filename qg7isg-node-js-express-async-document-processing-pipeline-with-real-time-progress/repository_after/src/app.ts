import express from 'express';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import { config } from './config';
import healthRoutes from './routes/health';
import apiRoutes from './routes/api';
import { errorHandler } from './middleware/errorHandler';
import WebSocketManager from './websockets/WebSocketManager';
import { createJobEventsSubscriber, subscribeToJobEvents } from './config/jobEvents';

const app = express();
const server = createServer(app);
// No path filter so clients can connect to /ws/jobs/:jobId; WebSocketManager validates path
const wss = new WebSocketServer({ server });

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, X-API-Key');
  
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

// Routes
app.use('/api', healthRoutes);
app.use('/api', apiRoutes);

// Error handler
app.use(errorHandler);

// WebSocket setup
const wsManager = new WebSocketManager(wss);
wss.on('connection', (ws, request) => {
  wsManager.handleConnection(ws as any, request);
});

// Redis subscriber: worker (separate process) publishes progress; we broadcast to WebSocket clients
const jobEventsSubscriber = createJobEventsSubscriber();
subscribeToJobEvents(jobEventsSubscriber, ({ jobId, message }) => {
  wsManager.broadcast(jobId, message as any);
});

export { wsManager };

/** Call in tests to close Redis subscriber and WebSocket manager so Jest can exit */
export function closeForTest(): void {
  jobEventsSubscriber.disconnect();
  wsManager.close();
}

// Graceful shutdown
const shutdown = async () => {
  console.log('Shutting down gracefully...');
  jobEventsSubscriber.disconnect();
  wsManager.close();
  const prisma = (await import('./config/database')).default;
  await prisma.$disconnect();
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });

  // Force shutdown after 10 seconds
  setTimeout(() => {
    console.error('Forced shutdown');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

// Start server
if (require.main === module) {
  server.listen(config.port, () => {
    console.log(`Server running on port ${config.port}`);
    console.log(`Environment: ${config.nodeEnv}`);
  });
}

export default app;
