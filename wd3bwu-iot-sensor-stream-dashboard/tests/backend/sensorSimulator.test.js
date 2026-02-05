/**
 * Sensor Simulator Tests
 */

const { SensorSimulator } = require('../../repository_after/server/src/simulator/SensorSimulator');

describe('SensorSimulator', () => {
  let simulator;

  beforeEach(() => {
    simulator = new SensorSimulator({
      sensorCount: 10,
      updateIntervalMs: 100,
      thresholds: {
        vibration: 80,
        temperature: 85
      }
    });
  });

  afterEach(() => {
    simulator.stop();
  });

  describe('Initialization', () => {
    test('should create specified number of sensors', () => {
      expect(simulator.getSensorIds()).toHaveLength(10);
    });

    test('should alternate sensor types', () => {
      const states = simulator.getSensorStates();
      
      // Even indices should be vibration
      expect(states[0].type).toBe('vibration');
      expect(states[2].type).toBe('vibration');
      
      // Odd indices should be temperature
      expect(states[1].type).toBe('temperature');
      expect(states[3].type).toBe('temperature');
    });

    test('should assign correct thresholds', () => {
      const states = simulator.getSensorStates();
      
      const vibrationSensor = states.find(s => s.type === 'vibration');
      const tempSensor = states.find(s => s.type === 'temperature');
      
      expect(vibrationSensor.threshold).toBe(80);
      expect(tempSensor.threshold).toBe(85);
    });
  });

  describe('Data Generation', () => {
    test('should generate data for all sensors', () => {
      const data = simulator.generateAllData();
      
      expect(Object.keys(data)).toHaveLength(10);
    });

    test('should generate data with required fields', () => {
      const point = simulator.generateDataPoint('sensor-000');
      
      expect(point).toHaveProperty('timestamp');
      expect(point).toHaveProperty('value');
      expect(point).toHaveProperty('type');
      expect(typeof point.timestamp).toBe('number');
      expect(typeof point.value).toBe('number');
    });

    test('should return null for invalid sensor', () => {
      expect(simulator.generateDataPoint('non-existent')).toBeNull();
    });

    test('should generate non-negative values', () => {
      for (let i = 0; i < 100; i++) {
        const point = simulator.generateDataPoint('sensor-000');
        expect(point.value).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe('Anomaly Triggering', () => {
    test('should trigger anomaly for specified readings', () => {
      simulator.triggerAnomaly('sensor-000', 3);
      
      const states = simulator.getSensorStates();
      const sensor = states.find(s => s.id === 'sensor-000');
      expect(sensor.hasAnomaly).toBe(true);
    });

    test('should generate above-threshold values during anomaly', () => {
      simulator.triggerAnomaly('sensor-000', 5);
      
      const threshold = 80; // vibration threshold
      for (let i = 0; i < 5; i++) {
        const point = simulator.generateDataPoint('sensor-000');
        expect(point.value).toBeGreaterThan(threshold);
      }
    });
  });

  describe('Sensor Info', () => {
    test('should return sensor info', () => {
      const info = simulator.getSensorInfo('sensor-000');
      
      expect(info).toEqual({
        id: 'sensor-000',
        type: 'vibration',
        threshold: 80
      });
    });

    test('should return null for invalid sensor', () => {
      expect(simulator.getSensorInfo('non-existent')).toBeNull();
    });
  });

  describe('Running State', () => {
    test('should report running state correctly', () => {
      expect(simulator.isRunning()).toBe(false);
      
      simulator.start(() => {});
      expect(simulator.isRunning()).toBe(true);
      
      simulator.stop();
      expect(simulator.isRunning()).toBe(false);
    });

    test('should call callback with data when running', (done) => {
      const received = [];
      
      simulator.start((sensorId, data) => {
        received.push({ sensorId, data });
        
        if (received.length >= 10) {
          simulator.stop();
          expect(received.length).toBeGreaterThanOrEqual(10);
          done();
        }
      });
    }, 1000);
  });
});
