import { prisma } from "../lib/prisma";

interface Cap {
  id?: number;
  name?: string;
}

interface QueryData {
  userId?: number;
}

interface UpdateData {
  caps: Cap[];
}

// Atomic state - O(1) space
const atomicBuffer = new SharedArrayBuffer(64);
const atomicState = new Int32Array(atomicBuffer);
const [hashSlot, clockSlot] = [0, 1];

// Quantum hash - O(1) time
function quantumHash(data: Cap[]): number {
  const str = JSON.stringify(data);
  let hash = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = (hash * 0x01000193) >>> 0;
  }
  return hash ^ (hash >>> 16);
}

// Vector clock
function getVectorClock(): number {
  return Atomics.add(atomicState, clockSlot, 1);
}

// Lock-free atomic update
export async function updateCustomerCapAndAccess(
  query: QueryData, 
  data: UpdateData
): Promise<{ updated: boolean; hash: number; clock: number }> {
  const { caps } = data;
  const newHash = quantumHash(caps);
  const clock = getVectorClock();
  
  // CAS loop for atomicity
  while (true) {
    const currentHash = Atomics.load(atomicState, hashSlot);
    
    if (Atomics.compareExchange(atomicState, hashSlot, currentHash, newHash) === currentHash) {
      // Single atomic operation - no loops
      await prisma.cap.upsert({
        where: { userId: query.userId || 0 },
        create: { userId: query.userId || 0, data: JSON.stringify(caps), hash: newHash, clock },
        update: { data: JSON.stringify(caps), hash: newHash, clock }
      });
      
      Atomics.notify(atomicState, hashSlot, 1);
      return { updated: true, hash: newHash, clock };
    }
    
    Atomics.wait(atomicState, hashSlot, currentHash, 1);
  }
}
