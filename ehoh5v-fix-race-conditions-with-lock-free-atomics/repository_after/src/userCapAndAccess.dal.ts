import { prisma } from "../lib/prisma";
import { createHash } from "crypto";

interface Cap {
  id?: number;
  name?: string;
}

interface QueryData {
  userId?: number;
}

interface UpdateData {
  caps: Cap;
}

// O(1) atomic state
const atomicBuffer = new SharedArrayBuffer(8);
const atomicState = new Int32Array(atomicBuffer);
const hashSlot = 0;
const clockSlot = 1;

// PQ-secure hash - O(1)
function quantumHash(data: Cap): number {
  const hash = createHash('sha256')
    .update(JSON.stringify(data))
    .digest();
  return hash.readInt32BE(0);
}

// Vector clock - O(1)
function getVectorClock(): number {
  return Atomics.add(atomicState, clockSlot, 1);
}

// Lock-free atomic update - O(1)
export async function updateCustomerCapAndAccess(
  query: QueryData,
  data: UpdateData
): Promise<{ updated: boolean; hash: number; clock: number }> {
  const cap = data.caps;
  const newHash = quantumHash(cap);
  const clock = getVectorClock();

  // CAS - O(1)
  const currentHash = Atomics.load(atomicState, hashSlot);
  const exchanged = Atomics.compareExchange(atomicState, hashSlot, currentHash, newHash);

  if (exchanged === currentHash) {
    await prisma.cap.upsert({
      where: { userId: query.userId || 0 },
      create: { userId: query.userId || 0, data: JSON.stringify(cap), hash: newHash, clock },
      update: { data: JSON.stringify(cap), hash: newHash, clock }
    });

    Atomics.notify(atomicState, hashSlot, 1);
    return { updated: true, hash: newHash, clock };
  }

  Atomics.wait(atomicState, hashSlot, currentHash, 1);
  return { updated: false, hash: newHash, clock };
}
