export interface Item {
  id: string;
  priority: number;
  name: string;
}

export interface ProcessorOptions {
  stable: boolean;
  deduplicate: boolean;

  minPriority?: number;
  maxPriority?: number;

  normalizeName?: boolean;              
  allowNegativePriority?: boolean;     

  includeNameSubstr?: string;          
  excludeNameSubstr?: string;           

  enrich?: boolean;                     
  enrichTimeoutMs?: number;             
  enrichConcurrency?: number;          

  artificialDelayMs?: number;           
  jitterMs?: number;                    

  maxItems?: number;                   
  cursor?: string;                      
}

export interface RandomSource {
  next(): number; // [0,1)
}

export class MathRandomSource implements RandomSource {
  next(): number {
    return Math.random();
  }
}

export interface Enricher {
  enrich(item: Item, signal?: AbortSignal): Promise<Partial<Item>>;
}

export type Metrics = {
  inputCount: number;
  afterFilterCount: number;
  afterDedupeCount: number;
  enrichedCount: number;
  outputCount: number;
};

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

export class EnrichTimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EnrichTimeoutError";
  }
}

function decodeCursor(cursor?: string): number {
  if (!cursor) return 0;
  try {
    const n = Number(Buffer.from(cursor, "base64").toString("utf8"));
    return Number.isFinite(n) && n >= 0 ? Math.floor(n) : 0;
  } catch {
    return 0;
  }
}

function encodeCursor(n: number): string {
  return Buffer.from(String(n), "utf8").toString("base64");
}

function normalizeName(name: string): string {
  return name.trim().replace(/\s+/g, " ");
}

async function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  if (!ms || ms <= 0) return p;
  let t: any;
  const timeout = new Promise<T>((_, rej) => {
    t = setTimeout(() => rej(new EnrichTimeoutError(`enrich timed out after ${ms}ms`)), ms);
  });
  try {
    return await Promise.race([p, timeout]);
  } finally {
    clearTimeout(t);
  }
}

async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  fn: (t: T) => Promise<R>
): Promise<R[]> {
  const c = Math.max(1, Math.floor(concurrency || 1));
  const out: R[] = new Array(items.length);
  let idx = 0;

  const workers = Array.from({ length: Math.min(c, items.length) }, async () => {
    while (true) {
      const i = idx++;
      if (i >= items.length) return;
      out[i] = await fn(items[i]);
    }
  });

  await Promise.all(workers);
  return out;
}

export class OrderProcessor {
  constructor(
    private readonly rng: RandomSource = new MathRandomSource(),
    private readonly sleep: (ms: number) => Promise<void> = (ms) =>
      new Promise((r) => setTimeout(r, ms)),
    private readonly enricher: Enricher | null = null,
    private readonly onMetrics: ((m: Metrics) => void) | null = null
  ) {}

  async processOrders(
    items: Item[],
    options: ProcessorOptions,
    signal?: AbortSignal
  ): Promise<{ items: Item[]; nextCursor?: string }> {
    if (!Array.isArray(items)) throw new ValidationError("items must be an array");
    if (!options) throw new ValidationError("options required");

    const startIndex = decodeCursor(options.cursor);

    // never mutate input
    const indexed = items.map((it, originalIndex) => ({ it, originalIndex }));

    // validate + normalize
    const normalized = indexed.map(({ it, originalIndex }) => {
      if (!it || typeof it.id !== "string" || it.id.length === 0) {
        throw new ValidationError("item.id must be a non-empty string");
      }
      if (typeof it.name !== "string") {
        throw new ValidationError("item.name must be a string");
      }
      if (typeof it.priority !== "number" || !Number.isFinite(it.priority)) {
        throw new ValidationError("item.priority must be a finite number");
      }
      if (!options.allowNegativePriority && it.priority < 0) {
        throw new ValidationError("negative priority not allowed");
      }
      const name = options.normalizeName ? normalizeName(it.name) : it.name;
      return { it: { ...it, name }, originalIndex };
    });

    // filter include/exclude + priority range
    let working = normalized.filter(({ it }) => {
      if (options.minPriority !== undefined && it.priority < options.minPriority) return false;
      if (options.maxPriority !== undefined && it.priority > options.maxPriority) return false;
      if (options.includeNameSubstr && !it.name.includes(options.includeNameSubstr)) return false;
      if (options.excludeNameSubstr && it.name.includes(options.excludeNameSubstr)) return false;
      return true;
    });

    const afterFilterCount = working.length;

    // dedupe by id (keep first by original order)
    if (options.deduplicate) {
      const seen = new Set<string>();
      working = working.filter(({ it }) => {
        if (seen.has(it.id)) return false;
        seen.add(it.id);
        return true;
      });
    }

    const afterDedupeCount = working.length;

    // enrich (optional)
    let enrichedCount = 0;
    if (options.enrich) {
      if (!this.enricher) throw new ValidationError("enricher required when enrich=true");
      const timeoutMs = options.enrichTimeoutMs ?? 0;
      const conc = options.enrichConcurrency ?? 1;

      const enriched = await mapWithConcurrency(working, conc, async ({ it, originalIndex }) => {
        if (signal?.aborted) throw new Error("aborted");
        const patch = await withTimeout(this.enricher!.enrich(it, signal), timeoutMs);
        enrichedCount++;
        return { it: { ...it, ...patch }, originalIndex };
      });

      working = enriched;
    }

    // BUG: Wrong sort order - ascending instead of descending
    working.sort((a, b) => {
      if (a.it.priority !== b.it.priority) return a.it.priority - b.it.priority; // BUG: Should be b.priority - a.priority

      if (options.stable) {
        const byId = a.it.id.localeCompare(b.it.id);
        if (byId !== 0) return byId;
        const byName = a.it.name.localeCompare(b.it.name);
        if (byName !== 0) return byName;
        return a.originalIndex - b.originalIndex;
      }

      // unstable but reproducible with injected RNG
      return this.rng.next() - 0.5;
    });

    // artificial delay once + deterministic jitter
    if (options.artificialDelayMs && options.artificialDelayMs > 0) {
      const jitter = options.jitterMs && options.jitterMs > 0
        ? Math.floor(this.rng.next() * (options.jitterMs + 1))
        : 0;
      await this.sleep(options.artificialDelayMs + jitter);
    }

    // pagination + max items
    const sliced = working.slice(startIndex);
    const cap = options.maxItems !== undefined ? Math.max(0, Math.floor(options.maxItems)) : sliced.length;
    const page = sliced.slice(0, cap);

    const outputItems = page.map((x) => x.it);
    const nextIndex = startIndex + page.length;
    const hasMore = nextIndex < working.length;

    this.onMetrics?.({
      inputCount: items.length,
      afterFilterCount,
      afterDedupeCount,
      enrichedCount,
      outputCount: outputItems.length,
    });

    return {
      items: outputItems,
      nextCursor: hasMore ? encodeCursor(nextIndex) : undefined,
    };
  }
}

