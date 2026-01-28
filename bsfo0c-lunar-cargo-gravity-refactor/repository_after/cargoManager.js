import { roverConfig } from "../hardware/specs.js";

export function packRover(items) {
  let currentWeight = 0;
  const manifested = [];
  const placement = [];

  const sorted = [...items].sort((a, b) => b.weight - a.weight);
  const center = Math.floor(roverConfig.width / 2);

  const leftPositions = [];
  const rightPositions = [];
  for (let i = center - 1; i >= 0; i--) leftPositions.push(i);
  for (let i = center + 1; i < roverConfig.width; i++) rightPositions.push(i);

  let leftWeight = 0;
  let rightWeight = 0;
  let yLevel = 0;

  const pushPlacement = (item, x) => {
    placement.push({ id: item.id, x, y: yLevel });
    manifested.push(item);
    currentWeight += item.weight;
    if (x < roverConfig.width / 2) leftWeight += item.weight;
    else rightWeight += item.weight;
  };

  // place heaviest at center
  if (sorted.length) {
    const heavy = sorted.shift();
    if (currentWeight + heavy.weight <= roverConfig.maxCapacityWeight) {
      pushPlacement(heavy, center);
    }
  }

  for (const item of sorted) {
    if (currentWeight + item.weight > roverConfig.maxCapacityWeight) continue;

    const tryPlace = (x) => {
      const newLeft = leftWeight + (x < roverConfig.width / 2 ? item.weight : 0);
      const newRight = rightWeight + (x > roverConfig.width / 2 ? item.weight : 0);
      const diff = Math.abs(newLeft - newRight);
      const avg = (newLeft + newRight) / 2 || 1;
      return { ok: diff / avg <= 0.1, newLeft, newRight };
    };

    let x = null;
    if (leftPositions.length && rightPositions.length) {
      const left = leftPositions[0];
      const right = rightPositions[0];
      const l = tryPlace(left);
      const r = tryPlace(right);
      if (l.ok || r.ok) {
        x = l.ok && !r.ok ? left : (!l.ok && r.ok ? right : (leftWeight <= rightWeight ? left : right));
      } else {
        // skip item if cannot maintain balance
        continue;
      }
    } else if (leftPositions.length) {
      const left = leftPositions[0];
      if (tryPlace(left).ok) x = left; else continue;
    } else if (rightPositions.length) {
      const right = rightPositions[0];
      if (tryPlace(right).ok) x = right; else continue;
    } else {
      yLevel++;
      leftPositions.length = 0;
      rightPositions.length = 0;
      for (let i = center - 1; i >= 0; i--) leftPositions.push(i);
      for (let i = center + 1; i < roverConfig.width; i++) rightPositions.push(i);
      continue;
    }

    if (x !== null) {
      if (x < center) leftPositions.shift(); else rightPositions.shift();
      pushPlacement(item, x);
    }
  }

  return { totalWeight: currentWeight, items: manifested, placement };
}
