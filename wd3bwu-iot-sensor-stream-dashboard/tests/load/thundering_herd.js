const WebSocket = require('ws');
const http = require('http');

// Configuration
const CLIENT_COUNT = 100;
const SERVER_URL = 'http://localhost:3001';
const WS_URL = 'ws://localhost:3001/ws';
const SENSOR_COUNT = 50;

async function runLoadTest() {
  console.log(`Starting load test with ${CLIENT_COUNT} clients...`);
  
  const clients = [];
  const errors = [];
  let connectedCount = 0;
  
  // 1. Establish WebSocket Connections
  console.log('Phase 1: Connecting WebSockets...');
  const connectPromises = [];
  
  for (let i = 0; i < CLIENT_COUNT; i++) {
    const p = new Promise((resolve) => {
      const ws = new WebSocket(WS_URL);
      
      ws.on('open', () => {
        connectedCount++;
        // Subscribe to random subset of sensors (simulating viewport)
        const sensorIds = [];
        for (let j = 0; j < 5; j++) { // 5 visible sensors
            const id = `sensor-${String(Math.floor(Math.random() * SENSOR_COUNT)).padStart(3, '0')}`;
            sensorIds.push(id);
        }
        
        ws.send(JSON.stringify({
          type: 'subscribe',
          sensorIds
        }));
        
        resolve(ws);
      });
      
      ws.on('error', (err) => {
        errors.push(`WS Error client ${i}: ${err.message}`);
        resolve(null);
      });
    });
    connectPromises.push(p);
  }
  
  const results = await Promise.all(connectPromises);
  results.forEach(ws => { 
      if(ws) clients.push(ws); 
  });
  
  console.log(`Connected ${clients.length}/${CLIENT_COUNT} clients.`);
  
  // 2. Thundering Herd: Request History Simultaneously
  console.log('Phase 2: Thundering Herd (Historical Requests)...');
  
  const startTime = Date.now();
  const requestPromises = [];
  
  const sensorId = `sensor-001`; // Everyone requests same sensor (worst case for locking?) 
  // actually coalescer should handle this well.
  // Let's mix it up to stress DB too.
  
  for (let i = 0; i < CLIENT_COUNT; i++) {
    const targetSensor = `sensor-${String(i % 10).padStart(3, '0')}`; // Hot-spot on first 10 sensors
    
    const p = new Promise((resolve) => {
      http.get(`${SERVER_URL}/api/history/${targetSensor}?start=${Date.now() - 600000}`, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
           resolve({ status: res.statusCode, time: Date.now() - startTime });
        });
      }).on('error', (err) => {
        resolve({ error: err.message, time: Date.now() - startTime });
      });
    });
    requestPromises.push(p);
  }
  
  const responses = await Promise.all(requestPromises);
  const duration = Date.now() - startTime;
  
  // Analyze API Results
  const successes = responses.filter(r => r.status === 200).length;
  const avgTime = responses.reduce((acc, r) => acc + r.time, 0) / responses.length;
  
  console.log('--- Results ---');
  console.log(`Total Duration: ${duration}ms`);
  console.log(`Successful Requests: ${successes}/${CLIENT_COUNT}`);
  console.log(`Average Response Time: ${Math.round(avgTime)}ms`);
  console.log(`WebSocket Errors: ${errors.length}`);
  
  // Cleanup
  clients.forEach(ws => ws.close());
  
  if (successes === CLIENT_COUNT && avgTime < 2000) {
      console.log('✅ Load Test PASSED');
      process.exit(0);
  } else {
      console.log('❌ Load Test FAILED');
      process.exit(1);
  }
}

runLoadTest();
