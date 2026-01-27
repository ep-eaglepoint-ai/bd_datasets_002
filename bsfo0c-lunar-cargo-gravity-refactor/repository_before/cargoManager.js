// filename: cargoManager.js

// Low-level rover telemetry provides gravity and dimensions
import { roverConfig } from '../hardware/specs'; // roverConfig.maxCapacityWeight, roverConfig.width, roverConfig.height

/**
 * LEGACY LOGIC: Greedy volume-first packing.
 * Items: Array<{ id: string, weight: number, volume: number }>
 */
export function packRover(items) {
    let currentWeight = 0;
    const manifested = [];

    // BRITTLE: Simply takes items in order until max weight is hit.
    // Does not account for height or balance.
    for (const item of items) {
        if (currentWeight + item.weight <= roverConfig.maxCapacityWeight) {
            manifested.push(item);
            currentWeight += item.weight;
        }
    }

    return {
        totalWeight: currentWeight,
        items: manifested,
        placement: manifested.map((item, index) => ({
            id: item.id,
            x: index, // Simplified: Just puts them in a row
            y: 0
        }))
    };
}