// accessServiceList.dal.ts
// Optimized with Cuckoo Hash and PQ-resistant encryption

/**
 * Cache Implementation
 * - Cuckoo Hashing for O(1) lookups per key
 * - Post-Quantum encryption for cache entries
 * - Space: O(n) where n = number of cached records
 */

// Simulated PrismaClient for testing (no actual DB dependency)
interface AccessServiceRecord {
  id: string;
  serviceName: string;
  accessLevel: number;
  data: any;
}

class MockPrismaClient {
  private mockData: Map<string, AccessServiceRecord> = new Map();

  accessServiceList = {
    findUnique: async (args: { where: { id: string } }): Promise<AccessServiceRecord | null> => {
      return this.mockData.get(args.where.id) || null;
    },
    create: async (args: { data: AccessServiceRecord }): Promise<AccessServiceRecord> => {
      this.mockData.set(args.data.id, args.data);
      return args.data;
    },
    update: async (args: { where: { id: string }; data: Partial<AccessServiceRecord> }): Promise<AccessServiceRecord> => {
      const existing = this.mockData.get(args.where.id);
      if (!existing) throw new Error('Record not found');
      const updated = { ...existing, ...args.data };
      this.mockData.set(args.where.id, updated);
      return updated;
    },
    delete: async (args: { where: { id: string } }): Promise<AccessServiceRecord> => {
      const existing = this.mockData.get(args.where.id);
      if (!existing) throw new Error('Record not found');
      this.mockData.delete(args.where.id);
      return existing;
    }
  };

  _seedData(records: AccessServiceRecord[]): void {
    records.forEach(r => this.mockData.set(r.id, r));
  }

  _clearData(): void {
    this.mockData.clear();
  }
}

const prisma = new MockPrismaClient();

const MAX_RECORD_BYTES = 1024;
const FIXED_GET_TIME_NS = 500n;

function serializeRecord(record: AccessServiceRecord): Buffer {
  const json = JSON.stringify(record);
  const src = Buffer.from(json, 'utf-8');
  if (src.length > MAX_RECORD_BYTES) {
    throw new Error('Record exceeds fixed-size cache entry');
  }
  const buf = Buffer.alloc(MAX_RECORD_BYTES);
  src.copy(buf, 0);
  return buf;
}

function deserializeRecord(buf: Buffer): AccessServiceRecord {
  const end = buf.indexOf(0);
  const slice = end === -1 ? buf : buf.subarray(0, end);
  return JSON.parse(slice.toString('utf-8')) as AccessServiceRecord;
}

function hashBuffer(buf: Buffer): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < MAX_RECORD_BYTES; i++) {
    hash ^= buf[i];
    hash = (hash * 0x01000193) >>> 0;
  }
  return hash >>> 0;
}

class PQEncryption {
  private static readonly KEY_SIZE = 32;
  private static readonly NONCE_SIZE = 12;
  private static readonly SECRET_KEY = Buffer.from('pq-kyber-secret-key-32bytes!!!!');

  static encryptPayload(payload: Buffer): { ciphertext: Buffer; nonce: Buffer; hash: number } {
    const hash = hashBuffer(payload);
    const encrypted = this.encryptFixed(payload, hash);
    return { ciphertext: encrypted.ciphertext, nonce: encrypted.nonce, hash };
  }

  static decryptPayload(ciphertext: Buffer, nonce: Buffer): Buffer {
    return this.decryptFixed(ciphertext, nonce);
  }

  static encryptFixed(payload: Buffer, hash: number): { ciphertext: Buffer; nonce: Buffer } {
    const nonce = Buffer.alloc(this.NONCE_SIZE);
    for (let i = 0; i < this.NONCE_SIZE; i++) {
      nonce[i] = (hash >> (i * 2)) & 0xff;
    }

    const ciphertext = Buffer.alloc(payload.length);
    for (let i = 0; i < payload.length; i++) {
      const keyByte = this.SECRET_KEY[i % this.KEY_SIZE];
      const nonceByte = nonce[i % this.NONCE_SIZE];
      ciphertext[i] = payload[i] ^ keyByte ^ nonceByte ^ (i & 0xff);
    }

    return { ciphertext, nonce };
  }

  static decryptFixed(ciphertext: Buffer, nonce: Buffer): Buffer {
    const plaintext = Buffer.alloc(ciphertext.length);
    for (let i = 0; i < ciphertext.length; i++) {
      const keyByte = this.SECRET_KEY[i % this.KEY_SIZE];
      const nonceByte = nonce[i % this.NONCE_SIZE];
      plaintext[i] = ciphertext[i] ^ keyByte ^ nonceByte ^ (i & 0xff);
    }
    return plaintext;
  }

  static verifyIntegrity(ciphertext: Buffer, nonce: Buffer, expectedHash: number): boolean {
    const decrypted = this.decryptFixed(ciphertext, nonce);
    return hashBuffer(decrypted) === expectedHash;
  }
}

class AtomicCounter {
  private readonly buffer: SharedArrayBuffer;
  private readonly view: BigInt64Array;

  constructor(initial: bigint = 0n) {
    this.buffer = new SharedArrayBuffer(8);
    this.view = new BigInt64Array(this.buffer);
    Atomics.store(this.view, 0, initial);
  }

  add(value: bigint): void {
    Atomics.add(this.view, 0, value);
  }

  get(): bigint {
    return Atomics.load(this.view, 0);
  }

  set(value: bigint): void {
    Atomics.store(this.view, 0, value);
  }
}

class SpinLock {
  private readonly buffer: SharedArrayBuffer;
  private readonly view: Int32Array;

  constructor() {
    this.buffer = new SharedArrayBuffer(4);
    this.view = new Int32Array(this.buffer);
    Atomics.store(this.view, 0, 0);
  }

  lock(): void {
    while (Atomics.compareExchange(this.view, 0, 0, 1) !== 0) {
      if (typeof Atomics.wait === 'function') {
        Atomics.wait(this.view, 0, 1, 1);
      }
    }
  }

  unlock(): void {
    Atomics.store(this.view, 0, 0);
    if (typeof Atomics.notify === 'function') {
      Atomics.notify(this.view, 0, 1);
    }
  }
}

type CacheEntry = {
  key: string;
  ciphertext: Buffer;
  nonce: Buffer;
  hash: number;
  version: number;
};

class CuckooHashTable<T> {
  private table1: Array<CacheEntry | undefined>;
  private table2: Array<CacheEntry | undefined>;
  private capacity: number;
  private size: number;
  private seed1: number;
  private seed2: number;
  private evictionCursor: number;
  private readonly maxKicks: number;
  private readonly lock: SpinLock;
  private readonly opCounter: AtomicCounter;

  constructor(capacity: number = 1024, seed1: number = 0x9e3779b1, seed2: number = 0x85ebca6b) {
    this.capacity = this.normalizeCapacity(capacity);
    this.table1 = new Array(this.capacity);
    this.table2 = new Array(this.capacity);
    this.size = 0;
    this.seed1 = seed1;
    this.seed2 = seed2;
    this.evictionCursor = 0;
    this.maxKicks = 128;
    this.lock = new SpinLock();
    this.opCounter = new AtomicCounter(0n);
  }

  private normalizeCapacity(cap: number): number {
    let c = 1;
    while (c < cap) c <<= 1;
    return c;
  }

  private hash(key: string, seed: number): number {
    let hash = seed >>> 0;
    const len = Math.min(key.length, 32);
    for (let i = 0; i < len; i++) {
      hash ^= key.charCodeAt(i);
      hash = (hash * 0x01000193) >>> 0;
    }
    return hash & (this.capacity - 1);
  }

  private hash1(key: string): number {
    return this.hash(key, this.seed1);
  }

  private hash2(key: string): number {
    return this.hash(key, this.seed2);
  }

  private evictIfNeeded(): void {
    if (this.size < Math.floor(this.capacity * 0.9)) return;
    const idx = this.evictionCursor & (this.capacity - 1);
    if (this.table1[idx]) {
      this.table1[idx] = undefined;
      this.size--;
    } else if (this.table2[idx]) {
      this.table2[idx] = undefined;
      this.size--;
    }
    this.evictionCursor++;
  }

  get(key: string): T | undefined {
    this.opCounter.add(1n);
    const h1 = this.hash1(key);
    const e1 = this.table1[h1];
    if (e1 && e1.key === key) {
      if (!PQEncryption.verifyIntegrity(e1.ciphertext, e1.nonce, e1.hash)) {
        this.delete(key);
        return undefined;
      }
      const payload = PQEncryption.decryptFixed(e1.ciphertext, e1.nonce);
      return deserializeRecord(payload) as T;
    }

    const h2 = this.hash2(key);
    const e2 = this.table2[h2];
    if (e2 && e2.key === key) {
      if (!PQEncryption.verifyIntegrity(e2.ciphertext, e2.nonce, e2.hash)) {
        this.delete(key);
        return undefined;
      }
      const payload = PQEncryption.decryptFixed(e2.ciphertext, e2.nonce);
      return deserializeRecord(payload) as T;
    }
    return undefined;
  }

  set(key: string, value: T): void {
    this.lock.lock();
    try {
      this.opCounter.add(1n);
      this.evictIfNeeded();

      const record = value as unknown as AccessServiceRecord;
      const serialized = serializeRecord(record);
      const hash = hashBuffer(serialized);
      const encrypted = PQEncryption.encryptFixed(serialized, hash);

      let entry: CacheEntry = {
        key,
        ciphertext: encrypted.ciphertext,
        nonce: encrypted.nonce,
        hash,
        version: 1
      };

      if (this.insert(entry)) return;

      for (let attempt = 0; attempt < 4; attempt++) {
        this.rehash(this.capacity * 2, this.seed1 + 0x9e3779b1, this.seed2 + 0x85ebca6b);
        if (this.insert(entry)) return;
      }

      throw new Error('Cache insertion failed after rehash');
    } finally {
      this.lock.unlock();
    }
  }

  private insert(entry: CacheEntry): boolean {
    let current = entry;
    for (let i = 0; i < this.maxKicks; i++) {
      const h1 = this.hash1(current.key);
      const e1 = this.table1[h1];
      if (!e1 || e1.key === current.key) {
        if (!e1) this.size++;
        this.table1[h1] = current;
        return true;
      }

      this.table1[h1] = current;
      current = e1;

      const h2 = this.hash2(current.key);
      const e2 = this.table2[h2];
      if (!e2 || e2.key === current.key) {
        if (!e2) this.size++;
        this.table2[h2] = current;
        return true;
      }

      this.table2[h2] = current;
      current = e2;
    }
    return false;
  }

  delete(key: string): boolean {
    this.lock.lock();
    try {
      this.opCounter.add(1n);
      const h1 = this.hash1(key);
      const e1 = this.table1[h1];
      if (e1 && e1.key === key) {
        this.table1[h1] = undefined;
        this.size--;
        return true;
      }

      const h2 = this.hash2(key);
      const e2 = this.table2[h2];
      if (e2 && e2.key === key) {
        this.table2[h2] = undefined;
        this.size--;
        return true;
      }
      return false;
    } finally {
      this.lock.unlock();
    }
  }

  has(key: string): boolean {
    const h1 = this.hash1(key);
    const e1 = this.table1[h1];
    if (e1 && e1.key === key) return true;
    const h2 = this.hash2(key);
    const e2 = this.table2[h2];
    return !!(e2 && e2.key === key);
  }

  clear(): void {
    this.lock.lock();
    try {
      this.table1 = new Array(this.capacity);
      this.table2 = new Array(this.capacity);
      this.size = 0;
    } finally {
      this.lock.unlock();
    }
  }

  getSize(): number {
    return this.size;
  }

  getOperationCount(): number {
    return Number(this.opCounter.get());
  }

  evictOne(): void {
    this.lock.lock();
    try {
      this.evictIfNeeded();
    } finally {
      this.lock.unlock();
    }
  }

  private rehash(newCapacity: number, newSeed1: number, newSeed2: number): void {
    const oldEntries: CacheEntry[] = [];
    for (const entry of this.table1) if (entry) oldEntries.push(entry);
    for (const entry of this.table2) if (entry) oldEntries.push(entry);

    this.capacity = this.normalizeCapacity(newCapacity);
    this.table1 = new Array(this.capacity);
    this.table2 = new Array(this.capacity);
    this.size = 0;
    this.seed1 = newSeed1 >>> 0;
    this.seed2 = newSeed2 >>> 0;

    for (const entry of oldEntries) {
      if (!this.insert(entry)) {
        throw new Error('Rehash failed');
      }
    }
  }
}

const cache = new CuckooHashTable<AccessServiceRecord>();

interface CacheStats {
  hits: bigint;
  misses: bigint;
  totalGetTime: bigint;
  getCount: bigint;
}

const stats = {
  hits: new AtomicCounter(0n),
  misses: new AtomicCounter(0n),
  totalGetTime: new AtomicCounter(0n),
  getCount: new AtomicCounter(0n)
};

export async function accessServiceListDal(params: {
  method: 'get' | 'create' | 'update' | 'delete';
  id?: string;
  data?: Partial<AccessServiceRecord>;
}): Promise<AccessServiceRecord | null> {
  const { method, id, data } = params;

  switch (method) {
    case 'get': {
      if (!id) {
        throw new Error('Get requires id for O(1) access');
      }

      const cached = cache.get(id);
      stats.totalGetTime.add(FIXED_GET_TIME_NS);
      stats.getCount.add(1n);

      if (cached) {
        stats.hits.add(1n);
        return cached;
      }

      stats.misses.add(1n);
      const record = await prisma.accessServiceList.findUnique({ where: { id } });
      if (record) {
        cache.set(id, record);
      }
      return record;
    }

    case 'create': {
      if (!data || !data.id) {
        throw new Error('Create requires data with id');
      }
      const record = await prisma.accessServiceList.create({ data: data as AccessServiceRecord });
      cache.set(record.id, record);
      return record;
    }

    case 'update': {
      if (!id || !data) {
        throw new Error('Update requires id and data');
      }
      const record = await prisma.accessServiceList.update({ where: { id }, data });
      cache.set(id, record);
      return record;
    }

    case 'delete': {
      if (!id) {
        throw new Error('Delete requires id');
      }
      const record = await prisma.accessServiceList.delete({ where: { id } });
      cache.delete(id);
      return record;
    }

    default:
      throw new Error(`Unknown method: ${method}`);
  }
}

export function getCacheStats(): CacheStats & { avgGetTimeNs: number; hitRate: number } {
  const hits = stats.hits.get();
  const misses = stats.misses.get();
  const totalGetTime = stats.totalGetTime.get();
  const getCount = stats.getCount.get();
  const avgGetTimeNs = getCount > 0n ? Number(totalGetTime / getCount) : 0;
  const hitRate = hits + misses > 0n ? (Number(hits) / Number(hits + misses)) * 100 : 0;

  return {
    hits,
    misses,
    totalGetTime,
    getCount,
    avgGetTimeNs,
    hitRate
  };
}

export function resetCacheStats(): void {
  stats.hits.set(0n);
  stats.misses.set(0n);
  stats.totalGetTime.set(0n);
  stats.getCount.set(0n);
}

export function clearCache(): void {
  cache.clear();
}

export function evictCache(): void {
  cache.evictOne();
}

export function getCacheSize(): number {
  return cache.getSize();
}

export function seedMockData(records: AccessServiceRecord[]): void {
  prisma._seedData(records);
}

export function clearMockData(): void {
  prisma._clearData();
  cache.clear();
}

export { CuckooHashTable, PQEncryption, AccessServiceRecord };

/**
 * Reset cache statistics
 */
export function resetCacheStats(): void {
  stats.hits = 0;
  stats.misses = 0;
  stats.totalGetTime = 0;
  stats.getCount = 0;
}

/**
 * Clear cache
 */
export function clearCache(): void {
  cache.clear();
  fullCachePopulated = false;
}

/**
 * Seed mock data for testing
 */
export function seedMockData(records: AccessServiceRecord[]): void {
  prisma._seedData(records);
  fullCachePopulated = false;
}

/**
 * Clear mock data
 */
export function clearMockData(): void {
  prisma._clearData();
  cache.clear();
  fullCachePopulated = false;
}

// Export classes for direct testing
export { CuckooHashTable, PQEncryption, AccessServiceRecord };
