import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { roverConfig } from "../hardware/specs.js";

const repo = process.env.REPO ?? "repository_after";
const mod = await import(`../${repo}/cargoManager.js`);
const { packRover } = mod;

// Requirement 1: Data Migration - placement has x and y positions
test("placement includes x and y coordinates for each item", () => {
  const items = [
    { id: "A", weight: 50, volume: 5 },
    { id: "B", weight: 30, volume: 5 }
  ];
  const result = packRover(items);
  for (const p of result.placement) {
    assert.ok(typeof p.x === "number", "placement should have x coordinate");
    assert.ok(typeof p.y === "number", "placement should have y coordinate");
    assert.ok(typeof p.id === "string", "placement should have id");
  }
});

// Requirement 2 & 6: CoG Balancing - heaviest at y=0 and center
test("heavy item placed at y=0 and center", () => {
  const items = [
    { id: "Heavy", weight: 100, volume: 5 },
    { id: "Medium", weight: 50, volume: 5 },
    { id: "Light", weight: 10, volume: 5 }
  ];
  const result = packRover(items);
  const heavy = result.placement.find(p => p.id === "Heavy");
  assert.equal(heavy.y, 0);
  const center = Math.floor(roverConfig.width / 2);
  assert.ok(Math.abs(heavy.x - center) <= 1);
});

// Requirement 3 & 7: Lateral Balance - weight within 10%
test("identical weights balanced laterally", () => {
  const items = [
    { id: "A", weight: 20, volume: 5 },
    { id: "B", weight: 20, volume: 5 },
    { id: "C", weight: 20, volume: 5 },
    { id: "D", weight: 20, volume: 5 },
    { id: "E", weight: 20, volume: 5 }
  ];
  const result = packRover(items);
  let left = 0;
  let right = 0;
  for (const p of result.placement) {
    const item = items.find(i => i.id === p.id);
    if (p.x < roverConfig.width / 2) left += item.weight; else right += item.weight;
  }
  const diff = Math.abs(left - right);
  const avg = (left + right) / 2;
  assert.ok(diff / avg <= 0.1);
});

// Requirement 4: Constraint Preservation - never exceed max capacity
test("never exceeds max capacity", () => {
  const items = [
    { id: "X", weight: roverConfig.maxCapacityWeight + 1, volume: 10 },
    { id: "Y", weight: 100, volume: 10 }
  ];
  const result = packRover(items);
  assert.ok(result.totalWeight <= roverConfig.maxCapacityWeight);
});

// Requirement 5: Single pass optimization - no separate .sort() call
test("uses single pass for sorting and placement", () => {
  const sourceCode = readFileSync(`./${repo}/cargoManager.js`, "utf-8");
  // Should not use [...items].sort() or items.slice().sort() pattern
  const hasSeparateSort = /\[\.\.\.items\]\.sort\(|items\.slice\(\)\.sort\(|items\.sort\(/.test(sourceCode);
  assert.ok(!hasSeparateSort, "should not use separate .sort() call on items array");
});
