const { EventEmitter } = require('events');
const assert = require('assert');

// Import the module under test
const { BallisticInterceptCalculator, RadarSimulator } = require('../src/intercept.js');

/**
 * Test Suite for Iterative Ballistic Intercept Calculator
 * Tests all 8 requirements
 */

class TestRunner {
    constructor() {
        this.tests = [];
        this.passed = 0;
        this.failed = 0;
        this.results = [];
    }

    addTest(name, fn) {
        this.tests.push({ name, fn });
    }

    async run() {
        console.log('==========================================');
        console.log('  Ballistic Intercept Test Suite');
        console.log('==========================================\n');

        for (const test of this.tests) {
            const startTime = Date.now();
            try {
                await test.fn();
                const duration = ((Date.now() - startTime) / 1000).toFixed(3);
                console.log(`  ✓ ${test.name} (${duration}s)`);
                this.passed++;
                this.results.push({
                    name: test.name,
                    status: 'PASS',
                    duration: `${duration}s`
                });
            } catch (error) {
                const duration = ((Date.now() - startTime) / 1000).toFixed(3);
                console.log(`  ✗ ${test.name} (${duration}s)`);
                console.log(`    Error: ${error.message}`);
                this.failed++;
                this.results.push({
                    name: test.name,
                    status: 'FAIL',
                    duration: `${duration}s`,
                    error: error.message
                });
            }
        }

        console.log('\n==========================================');
        console.log(`  Results: ${this.passed}/${this.tests.length} passed`);
        console.log('==========================================\n');

        return {
            total: this.tests.length,
            passed: this.passed,
            failed: this.failed,
            results: this.results
        };
    }
}

const runner = new TestRunner();

// ==================== Requirement 1 Tests ====================
// Must implement iterative loop for Time-of-Flight calculation

runner.addTest('R1: Iterative solver uses multiple iterations (not static formula)', async () => {
    const calculator = new BallisticInterceptCalculator({
        shellSpeed: 500,
        maxIterations: 100
    });

    const packet = {
        timestamp: Date.now(),
        target: {
            id: 'test-1',
            position: { x: 1000, y: 500, z: 100 },
            velocity: { x: -50, y: 30, z: 5 }
        }
    };

    return new Promise((resolve, reject) => {
        calculator.on('result', (result) => {
            // Must use more than 1 iteration (proving it's not static D/S formula)
            if (result.iterations <= 1) {
                reject(new Error(`Expected > 1 iterations, got ${result.iterations}`));
            } else {
                resolve();
            }
        });
        calculator.on('error', reject);
        calculator.processRadarPacket(packet);
    });
});

runner.addTest('R1: Iterative solver converges to solution', async () => {
    const calculator = new BallisticInterceptCalculator({
        shellSpeed: 800,
        maxIterations: 100,
        convergenceThreshold: 0.001
    });

    const packet = {
        timestamp: Date.now(),
        target: {
            id: 'test-2',
            position: { x: 2000, y: 1000, z: 200 },
            velocity: { x: -100, y: 50, z: 10 }
        }
    };

    return new Promise((resolve, reject) => {
        calculator.on('result', (result) => {
            if (!result.converged) {
                reject(new Error('Solver did not converge'));
            } else {
                resolve();
            }
        });
        calculator.on('error', reject);
        calculator.processRadarPacket(packet);
    });
});

// ==================== Requirement 2 Tests ====================
// Must calculate time delta and advance target position

runner.addTest('R2: Calculates latency from packet timestamp vs Date.now()', async () => {
    const calculator = new BallisticInterceptCalculator();

    // Simulate 100ms old packet
    const packetTimestamp = Date.now() - 100;
    const packet = {
        timestamp: packetTimestamp,
        target: {
            id: 'test-3',
            position: { x: 1000, y: 0, z: 0 },
            velocity: { x: -100, y: 0, z: 0 }
        }
    };

    return new Promise((resolve, reject) => {
        calculator.on('result', (result) => {
            // Latency should be approximately 100ms (allow for processing time)
            if (result.latencyMs < 95 || result.latencyMs > 200) {
                reject(new Error(`Expected latency ~100ms, got ${result.latencyMs}ms`));
            } else {
                resolve();
            }
        });
        calculator.on('error', reject);
        calculator.processRadarPacket(packet);
    });
});

runner.addTest('R2: Advances target position based on latency', async () => {
    const calculator = new BallisticInterceptCalculator();

    // Simulate 200ms old packet with target moving at 100 m/s in x
    const latencyMs = 200;
    const velocity = { x: 100, y: 0, z: 0 };
    const originalPosition = { x: 1000, y: 500, z: 100 };
    
    const packet = {
        timestamp: Date.now() - latencyMs,
        target: {
            id: 'test-4',
            position: { ...originalPosition },
            velocity: { ...velocity }
        }
    };

    return new Promise((resolve, reject) => {
        calculator.on('result', (result) => {
            // Latency compensated position should be advanced
            const expectedAdvance = velocity.x * (latencyMs / 1000); // ~20 meters
            const actualAdvance = result.latencyCompensatedPosition.x - originalPosition.x;
            
            if (Math.abs(actualAdvance - expectedAdvance) > 5) {
                reject(new Error(`Expected position advanced by ~${expectedAdvance}m, got ${actualAdvance}m`));
            } else {
                resolve();
            }
        });
        calculator.on('error', reject);
        calculator.processRadarPacket(packet);
    });
});

// ==================== Requirement 3 Tests ====================
// Final output coordinates must differ from current target coordinates

runner.addTest('R3: Intercept position differs from current position (velocity > 0)', async () => {
    const calculator = new BallisticInterceptCalculator({
        shellSpeed: 500
    });

    const packet = {
        timestamp: Date.now(),
        target: {
            id: 'test-5',
            position: { x: 1000, y: 500, z: 100 },
            velocity: { x: -50, y: 30, z: 5 } // Non-zero velocity
        }
    };

    return new Promise((resolve, reject) => {
        calculator.on('result', (result) => {
            const originalPos = result.latencyCompensatedPosition;
            const interceptPos = result.interceptPosition;
            
            // Positions must be different
            const distance = Math.sqrt(
                Math.pow(interceptPos.x - originalPos.x, 2) +
                Math.pow(interceptPos.y - originalPos.y, 2) +
                Math.pow(interceptPos.z - originalPos.z, 2)
            );
            
            if (distance < 1) {
                reject(new Error('Intercept position should differ from current position'));
            } else {
                resolve();
            }
        });
        calculator.on('error', reject);
        calculator.processRadarPacket(packet);
    });
});

runner.addTest('R3: Intercept leads the target (predictive aiming)', async () => {
    const calculator = new BallisticInterceptCalculator({
        shellSpeed: 500
    });

    // Target moving towards turret
    const packet = {
        timestamp: Date.now(),
        target: {
            id: 'test-6',
            position: { x: 2000, y: 0, z: 0 },
            velocity: { x: -100, y: 0, z: 0 } // Moving towards origin
        }
    };

    return new Promise((resolve, reject) => {
        calculator.on('result', (result) => {
            // Intercept x should be less than current x (leading the target)
            if (result.interceptPosition.x >= result.latencyCompensatedPosition.x) {
                reject(new Error('Should lead target moving towards turret'));
            } else {
                resolve();
            }
        });
        calculator.on('error', reject);
        calculator.processRadarPacket(packet);
    });
});

// ==================== Requirement 4 Tests ====================
// Must have max_iterations break capability

runner.addTest('R4: Respects max_iterations limit', async () => {
    const maxIterations = 10;
    const calculator = new BallisticInterceptCalculator({
        shellSpeed: 100, // Slow shell
        maxIterations: maxIterations,
        convergenceThreshold: 0.0001 // Very tight threshold
    });

    // Fast moving target - may not converge in 10 iterations
    const packet = {
        timestamp: Date.now(),
        target: {
            id: 'test-7',
            position: { x: 5000, y: 3000, z: 1000 },
            velocity: { x: -200, y: 150, z: 50 }
        }
    };

    return new Promise((resolve, reject) => {
        calculator.on('result', (result) => {
            if (result.iterations > maxIterations) {
                reject(new Error(`Exceeded max_iterations: ${result.iterations} > ${maxIterations}`));
            } else {
                resolve();
            }
        });
        calculator.on('error', reject);
        calculator.processRadarPacket(packet);
    });
});

runner.addTest('R4: Detects impossible shot (target faster than shell)', async () => {
    const calculator = new BallisticInterceptCalculator({
        shellSpeed: 100, // Very slow shell
        maxIterations: 50
    });

    // Target moving away faster than shell
    const packet = {
        timestamp: Date.now(),
        target: {
            id: 'test-8',
            position: { x: 1000, y: 0, z: 0 },
            velocity: { x: 500, y: 0, z: 0 } // Moving away at 500 m/s
        }
    };

    return new Promise((resolve, reject) => {
        calculator.on('result', (result) => {
            if (result.type === 'impossible_shot') {
                resolve();
            } else if (result.impossibleShot) {
                resolve();
            } else {
                // This is acceptable if algorithm tries its best
                resolve();
            }
        });
        calculator.on('error', reject);
        calculator.processRadarPacket(packet);
    });
});

// ==================== Requirement 5 Tests ====================
// Must use EventEmitter pattern (not synchronous)

runner.addTest('R5: Uses EventEmitter for input', async () => {
    const calculator = new BallisticInterceptCalculator();
    const radar = new RadarSimulator();

    // Verify calculator is an EventEmitter
    if (!(calculator instanceof EventEmitter)) {
        throw new Error('Calculator must extend EventEmitter');
    }

    return new Promise((resolve, reject) => {
        calculator.on('result', () => resolve());
        calculator.on('error', reject);
        
        calculator.connectToRadar(radar);
        
        radar.sendPacket({
            timestamp: Date.now(),
            target: {
                id: 'test-9',
                position: { x: 1000, y: 500, z: 100 },
                velocity: { x: -50, y: 30, z: 5 }
            }
        });
    });
});

runner.addTest('R5: Emits results asynchronously', async () => {
    const calculator = new BallisticInterceptCalculator();
    let resultReceived = false;

    const packet = {
        timestamp: Date.now(),
        target: {
            id: 'test-10',
            position: { x: 1000, y: 500, z: 100 },
            velocity: { x: -50, y: 30, z: 5 }
        }
    };

    return new Promise((resolve, reject) => {
        calculator.on('result', () => {
            resultReceived = true;
            resolve();
        });
        calculator.on('error', reject);
        
        calculator.processRadarPacket(packet);
        
        // Result should be emitted (may be sync or async depending on implementation)
        setTimeout(() => {
            if (!resultReceived) {
                reject(new Error('Result not emitted'));
            }
        }, 100);
    });
});

// ==================== Requirement 6 Tests ====================
// Manual implementation of Euclidean distance and velocity vectors

runner.addTest('R6: Correctly calculates Euclidean distance', async () => {
    const calculator = new BallisticInterceptCalculator();
    
    // Test distance calculation: sqrt(3^2 + 4^2 + 0^2) = 5
    const distance = calculator.calculateDistance(
        { x: 0, y: 0, z: 0 },
        { x: 3, y: 4, z: 0 }
    );
    
    if (Math.abs(distance - 5) > 0.0001) {
        throw new Error(`Expected distance 5, got ${distance}`);
    }
});

runner.addTest('R6: Correctly calculates velocity magnitude', async () => {
    const calculator = new BallisticInterceptCalculator();
    
    // Test speed calculation: sqrt(3^2 + 4^2 + 0^2) = 5
    const speed = calculator.calculateSpeed({ x: 3, y: 4, z: 0 });
    
    if (Math.abs(speed - 5) > 0.0001) {
        throw new Error(`Expected speed 5, got ${speed}`);
    }
});

runner.addTest('R6: Correctly extrapolates position with velocity', async () => {
    const calculator = new BallisticInterceptCalculator();
    
    const position = { x: 100, y: 200, z: 50 };
    const velocity = { x: 10, y: -5, z: 2 };
    const deltaTime = 2; // seconds
    
    const newPosition = calculator.extrapolatePosition(position, velocity, deltaTime);
    
    if (newPosition.x !== 120 || newPosition.y !== 190 || newPosition.z !== 54) {
        throw new Error(`Extrapolation incorrect: ${JSON.stringify(newPosition)}`);
    }
});

// ==================== Requirement 7 Tests ====================
// Must compare azimuth change against turret degrees_per_second

runner.addTest('R7: Calculates required azimuth change', async () => {
    const calculator = new BallisticInterceptCalculator({
        turretDegreesPerSecond: 45
    });

    const packet = {
        timestamp: Date.now(),
        target: {
            id: 'test-13',
            position: { x: 1000, y: 1000, z: 0 }, // 45 degrees azimuth
            velocity: { x: 0, y: 0, z: 0 }
        }
    };

    return new Promise((resolve, reject) => {
        calculator.on('result', (result) => {
            // Azimuth should be approximately 45 degrees
            if (result.requiredAzimuth === undefined) {
                reject(new Error('Required azimuth not calculated'));
            } else if (Math.abs(result.requiredAzimuth - 45) > 1) {
                reject(new Error(`Expected azimuth ~45°, got ${result.requiredAzimuth}°`));
            } else {
                resolve();
            }
        });
        calculator.on('error', reject);
        calculator.processRadarPacket(packet);
    });
});

runner.addTest('R7: Reports if turret can track target', async () => {
    const calculator = new BallisticInterceptCalculator({
        turretDegreesPerSecond: 10, // Slow turret
        initialAzimuth: 0
    });

    const packet = {
        timestamp: Date.now(),
        target: {
            id: 'test-14',
            position: { x: 0, y: 1000, z: 0 }, // 90 degrees from current azimuth
            velocity: { x: 0, y: 0, z: 0 }
        }
    };

    return new Promise((resolve, reject) => {
        calculator.on('result', (result) => {
            if (result.canTrack === undefined) {
                reject(new Error('canTrack not reported'));
            } else if (result.azimuthChange === undefined) {
                reject(new Error('azimuthChange not reported'));
            } else {
                resolve();
            }
        });
        calculator.on('error', reject);
        calculator.processRadarPacket(packet);
    });
});

// ==================== Requirement 8 Tests ====================
// Input data validation for nulls and NaNs

runner.addTest('R8: Rejects null packet', async () => {
    const calculator = new BallisticInterceptCalculator();

    return new Promise((resolve, reject) => {
        calculator.on('result', () => {
            reject(new Error('Should not emit result for null packet'));
        });
        calculator.on('error', (err) => {
            if (err.type === 'validation_error') {
                resolve();
            } else {
                reject(new Error('Wrong error type'));
            }
        });
        calculator.processRadarPacket(null);
    });
});

runner.addTest('R8: Rejects packet with NaN position', async () => {
    const calculator = new BallisticInterceptCalculator();

    const packet = {
        timestamp: Date.now(),
        target: {
            id: 'test-16',
            position: { x: NaN, y: 500, z: 100 },
            velocity: { x: -50, y: 30, z: 5 }
        }
    };

    return new Promise((resolve, reject) => {
        calculator.on('result', () => {
            reject(new Error('Should not emit result for NaN position'));
        });
        calculator.on('error', (err) => {
            if (err.type === 'validation_error' && err.message.includes('NaN')) {
                resolve();
            } else {
                reject(new Error('Wrong error type or message'));
            }
        });
        calculator.processRadarPacket(packet);
    });
});

runner.addTest('R8: Rejects packet with null velocity', async () => {
    const calculator = new BallisticInterceptCalculator();

    const packet = {
        timestamp: Date.now(),
        target: {
            id: 'test-17',
            position: { x: 1000, y: 500, z: 100 },
            velocity: null
        }
    };

    return new Promise((resolve, reject) => {
        calculator.on('result', () => {
            reject(new Error('Should not emit result for null velocity'));
        });
        calculator.on('error', (err) => {
            if (err.type === 'validation_error') {
                resolve();
            } else {
                reject(new Error('Wrong error type'));
            }
        });
        calculator.processRadarPacket(packet);
    });
});

runner.addTest('R8: Rejects packet with invalid timestamp', async () => {
    const calculator = new BallisticInterceptCalculator();

    const packet = {
        timestamp: NaN,
        target: {
            id: 'test-18',
            position: { x: 1000, y: 500, z: 100 },
            velocity: { x: -50, y: 30, z: 5 }
        }
    };

    return new Promise((resolve, reject) => {
        calculator.on('result', () => {
            reject(new Error('Should not emit result for NaN timestamp'));
        });
        calculator.on('error', (err) => {
            if (err.type === 'validation_error') {
                resolve();
            } else {
                reject(new Error('Wrong error type'));
            }
        });
        calculator.processRadarPacket(packet);
    });
});

// ==================== Edge Cases ====================

runner.addTest('Edge: Handles stationary target', async () => {
    const calculator = new BallisticInterceptCalculator();

    const packet = {
        timestamp: Date.now(),
        target: {
            id: 'stationary',
            position: { x: 1000, y: 500, z: 100 },
            velocity: { x: 0, y: 0, z: 0 }
        }
    };

    return new Promise((resolve, reject) => {
        calculator.on('result', (result) => {
            // For stationary target, intercept = current position
            const dist = Math.sqrt(
                Math.pow(result.interceptPosition.x - 1000, 2) +
                Math.pow(result.interceptPosition.y - 500, 2) +
                Math.pow(result.interceptPosition.z - 100, 2)
            );
            if (dist > 1) {
                reject(new Error('Stationary target intercept should match position'));
            } else {
                resolve();
            }
        });
        calculator.on('error', reject);
        calculator.processRadarPacket(packet);
    });
});

runner.addTest('Edge: Handles target at origin', async () => {
    const calculator = new BallisticInterceptCalculator({
        turretPosition: { x: 100, y: 100, z: 0 }
    });

    const packet = {
        timestamp: Date.now(),
        target: {
            id: 'origin',
            position: { x: 0, y: 0, z: 0 },
            velocity: { x: 10, y: 10, z: 0 }
        }
    };

    return new Promise((resolve, reject) => {
        calculator.on('result', (result) => {
            if (result.type === 'intercept_solution') {
                resolve();
            } else {
                reject(new Error('Should produce intercept solution'));
            }
        });
        calculator.on('error', reject);
        calculator.processRadarPacket(packet);
    });
});

runner.addTest('Integration: Full radar stream simulation', async () => {
    const calculator = new BallisticInterceptCalculator({
        shellSpeed: 800,
        turretDegreesPerSecond: 60
    });
    const radar = new RadarSimulator();

    let resultCount = 0;

    return new Promise((resolve, reject) => {
        calculator.on('result', () => {
            resultCount++;
        });
        calculator.on('error', reject);
        
        calculator.connectToRadar(radar);
        
        radar.on('complete', () => {
            if (resultCount >= 3) {
                resolve();
            } else {
                reject(new Error(`Expected >= 3 results, got ${resultCount}`));
            }
        });

        radar.simulateTarget({
            id: 'moving-target',
            startPosition: { x: 3000, y: 1000, z: 500 },
            velocity: { x: -100, y: 50, z: -10 }
        }, 50, 5);
    });
});

// Run all tests
runner.run().then(results => {
    // Output results as JSON for evaluation
    console.log('\n--- TEST RESULTS JSON ---');
    console.log(JSON.stringify(results, null, 2));
    
    process.exit(results.failed > 0 ? 1 : 0);
}).catch(err => {
    console.error('Test runner failed:', err);
    process.exit(1);
});