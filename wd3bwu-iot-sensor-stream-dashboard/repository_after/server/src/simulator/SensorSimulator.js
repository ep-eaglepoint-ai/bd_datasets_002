/**
 * SensorSimulator - Generates realistic sensor data for development/testing
 * 
 * Simulates low-power IoT sensors reporting vibration and temperature data.
 * Occasionally generates threshold violations for alert testing.
 */

class SensorSimulator {
  /**
   * @param {object} options
   * @param {number} options.sensorCount - Number of sensors to simulate (default 50)
   * @param {number} options.updateIntervalMs - Update interval in ms (default 100)
   * @param {object} options.thresholds - Threshold values for alerts
   */
  constructor(options = {}) {
    this.sensorCount = options.sensorCount || 50;
    this.updateIntervalMs = options.updateIntervalMs || 100;
    this.thresholds = options.thresholds || {
      vibration: 80,    // mm/s
      temperature: 85   // °C
    };
    
    // Sensor state
    this.sensors = new Map();
    this.timer = null;
    this.onData = null;
    
    // Initialize sensors
    this._initializeSensors();
  }

  /**
   * Initialize sensor state
   * @private
   */
  _initializeSensors() {
    for (let i = 0; i < this.sensorCount; i++) {
      const sensorId = `sensor-${String(i).padStart(3, '0')}`;
      this.sensors.set(sensorId, {
        id: sensorId,
        type: i % 2 === 0 ? 'vibration' : 'temperature',
        baseValue: i % 2 === 0 ? 30 : 45,  // Base vibration or temperature
        drift: 0,
        anomalyCounter: 0
      });
    }
  }

  /**
   * Get all sensor IDs
   * @returns {Array<string>}
   */
  getSensorIds() {
    return Array.from(this.sensors.keys());
  }

  /**
   * Get sensor metadata
   * @param {string} sensorId 
   * @returns {object|null}
   */
  getSensorInfo(sensorId) {
    const sensor = this.sensors.get(sensorId);
    if (!sensor) return null;
    
    return {
      id: sensor.id,
      type: sensor.type,
      threshold: this.thresholds[sensor.type]
    };
  }

  /**
   * Generate a single data point for a sensor
   * @param {string} sensorId 
   * @returns {object}
   */
  generateDataPoint(sensorId) {
    const sensor = this.sensors.get(sensorId);
    if (!sensor) return null;
    
    const timestamp = Date.now();
    
    // Update drift (slow random walk)
    sensor.drift += (Math.random() - 0.5) * 2;
    sensor.drift = Math.max(-10, Math.min(10, sensor.drift));
    
    // Calculate base value with drift
    let value = sensor.baseValue + sensor.drift;
    
    // Add noise
    value += (Math.random() - 0.5) * 5;
    
    // Occasionally generate anomalies (threshold violations)
    // This creates sustained violations for alert testing
    const threshold = this.thresholds[sensor.type];
    
    // 5% chance to start an anomaly sequence
    if (sensor.anomalyCounter === 0 && Math.random() < 0.05) {
      sensor.anomalyCounter = Math.floor(Math.random() * 6) + 3; // 3-8 readings
    }
    
    // During anomaly, push value above threshold
    if (sensor.anomalyCounter > 0) {
      value = threshold + Math.random() * 20 + 5;
      sensor.anomalyCounter--;
    }
    
    // Ensure non-negative
    value = Math.max(0, value);
    
    return {
      timestamp,
      value: Math.round(value * 100) / 100,
      type: sensor.type
    };
  }

  /**
   * Generate data for all sensors
   * @returns {Object}
   */
  generateAllData() {
    const data = {};
    for (const sensorId of this.sensors.keys()) {
      data[sensorId] = this.generateDataPoint(sensorId);
    }
    return data;
  }

  /**
   * Start generating data at configured interval
   * @param {Function} callback - Called with (sensorId, data) for each update
   */
  start(callback) {
    this.onData = callback;
    
    this.timer = setInterval(() => {
      const allData = this.generateAllData();
      
      if (this.onData) {
        for (const [sensorId, data] of Object.entries(allData)) {
          this.onData(sensorId, data);
        }
      }
    }, this.updateIntervalMs);
    
    console.log(`Sensor simulator started: ${this.sensorCount} sensors at ${1000/this.updateIntervalMs}Hz`);
  }

  /**
   * Stop generating data
   */
  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.onData = null;
    console.log('Sensor simulator stopped');
  }

  /**
   * Check if simulation is running
   * @returns {boolean}
   */
  isRunning() {
    return this.timer !== null;
  }

  /**
   * Force a threshold violation for a specific sensor (for testing)
   * @param {string} sensorId 
   * @param {number} readings - Number of consecutive violations (default 5)
   */
  triggerAnomaly(sensorId, readings = 5) {
    const sensor = this.sensors.get(sensorId);
    if (sensor) {
      sensor.anomalyCounter = readings;
    }
  }

  /**
   * Get current sensor states
   * @returns {Array}
   */
  getSensorStates() {
    return Array.from(this.sensors.values()).map(s => ({
      id: s.id,
      type: s.type,
      threshold: this.thresholds[s.type],
      hasAnomaly: s.anomalyCounter > 0
    }));
  }
}

module.exports = { SensorSimulator };
