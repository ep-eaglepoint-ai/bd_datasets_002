/**
 * Alert Logic Utilities
 * 
 * Requirement 5: Alert Logic: Trigger a visual state change only if the 
 * threshold violation is sustained across three consecutive data packets.
 */

/**
 * AlertTracker - Tracks consecutive threshold violations per sensor
 */
export class AlertTracker {
  constructor(requiredConsecutive = 3) {
    this.requiredConsecutive = requiredConsecutive;
    // Map of sensorId -> { consecutiveViolations, isAlertActive }
    this.sensorStates = new Map();
  }

  /**
   * Check if a value violates the threshold
   * @param {number} value 
   * @param {number} threshold 
   * @returns {boolean}
   */
  checkThreshold(value, threshold) {
    return value > threshold;
  }

  /**
   * Update the alert state for a sensor based on new reading
   * @param {string} sensorId 
   * @param {number} value 
   * @param {number} threshold 
   * @returns {{ isViolation: boolean, isAlertActive: boolean, consecutiveCount: number }}
   */
  update(sensorId, value, threshold) {
    if (!this.sensorStates.has(sensorId)) {
      this.sensorStates.set(sensorId, {
        consecutiveViolations: 0,
        isAlertActive: false
      });
    }

    const state = this.sensorStates.get(sensorId);
    const isViolation = this.checkThreshold(value, threshold);

    if (isViolation) {
      state.consecutiveViolations++;
      
      // Activate alert after required consecutive violations
      if (state.consecutiveViolations >= this.requiredConsecutive) {
        state.isAlertActive = true;
      }
    } else {
      // Reset on normal reading
      state.consecutiveViolations = 0;
      state.isAlertActive = false;
    }

    return {
      isViolation,
      isAlertActive: state.isAlertActive,
      consecutiveCount: state.consecutiveViolations
    };
  }

  /**
   * Check if alert is active for a sensor
   * @param {string} sensorId 
   * @returns {boolean}
   */
  isAlertActive(sensorId) {
    const state = this.sensorStates.get(sensorId);
    return state ? state.isAlertActive : false;
  }

  /**
   * Get the current consecutive violation count
   * @param {string} sensorId 
   * @returns {number}
   */
  getConsecutiveCount(sensorId) {
    const state = this.sensorStates.get(sensorId);
    return state ? state.consecutiveViolations : 0;
  }

  /**
   * Get all sensors with active alerts
   * @returns {Array<string>}
   */
  getActiveSensorAlerts() {
    const active = [];
    for (const [sensorId, state] of this.sensorStates) {
      if (state.isAlertActive) {
        active.push(sensorId);
      }
    }
    return active;
  }

  /**
   * Get count of active alerts
   * @returns {number}
   */
  getActiveAlertCount() {
    let count = 0;
    for (const state of this.sensorStates.values()) {
      if (state.isAlertActive) count++;
    }
    return count;
  }

  /**
   * Clear state for a sensor
   * @param {string} sensorId 
   */
  clearSensor(sensorId) {
    this.sensorStates.delete(sensorId);
  }

  /**
   * Clear all states
   */
  clearAll() {
    this.sensorStates.clear();
  }

  /**
   * Get state snapshot for debugging
   * @returns {Object}
   */
  getSnapshot() {
    const snapshot = {};
    for (const [sensorId, state] of this.sensorStates) {
      snapshot[sensorId] = { ...state };
    }
    return snapshot;
  }
}

// Export singleton instance for app-wide use
export const alertTracker = new AlertTracker(3);

// Export utility functions for direct use
export function checkThreshold(value, threshold) {
  return value > threshold;
}

export function updateAlertState(sensorId, value, threshold) {
  return alertTracker.update(sensorId, value, threshold);
}

export function isAlertActive(sensorId) {
  return alertTracker.isAlertActive(sensorId);
}
