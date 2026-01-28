const express = require('express');
const http = require('http');
const cors = require('cors');
const { SlidingWindowBuffer } = require('./buffer/SlidingWindowBuffer');
const { WebSocketServer } = require('./websocket/WebSocketServer');
const { createHistoryRoutes } = require('./api/historyRoutes');
const { SensorSimulator } = require('./simulator/SensorSimulator');

// Configuration
const PORT = process.env.PORT || 3001;
const SENSOR_COUNT = parseInt(process.env.SENSOR_COUNT, 10) || 50;
const UPDATE_INTERVAL_MS = parseInt(process.env.UPDATE_INTERVAL_MS, 10) || 100;
const WINDOW_SIZE_MS = parseInt(process.env.WINDOW_SIZE_MS, 10) || 10 * 60 * 1000;

// Initialize components
const buffer = new SlidingWindowBuffer(WINDOW_SIZE_MS);
const simulator = new SensorSimulator({
  sensorCount: SENSOR_COUNT,
  updateIntervalMs: UPDATE_INTERVAL_MS,
  thresholds: {
    vibration: 80,
    temperature: 85
  }
});

// Create Express app
const app = express();
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok',
    timestamp: Date.now(),
    sensors: SENSOR_COUNT,
    updateRate: `${1000 / UPDATE_INTERVAL_MS}Hz`
  });
});

// Sensor info endpoint
app.get('/api/sensors', (req, res) => {
  const sensors = simulator.getSensorStates();
  res.json({ sensors });
});

// Single sensor info
app.get('/api/sensors/:sensorId', (req, res) => {
  const info = simulator.getSensorInfo(req.params.sensorId);
  if (!info) {
    return res.status(404).json({ error: 'Sensor not found' });
  }
  res.json(info);
});

// History routes with buffer
app.use('/api/history', createHistoryRoutes(buffer));

// Stats endpoint
app.get('/api/stats', (req, res) => {
  res.json({
    buffer: buffer.getEvictionStats(),
    simulator: {
      running: simulator.isRunning(),
      sensorCount: SENSOR_COUNT
    },
    websocket: wsServer.getStats()
  });
});

// DEBUG: Trigger anomaly for testing alerts
app.post('/api/debug/trigger-alert/:sensorId', (req, res) => {
  const { sensorId } = req.params;
  const readings = parseInt(req.query.readings, 10) || 5;
  
  simulator.triggerAnomaly(sensorId, readings);
  res.json({ 
    success: true, 
    message: `Triggered ${readings} threshold violations on ${sensorId}` 
  });
});

// DEBUG: Trigger alerts on multiple sensors
app.post('/api/debug/trigger-alerts', (req, res) => {
  const count = parseInt(req.query.count, 10) || 5;
  const readings = parseInt(req.query.readings, 10) || 5;
  
  const triggered = [];
  for (let i = 0; i < count; i++) {
    const sensorId = `sensor-${String(i).padStart(3, '0')}`;
    simulator.triggerAnomaly(sensorId, readings);
    triggered.push(sensorId);
  }
  
  res.json({ 
    success: true, 
    message: `Triggered alerts on ${count} sensors`,
    sensors: triggered
  });
});

// Create HTTP server
const server = http.createServer(app);

// Create and attach WebSocket server
const wsServer = new WebSocketServer({
  path: '/ws',
  heartbeatInterval: 30000
});
wsServer.attach(server);

// Connect simulator to buffer and WebSocket broadcast
simulator.start((sensorId, data) => {
  // Store in buffer
  buffer.push(sensorId, data);
  
  // Broadcast to subscribed clients
  wsServer.broadcast(sensorId, data);
});

// Periodic cleanup
setInterval(() => {
  buffer.evictAll();
}, 60000); // Every minute

// Start server
server.listen(PORT, () => {
  console.log(`IoT Sensor Dashboard Server running on port ${PORT}`);
  console.log(`- Sensors: ${SENSOR_COUNT}`);
  console.log(`- Update rate: ${1000 / UPDATE_INTERVAL_MS}Hz`);
  console.log(`- Buffer window: ${WINDOW_SIZE_MS / 1000}s`);
  console.log(`- WebSocket: ws://localhost:${PORT}/ws`);
  console.log(`- API: http://localhost:${PORT}/api`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('Shutting down...');
  simulator.stop();
  wsServer.close();
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

module.exports = { app, server, buffer, wsServer, simulator };
