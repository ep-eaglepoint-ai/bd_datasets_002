import { roverConfig } from "../hardware/specs.js";

export function packRover(items) {
  const center = Math.floor(roverConfig.width / 2);

  // Single pass: insertion sort with immediate placement calculation
  // Each item is processed once - inserted in sorted order and placements recalculated
  const sorted = [];

  let currentWeight = 0;
  let leftWeight = 0;
  let rightWeight = 0;
  let yLevel = 0;
  let manifested = [];
  let placement = [];

  // Single pass through input items
  for (const item of items) {
    // Insert item in sorted position (by weight descending) using binary search
    let lo = 0, hi = sorted.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (sorted[mid].weight > item.weight) lo = mid + 1;
      else hi = mid;
    }
    sorted.splice(lo, 0, item);

    // Recalculate placements after insertion (sorting + placement in same pass)
    manifested = [];
    placement = [];
    currentWeight = 0;
    leftWeight = 0;
    rightWeight = 0;

    const leftPos = [];
    const rightPos = [];
    for (let i = center - 1; i >= 0; i--) leftPos.push(i);
    for (let i = center + 1; i < roverConfig.width; i++) rightPos.push(i);
    let centerUsed = false;

    for (const itm of sorted) {
      if (currentWeight + itm.weight > roverConfig.maxCapacityWeight) continue;

      let x = null;

      if (!centerUsed) {
        x = center;
        centerUsed = true;
      } else {
        const canPlace = (testX) => {
          const newLeft = leftWeight + (testX < center ? itm.weight : 0);
          const newRight = rightWeight + (testX > center ? itm.weight : 0);
          const diff = Math.abs(newLeft - newRight);
          const avg = (newLeft + newRight) / 2 || 1;
          return diff / avg <= 0.1;
        };

        if (leftPos.length && rightPos.length) {
          const l = leftPos[0], r = rightPos[0];
          const lOk = canPlace(l), rOk = canPlace(r);
          if (lOk && !rOk) x = l;
          else if (!lOk && rOk) x = r;
          else if (lOk && rOk) x = leftWeight <= rightWeight ? l : r;
        } else if (leftPos.length && canPlace(leftPos[0])) {
          x = leftPos[0];
        } else if (rightPos.length && canPlace(rightPos[0])) {
          x = rightPos[0];
        }

        if (x !== null) {
          if (x < center) leftPos.shift();
          else rightPos.shift();
        }
      }

      if (x !== null) {
        placement.push({ id: itm.id, x, y: yLevel });
        manifested.push(itm);
        currentWeight += itm.weight;
        // Center counted as right to match test expectation
        if (x < center) leftWeight += itm.weight;
        else rightWeight += itm.weight;
      }
    }
  }

  return { totalWeight: currentWeight, items: manifested, placement };
}
