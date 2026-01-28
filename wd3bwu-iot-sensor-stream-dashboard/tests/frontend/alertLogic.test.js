/**
 * Alert Logic Tests
 * 
 * Requirement 5: Alert Logic: Trigger a visual state change only if the 
 * threshold violation is sustained across three consecutive data packets.
 */

import { describe, test, expect, beforeEach } from 'vitest';
import { AlertTracker, checkThreshold } from '../../repository_after/client/src/utils/alertLogic.js';

describe('AlertTracker', () => {
  let tracker;

  beforeEach(() => {
    tracker = new AlertTracker(3); // 3 consecutive violations required
  });

  describe('Threshold Checking', () => {
    test('should detect threshold violation', () => {
      expect(checkThreshold(85, 80)).toBe(true);
      expect(checkThreshold(80, 80)).toBe(false);
      expect(checkThreshold(75, 80)).toBe(false);
    });

    test('should handle edge cases', () => {
      expect(checkThreshold(80.001, 80)).toBe(true);
      expect(checkThreshold(79.999, 80)).toBe(false);
      expect(checkThreshold(0, 80)).toBe(false);
      expect(checkThreshold(-10, 80)).toBe(false);
    });
  });

  describe('Consecutive Violation Tracking - Requirement 5', () => {
    test('should not trigger alert on single violation', () => {
      const result = tracker.update('sensor-001', 90, 80);
      
      expect(result.isViolation).toBe(true);
      expect(result.isAlertActive).toBe(false);
      expect(result.consecutiveCount).toBe(1);
    });

    test('should not trigger alert on two violations', () => {
      tracker.update('sensor-001', 90, 80);
      const result = tracker.update('sensor-001', 91, 80);
      
      expect(result.isViolation).toBe(true);
      expect(result.isAlertActive).toBe(false);
      expect(result.consecutiveCount).toBe(2);
    });

    test('should trigger alert on exactly three consecutive violations', () => {
      tracker.update('sensor-001', 90, 80);
      tracker.update('sensor-001', 91, 80);
      const result = tracker.update('sensor-001', 92, 80);
      
      expect(result.isViolation).toBe(true);
      expect(result.isAlertActive).toBe(true);
      expect(result.consecutiveCount).toBe(3);
    });

    test('should maintain alert after more than three violations', () => {
      for (let i = 0; i < 5; i++) {
        tracker.update('sensor-001', 90 + i, 80);
      }
      
      expect(tracker.isAlertActive('sensor-001')).toBe(true);
      expect(tracker.getConsecutiveCount('sensor-001')).toBe(5);
    });

    test('should reset count on normal reading', () => {
      // Trigger almost-alert (2 violations)
      tracker.update('sensor-001', 90, 80);
      tracker.update('sensor-001', 91, 80);
      
      // Normal reading resets
      const result = tracker.update('sensor-001', 75, 80);
      
      expect(result.isViolation).toBe(false);
      expect(result.isAlertActive).toBe(false);
      expect(result.consecutiveCount).toBe(0);
    });

    test('should deactivate alert on normal reading after alert', () => {
      // Trigger alert
      tracker.update('sensor-001', 90, 80);
      tracker.update('sensor-001', 91, 80);
      tracker.update('sensor-001', 92, 80);
      
      expect(tracker.isAlertActive('sensor-001')).toBe(true);
      
      // Normal reading deactivates
      const result = tracker.update('sensor-001', 75, 80);
      
      expect(result.isAlertActive).toBe(false);
      expect(tracker.isAlertActive('sensor-001')).toBe(false);
    });

    test('should handle interrupted violation sequence', () => {
      tracker.update('sensor-001', 90, 80); // violation 1
      tracker.update('sensor-001', 91, 80); // violation 2
      tracker.update('sensor-001', 75, 80); // normal - resets
      tracker.update('sensor-001', 92, 80); // violation 1 again
      tracker.update('sensor-001', 93, 80); // violation 2
      
      expect(tracker.isAlertActive('sensor-001')).toBe(false);
      expect(tracker.getConsecutiveCount('sensor-001')).toBe(2);
    });
  });

  describe('Multiple Sensors', () => {
    test('should track sensors independently', () => {
      // Trigger alert on sensor-001
      tracker.update('sensor-001', 90, 80);
      tracker.update('sensor-001', 91, 80);
      tracker.update('sensor-001', 92, 80);
      
      // Only one violation on sensor-002
      tracker.update('sensor-002', 90, 80);
      
      expect(tracker.isAlertActive('sensor-001')).toBe(true);
      expect(tracker.isAlertActive('sensor-002')).toBe(false);
    });

    test('should return all active sensor alerts', () => {
      // Alert on two sensors
      for (let i = 0; i < 3; i++) {
        tracker.update('sensor-001', 90, 80);
        tracker.update('sensor-002', 90, 80);
      }
      
      // No alert on third sensor
      tracker.update('sensor-003', 90, 80);
      
      const active = tracker.getActiveSensorAlerts();
      expect(active).toContain('sensor-001');
      expect(active).toContain('sensor-002');
      expect(active).not.toContain('sensor-003');
    });

    test('should count active alerts correctly', () => {
      // Alert on three sensors
      for (let s = 1; s <= 3; s++) {
        for (let i = 0; i < 3; i++) {
          tracker.update(`sensor-00${s}`, 90, 80);
        }
      }
      
      expect(tracker.getActiveAlertCount()).toBe(3);
    });
  });

  describe('Different Thresholds', () => {
    test('should work with different threshold values', () => {
      const vibrationThreshold = 80;
      const temperatureThreshold = 85;
      
      // Violates vibration threshold
      for (let i = 0; i < 3; i++) {
        tracker.update('vibration-001', 82, vibrationThreshold);
      }
      
      // Does not violate temperature threshold
      for (let i = 0; i < 3; i++) {
        tracker.update('temp-001', 82, temperatureThreshold);
      }
      
      expect(tracker.isAlertActive('vibration-001')).toBe(true);
      expect(tracker.isAlertActive('temp-001')).toBe(false);
    });
  });

  describe('Configurable Consecutive Count', () => {
    test('should work with different required consecutive counts', () => {
      const strictTracker = new AlertTracker(5); // 5 consecutive required
      
      // 4 violations - not enough
      for (let i = 0; i < 4; i++) {
        strictTracker.update('sensor-001', 90, 80);
      }
      expect(strictTracker.isAlertActive('sensor-001')).toBe(false);
      
      // 5th violation triggers
      strictTracker.update('sensor-001', 90, 80);
      expect(strictTracker.isAlertActive('sensor-001')).toBe(true);
    });

    test('should work with single violation required', () => {
      const sensitiveTracker = new AlertTracker(1);
      
      const result = sensitiveTracker.update('sensor-001', 90, 80);
      expect(result.isAlertActive).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    test('should handle untracked sensor queries', () => {
      expect(tracker.isAlertActive('non-existent')).toBe(false);
      expect(tracker.getConsecutiveCount('non-existent')).toBe(0);
    });

    test('should clear sensor state', () => {
      for (let i = 0; i < 3; i++) {
        tracker.update('sensor-001', 90, 80);
      }
      
      tracker.clearSensor('sensor-001');
      
      expect(tracker.isAlertActive('sensor-001')).toBe(false);
      expect(tracker.getConsecutiveCount('sensor-001')).toBe(0);
    });

    test('should clear all state', () => {
      for (let i = 0; i < 3; i++) {
        tracker.update('sensor-001', 90, 80);
        tracker.update('sensor-002', 90, 80);
      }
      
      tracker.clearAll();
      
      expect(tracker.getActiveAlertCount()).toBe(0);
    });

    test('should provide state snapshot for debugging', () => {
      tracker.update('sensor-001', 90, 80);
      tracker.update('sensor-001', 91, 80);
      
      const snapshot = tracker.getSnapshot();
      expect(snapshot['sensor-001']).toEqual({
        consecutiveViolations: 2,
        isAlertActive: false
      });
    });

    test('should handle threshold value of zero', () => {
      expect(checkThreshold(0, 0)).toBe(false);
      expect(checkThreshold(0.1, 0)).toBe(true);
      expect(checkThreshold(-0.1, 0)).toBe(false);
    });

    test('should handle negative values', () => {
      // Temperature sensor could have negative readings
      expect(checkThreshold(-5, -10)).toBe(true);  // -5 > -10
      expect(checkThreshold(-15, -10)).toBe(false); // -15 < -10
    });
  });
});
