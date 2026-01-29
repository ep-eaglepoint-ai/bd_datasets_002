
// CircuitBreaker.js

/**
 * Manages remote service call resiliency.
 * 
 * State Definitions:
 * - CLOSED: Requests pass through. Failures increment a counter.
 * - OPEN: Requests fail immediately. Stays open for 'resetTimeout'.
 * - HALF_OPEN: Allows a limited number of 'probe' requests to test service health.
 */

export class CircuitBreaker {
  constructor(options = {}) {
    this.failureThreshold = options.failureThreshold || 3;
    this.resetTimeout = options.resetTimeout || 5000; // ms
    this.state = 'CLOSED';
    this.failures = 0;
    this.lastFailureTime = null;
  }

  async execute(action) {
    this.updateState();

    if (this.state === 'OPEN') {
      throw new Error('CIRCUIT_OPEN');
    }

    try {
      const result = await action();
      if (this.state === 'HALF_OPEN') {
        this.reset();
      }
      return result;
    } catch (error) {
      this.handleFailure();
      throw error;
    }
  }

  updateState() {
    if (this.state === 'OPEN' && Date.now() - this.lastFailureTime > this.resetTimeout) {
      this.state = 'HALF_OPEN';
    }
  }

  handleFailure() {
    this.failures++;
    this.lastFailureTime = Date.now();

    if (this.state === 'CLOSED' && this.failures >= this.failureThreshold) {
      this.state = 'OPEN';
    } else if (this.state === 'HALF_OPEN') {
      this.state = 'OPEN';
    }
  }

  reset() {
    this.state = 'CLOSED';
    this.failures = 0;
    this.lastFailureTime = null;
  }
}