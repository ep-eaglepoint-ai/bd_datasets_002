import test from "node:test";
import assert from "node:assert/strict";
import { roverConfig } from "../hardware/specs.js";

const repo = process.env.REPO ?? "repository_after";
const mod = await import(`../${repo}/cargoManager.js`);
const { packRover } = mod;

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

test("never exceeds max capacity", () => {
  const items = [
    { id: "X", weight: roverConfig.maxCapacityWeight + 1, volume: 10 },
    { id: "Y", weight: 100, volume: 10 }
  ];
  const result = packRover(items);
  assert.ok(result.totalWeight <= roverConfig.maxCapacityWeight);
});
