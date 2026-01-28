import {
  OrderProcessor,
  Item,
  ProcessorOptions,
  RandomSource,
  Enricher,
  ValidationError,
  EnrichTimeoutError,
  Metrics,
} from "./order_processor";
import {describe, expect, test, jest} from '@jest/globals';

type SleepFn = (ms: number) => Promise<void>;

class FakeRandomSource implements RandomSource {
  private idx = 0;
  constructor(private readonly values: number[]) {}
  next(): number {
    const v = this.values[this.idx % this.values.length];
    this.idx++;
    return v;
  }
}

const baseOptions: ProcessorOptions = {
  stable: true,
  deduplicate: false,
};

function makeItems(overrides: Partial<Item>[] = []): Item[] {
  return overrides.map((o, i) => ({
    id: `id-${i}`,
    name: `name-${i}`,
    priority: i,
    ...o,
  }));
}

describe("OrderProcessor.processOrders", () => {
  test("does not mutate input array or items (including when normalizing and enriching)", async () => {
    const items: Item[] = [
      { id: "1", priority: 5, name: "  Foo   Bar " },
      { id: "2", priority: 3, name: "Baz" },
    ];
    const originalArrayCopy = items.slice();
    const originalDeepCopy = JSON.parse(JSON.stringify(items)) as Item[];

    const enricher: Enricher = {
      enrich: async (item) => {
        return { name: item.name + " enriched" };
      },
    };

    const processor = new OrderProcessor(
      new FakeRandomSource([0.1]),
      async () => {},
      enricher,
      null
    );

    const result = await processor.processOrders(items, {
      ...baseOptions,
      normalizeName: true,
      enrich: true,
    });

    expect(items).toEqual(originalArrayCopy);
    expect(items).toEqual(originalDeepCopy);
    expect(result.items[0].name).toBe("Foo Bar enriched");
    expect(result.items[1].name).toBe("Baz enriched");
    expect(items[0].name).toBe("  Foo   Bar ");
    expect(items[1].name).toBe("Baz");
  });

  test("throws ValidationError when items is not an array", async () => {
    const processor = new OrderProcessor();
    await expect(processor.processOrders(null as any, baseOptions)).rejects.toThrow(
      ValidationError
    );
  });

  test("throws ValidationError when options is missing", async () => {
    const processor = new OrderProcessor();
    await expect(
      processor.processOrders([], undefined as any)
    ).rejects.toThrow(ValidationError);
  });

  test("throws ValidationError for empty id", async () => {
    const processor = new OrderProcessor();
    const items = makeItems([{ id: "" }]);
    await expect(
      processor.processOrders(items, baseOptions)
    ).rejects.toThrow(ValidationError);
  });

  test("throws ValidationError for non-string name", async () => {
    const processor = new OrderProcessor();
    const items: any[] = [
      { id: "1", priority: 1, name: "ok" },
      { id: "2", priority: 2, name: 123 },
    ];
    await expect(
      processor.processOrders(items, baseOptions)
    ).rejects.toThrow(ValidationError);
  });

  test("throws ValidationError for non-finite priority", async () => {
    const processor = new OrderProcessor();
    const itemsNaN: Item[] = [{ id: "1", priority: Number.NaN, name: "x" }];
    await expect(
      processor.processOrders(itemsNaN, baseOptions)
    ).rejects.toThrow(ValidationError);

    const itemsInf: Item[] = [{ id: "2", priority: Number.POSITIVE_INFINITY, name: "y" }];
    await expect(
      processor.processOrders(itemsInf, baseOptions)
    ).rejects.toThrow(ValidationError);
  });

  test("throws ValidationError for negative priority when allowNegativePriority is false or undefined", async () => {
    const processor = new OrderProcessor();
    const items: Item[] = [{ id: "1", priority: -1, name: "neg" }];

    await expect(
      processor.processOrders(items, { ...baseOptions, allowNegativePriority: false })
    ).rejects.toThrow(ValidationError);

    await expect(
      processor.processOrders(items, { ...baseOptions })
    ).rejects.toThrow(ValidationError);
  });

  test("allows negative priority when allowNegativePriority is true", async () => {
    const processor = new OrderProcessor();
    const items: Item[] = [{ id: "1", priority: -1, name: "neg" }];

    const result = await processor.processOrders(items, {
      ...baseOptions,
      allowNegativePriority: true,
    });

    expect(result.items).toHaveLength(1);
    expect(result.items[0].priority).toBe(-1);
  });

  test("throws ValidationError when enrich=true without an injected enricher", async () => {
    const processor = new OrderProcessor(); // enricher is null
    const items = makeItems([{ priority: 1 }]);

    await expect(
      processor.processOrders(items, { ...baseOptions, enrich: true })
    ).rejects.toThrow(ValidationError);
  });

  describe("filtering by priority boundaries and name substrings with normalization", () => {
    test("minPriority and maxPriority boundaries (exactly at, below, above)", async () => {
      const processor = new OrderProcessor();
      const items: Item[] = [
        { id: "low", priority: 1, name: "A" },
        { id: "mid", priority: 5, name: "B" },
        { id: "high", priority: 10, name: "C" },
      ];

      const opts: ProcessorOptions = {
        ...baseOptions,
        minPriority: 5,
        maxPriority: 10,
      };

      const result = await processor.processOrders(items, opts);
      const ids = result.items.map((i) => i.id);
      expect(ids).toEqual(["high", "mid"]);
      expect(ids).not.toContain("low");

      const belowMin = await processor.processOrders(items, {
        ...baseOptions,
        minPriority: 2,
      });
      expect(belowMin.items.map((i) => i.id)).toEqual(["high", "mid"]);

      const aboveMax = await processor.processOrders(items, {
        ...baseOptions,
        maxPriority: 9,
      });
      expect(aboveMax.items.map((i) => i.id)).toEqual(["mid", "low"]);
    });

    test("minPriority boundary just below/exact/just above", async () => {
      const processor = new OrderProcessor();
      const items: Item[] = [
        { id: "p4", priority: 4, name: "x" },
        { id: "p5", priority: 5, name: "y" },
        { id: "p6", priority: 6, name: "z" },
      ];

      const justBelow = await processor.processOrders(items, {
        ...baseOptions,
        minPriority: 4,
      });
      expect(justBelow.items.map((i) => i.id)).toEqual(["p6", "p5", "p4"]);

      const exact = await processor.processOrders(items, {
        ...baseOptions,
        minPriority: 5,
      });
      expect(exact.items.map((i) => i.id)).toEqual(["p6", "p5"]);

      const justAbove = await processor.processOrders(items, {
        ...baseOptions,
        minPriority: 6,
      });
      expect(justAbove.items.map((i) => i.id)).toEqual(["p6"]);
    });

    test("maxPriority boundary just below/exact/just above", async () => {
      const processor = new OrderProcessor();
      const items: Item[] = [
        { id: "p4", priority: 4, name: "x" },
        { id: "p5", priority: 5, name: "y" },
        { id: "p6", priority: 6, name: "z" },
      ];

      const justBelow = await processor.processOrders(items, {
        ...baseOptions,
        maxPriority: 4,
      });
      expect(justBelow.items.map((i) => i.id)).toEqual(["p4"]);

      const exact = await processor.processOrders(items, {
        ...baseOptions,
        maxPriority: 5,
      });
      expect(exact.items.map((i) => i.id)).toEqual(["p5", "p4"]);

      const justAbove = await processor.processOrders(items, {
        ...baseOptions,
        maxPriority: 6,
      });
      expect(justAbove.items.map((i) => i.id)).toEqual(["p6", "p5", "p4"]);
    });

    test("include and exclude name substrings with whitespace-only and normalization", async () => {
      const processor = new OrderProcessor();
      const items: Item[] = [
        { id: "1", priority: 1, name: "  foo   bar  " },
        { id: "2", priority: 1, name: "foo   baz" },
        { id: "3", priority: 1, name: "   " },
        { id: "4", priority: 1, name: "xxx" },
      ];

      const result = await processor.processOrders(items, {
        ...baseOptions,
        normalizeName: true,
        includeNameSubstr: "foo bar",
        excludeNameSubstr: "baz",
      });

      const names = result.items.map((i) => i.name);
      expect(names).toEqual(["foo bar"]); // normalized and included
      expect(result.items.map((i) => i.id)).toEqual(["1"]);
      // "foo   baz" should be excluded due to excludeNameSubstr
      // whitespace-only name should be trimmed to "" and not match include
      // "xxx" does not contain "foo bar"
    });

    test("normalization changes include/exclude substring matching behavior", async () => {
      const processor = new OrderProcessor();
      const items: Item[] = [
        { id: "spaced", priority: 1, name: "foo   bar" },
        { id: "compact", priority: 1, name: "foobar" },
      ];

      const withoutNormalization = await processor.processOrders(items, {
        ...baseOptions,
        normalizeName: false,
        includeNameSubstr: "foo bar",
      });
      expect(withoutNormalization.items.map((i) => i.id)).toEqual([]);

      const withNormalization = await processor.processOrders(items, {
        ...baseOptions,
        normalizeName: true,
        includeNameSubstr: "foo bar",
      });
      expect(withNormalization.items.map((i) => i.id)).toEqual(["spaced"]);
    });

    test("whitespace-only include/exclude substrings interact with normalization", async () => {
      const processor = new OrderProcessor();
      const items: Item[] = [
        { id: "hasSpace", priority: 2, name: "foo   bar" },
        { id: "noSpace", priority: 1, name: "foobar" },
      ];

      const includeSingleSpace = await processor.processOrders(items, {
        ...baseOptions,
        normalizeName: true,
        includeNameSubstr: " ",
      });
      expect(includeSingleSpace.items.map((i) => i.id)).toEqual(["hasSpace"]);

      const excludeSingleSpace = await processor.processOrders(items, {
        ...baseOptions,
        normalizeName: true,
        excludeNameSubstr: " ",
      });
      expect(excludeSingleSpace.items.map((i) => i.id)).toEqual(["noSpace"]);

      const includeTripleSpaceAfterNormalization = await processor.processOrders(items, {
        ...baseOptions,
        normalizeName: true,
        includeNameSubstr: "   ",
      });
      expect(includeTripleSpaceAfterNormalization.items.map((i) => i.id)).toEqual([]);
    });
  });

  describe("ordering: stable and unstable with deterministic RNG", () => {
    test("unstable ordering is reproducible with injected RNG when stable=false", async () => {
      const rngValues = [0.9, 0.1, 0.7, 0.3, 0.5];
      const items: Item[] = [
        { id: "a", priority: 1, name: "a" },
        { id: "b", priority: 1, name: "b" },
        { id: "c", priority: 1, name: "c" },
      ];

      const makeProcessor = () =>
        new OrderProcessor(new FakeRandomSource(rngValues), async () => {}, null, null);

      const processor1 = makeProcessor();
      const res1 = await processor1.processOrders(items, {
        ...baseOptions,
        stable: false,
      });

      const processor2 = makeProcessor();
      const res2 = await processor2.processOrders(items, {
        ...baseOptions,
        stable: false,
      });

      const order1 = res1.items.map((i) => i.id);
      const order2 = res2.items.map((i) => i.id);

      expect(order1).toEqual(order2);
      expect(order1.sort()).toEqual(["a", "b", "c"]);
    });

    test("stable tie-breaking: id, then name, then originalIndex when priorities equal", async () => {
      const processor = new OrderProcessor();
      const items: Item[] = [
        { id: "b", name: "z", priority: 1 }, // id=b
        { id: "a", name: "y", priority: 1 }, // id=a
        { id: "a", name: "x", priority: 1 }, // same id, name smaller
        { id: "a", name: "x", priority: 1 }, // same id, same name, later index
      ];

      const result = await processor.processOrders(items, {
        ...baseOptions,
        stable: true,
      });

      const idsAndNames = result.items.map((i) => `${i.id}:${i.name}`);
      expect(idsAndNames).toEqual([
        "a:x", // id a, name x (first occurrence)
        "a:x", // id a, name x (second occurrence, but after due to originalIndex)
        "a:y", // id a, name y
        "b:z", // id b
      ]);
    });
  });

  describe("artificial delay and jitter with injected RNG and fake sleep", () => {
    test("sleep is awaited once with artificialDelayMs + jitter when configured", async () => {
      const rng = new FakeRandomSource([0.7]); // jitter uses this
      const sleepCalls: number[] = [];
      const sleep: SleepFn = async (ms) => {
        sleepCalls.push(ms);
      };

      const processor = new OrderProcessor(rng, sleep, null, null);
      const items = makeItems([{ priority: 10 }]);

      const artificialDelayMs = 100;
      const jitterMs = 10;
      const expectedJitter = Math.floor(0.7 * (jitterMs + 1)); // floor(0.7*11)=7
      const expectedSleep = artificialDelayMs + expectedJitter;

      await processor.processOrders(items, {
        ...baseOptions,
        artificialDelayMs,
        jitterMs,
      });

      expect(sleepCalls).toHaveLength(1);
      expect(sleepCalls[0]).toBe(expectedSleep);
    });

    test("sleep is not called when artificialDelayMs is falsy or <=0", async () => {
      const rng = new FakeRandomSource([0.3]);
      const sleep = jest.fn(async (ms: number) => {}) as jest.MockedFunction<(ms: number) => Promise<void>>;
      const processor = new OrderProcessor(rng, sleep, null, null);
      const items = makeItems([{ priority: 10 }]);

      await processor.processOrders(items, { ...baseOptions });
      await processor.processOrders(items, { ...baseOptions, artificialDelayMs: 0 });

      expect(sleep).not.toHaveBeenCalled();
    });
  });

  describe("enrichment behavior: success, failure, timeout, concurrency, metrics", () => {
    test("successful enrichment patches items and metrics.enrichedCount equals number of items", async () => {
      const metrics: Metrics[] = [];
      const enricher: Enricher = {
        enrich: async (item) => ({ name: item.name + "-enriched" }),
      };
      const processor = new OrderProcessor(
        new FakeRandomSource([0.1]),
        async () => {},
        enricher,
        (m) => metrics.push(m)
      );
      const items = makeItems([{ priority: 5 }, { priority: 3 }]);

      const result = await processor.processOrders(items, {
        ...baseOptions,
        enrich: true,
        enrichConcurrency: 2,
      });

      expect(result.items.map((i) => i.name)).toEqual([
        "name-0-enriched",
        "name-1-enriched",
      ]);
      expect(metrics).toHaveLength(1);
      expect(metrics[0].inputCount).toBe(2);
      expect(metrics[0].afterFilterCount).toBe(2);
      expect(metrics[0].afterDedupeCount).toBe(2);
      expect(metrics[0].enrichedCount).toBe(2);
      expect(metrics[0].outputCount).toBe(2);
    });

    test("enrichment timeout per item throws EnrichTimeoutError", async () => {
      jest.useFakeTimers();
      const neverResolvingEnricher: Enricher = {
        enrich: async () =>
          new Promise<Partial<Item>>(() => {
            // never resolve
          }),
      };

      const processor = new OrderProcessor(
        new FakeRandomSource([0.1]),
        async () => {},
        neverResolvingEnricher,
        null
      );
      const items: Item[] = [{ id: "1", priority: 1, name: "x" }];

      // Attach the rejection handler before advancing timers to avoid unhandled rejection noise.
      const p = processor.processOrders(items, {
        ...baseOptions,
        enrich: true,
        enrichTimeoutMs: 10,
        enrichConcurrency: 1,
      });

      const expectation = expect(p).rejects.toThrow(EnrichTimeoutError);
      await jest.advanceTimersByTimeAsync(11);
      await expectation;
      jest.useRealTimers();
    });

    test("enricher rejection propagates (failure case)", async () => {
      const err = new Error("enrich failed");
      const enricher: Enricher = {
        enrich: async () => {
          throw err;
        },
      };
      const processor = new OrderProcessor(new FakeRandomSource([0.1]), async () => {}, enricher, null);
      const items = makeItems([{ priority: 1 }]);

      await expect(
        processor.processOrders(items, {
          ...baseOptions,
          enrich: true,
          enrichConcurrency: 1,
        })
      ).rejects.toThrow(err);
    });

    test("concurrency is throttled according to enrichConcurrency", async () => {
      const inFlight: { current: number; max: number } = { current: 0, max: 0 };
      let started = 0;
      const resolvers: (() => void)[] = [];

      const flushMicrotasks = async (times: number) => {
        for (let i = 0; i < times; i++) {
          await Promise.resolve();
        }
      };

      const waitUntil = async (predicate: () => boolean) => {
        for (let i = 0; i < 50; i++) {
          if (predicate()) return;
          await flushMicrotasks(1);
        }
        throw new Error("waitUntil: condition not met");
      };

      const enricher: Enricher = {
        enrich: (item) => {
          started++;
          inFlight.current++;
          if (inFlight.current > inFlight.max) {
            inFlight.max = inFlight.current;
          }
          let resolve!: () => void;
          const p = new Promise<Partial<Item>>((res) => {
            resolve = () => {
              inFlight.current--;
              res({ name: item.name + "-e" });
            };
          });
          resolvers.push(resolve);
          return p;
        },
      };

      const processor = new OrderProcessor(
        new FakeRandomSource([0.1]),
        async () => {},
        enricher,
        null
      );
      const items: Item[] = [
        { id: "1", priority: 1, name: "a" },
        { id: "2", priority: 1, name: "b" },
        { id: "3", priority: 1, name: "c" },
        { id: "4", priority: 1, name: "d" },
      ];

      const promise = processor.processOrders(items, {
        ...baseOptions,
        enrich: true,
        enrichConcurrency: 2,
      });

      // Initially only 2 in-flight calls should be started.
      await waitUntil(() => started === 2);
      expect(inFlight.max).toBe(2);
      expect(resolvers).toHaveLength(2);

      // Resolve one, then wait for a third to start.
      resolvers[0]?.();
      await waitUntil(() => started === 3);
      expect(inFlight.max).toBe(2);

      // Resolve another, then wait for the fourth to start.
      resolvers[1]?.();
      await waitUntil(() => started === 4);
      expect(inFlight.max).toBe(2);

      // Resolve remaining started enrich operations.
      resolvers[2]?.();
      resolvers[3]?.();

      const result = await promise;
      expect(result.items).toHaveLength(4);
    });
  });

  describe("pagination, cursor behavior, and metrics with filtering and deduplication", () => {
    test("pagination with cursor: multi-page scenario and union equals full sorted result", async () => {
      const rng = new FakeRandomSource([0.2, 0.8, 0.5, 0.1, 0.9]);
      const processor = new OrderProcessor(rng, async () => {}, null, null);

      const items: Item[] = [
        { id: "a", priority: 1, name: "a" },
        { id: "b", priority: 3, name: "b" },
        { id: "c", priority: 2, name: "c" },
        { id: "d", priority: 5, name: "d" },
        { id: "e", priority: 4, name: "e" },
      ];

      const pageSize = 2;

      const full = await processor.processOrders(items, {
        ...baseOptions,
        maxItems: undefined,
      });

      const firstPage = await processor.processOrders(items, {
        ...baseOptions,
        maxItems: pageSize,
      });
      expect(firstPage.items).toHaveLength(pageSize);
      expect(firstPage.nextCursor).toBeDefined();
      expect(firstPage.nextCursor).toBe(Buffer.from(String(pageSize), "utf8").toString("base64"));

      const secondPage = await processor.processOrders(items, {
        ...baseOptions,
        maxItems: pageSize,
        cursor: firstPage.nextCursor,
      });

      const thirdPage = await processor.processOrders(items, {
        ...baseOptions,
        maxItems: pageSize,
        cursor: secondPage.nextCursor,
      });

      const unionIds = [
        ...firstPage.items,
        ...secondPage.items,
        ...thirdPage.items,
      ].map((i) => i.id);

      const fullIds = full.items.map((i) => i.id);
      expect(unionIds).toEqual(fullIds);
      expect(thirdPage.nextCursor).toBeUndefined();
    });

    test("cursor decoding: starting from middle index using pre-encoded cursor", async () => {
      const processor = new OrderProcessor();
      const items: Item[] = [
        { id: "a", priority: 3, name: "a" },
        { id: "b", priority: 2, name: "b" },
        { id: "c", priority: 1, name: "c" },
      ];

      const first = await processor.processOrders(items, baseOptions);
      const encodedCursorForIndex1 = Buffer.from("1", "utf8").toString("base64");
      const fromSecond = await processor.processOrders(items, {
        ...baseOptions,
        cursor: encodedCursorForIndex1,
      });

      expect(first.items.map((i) => i.id)).toEqual(["a", "b", "c"]);
      expect(fromSecond.items.map((i) => i.id)).toEqual(["b", "c"]);
    });

    test("metrics reflect filtering and deduplication", async () => {
      const metrics: Metrics[] = [];
      const onMetrics = (m: Metrics) => metrics.push(m);
      const processor = new OrderProcessor(
        new FakeRandomSource([0.1]),
        async () => {},
        null,
        onMetrics
      );

      const items: Item[] = [
        { id: "dup", priority: 5, name: "x" },
        { id: "dup", priority: 4, name: "x" }, // duplicate id removed
        { id: "keep", priority: 2, name: "include" },
        { id: "filter-out", priority: 1, name: "exclude" }, // filtered
      ];

      const result = await processor.processOrders(items, {
        ...baseOptions,
        deduplicate: true,
        minPriority: 2,
        includeNameSubstr: "include",
        excludeNameSubstr: "exclude",
      });

      expect(result.items.map((i) => i.id)).toEqual(["keep"]);
      expect(metrics).toHaveLength(1);

      const m = metrics[0];
      expect(m.inputCount).toBe(4);
      // After filters: "keep"(2) => 1 (minPriority:2, includeNameSubstr:"include" filters out "dup" and "filter-out")
      expect(m.afterFilterCount).toBe(1);
      // After dedupe: "keep" => 1 (no duplicates to remove)
      expect(m.afterDedupeCount).toBe(1);
      expect(m.enrichedCount).toBe(0);
      expect(m.outputCount).toBe(1);
    });
  });

  describe("abort behavior", () => {
    test("already aborted signal causes prompt rejection without sleep or enrichment", async () => {
      const sleep = jest.fn(async (ms: number) => {}) as jest.MockedFunction<(ms: number) => Promise<void>>;
      const enricher: Enricher = {
        enrich: jest.fn(async (item: Item) => ({})) as jest.MockedFunction<Enricher["enrich"]>,
      };

      const metrics: Metrics[] = [];
      const processor = new OrderProcessor(
        new FakeRandomSource([0.1]),
        sleep,
        enricher,
        (m) => metrics.push(m)
      );

      const controller = new AbortController();
      controller.abort();

      const items: Item[] = [
        { id: "1", priority: 1, name: "x" },
        { id: "2", priority: 1, name: "y" },
      ];

      await expect(
        processor.processOrders(items, {
          ...baseOptions,
          enrich: true,
          enrichConcurrency: 2,
          artificialDelayMs: 50,
          jitterMs: 10,
        }, controller.signal)
      ).rejects.toThrow("aborted");

      expect(enricher.enrich).not.toHaveBeenCalled();
      expect(sleep).not.toHaveBeenCalled();
      expect(metrics).toHaveLength(0);
    });
  });

  describe("property-style invariants over many generated input sets (stable ordering)", () => {
    function seededRandom(seed: number): () => number {
      let s = seed >>> 0;
      return () => {
        s = (s * 1664525 + 1013904223) >>> 0;
        return s / 0xffffffff;
      };
    }

    test("output subset, length <= input, descending priority, stable tie-breaks for many inputs", async () => {
      const iterations = 20;
      for (let iter = 0; iter < iterations; iter++) {
        const rand = seededRandom(iter + 1);
        const itemCount = 1 + Math.floor(rand() * 6); // 1..6
        const items: Item[] = [];
        for (let i = 0; i < itemCount; i++) {
          const priority = Math.floor(rand() * 5); // 0..4
          const id = String.fromCharCode(97 + (i % 3)); // 'a','b','c'
          const name = `n${Math.floor(rand() * 3)}`; // n0,n1,n2
          items.push({ id: `${id}`, priority, name });
        }

        const processor = new OrderProcessor();
        const options: ProcessorOptions = {
          stable: true,
          deduplicate: false,
        };

        const result = await processor.processOrders(items, options);

        // output length <= input length
        expect(result.items.length).toBeLessThanOrEqual(items.length);

        // each output item comes from input (by id, priority, name, allowing for no enrichment)
        for (const out of result.items) {
          const match = items.find(
            (i) =>
              i.id === out.id &&
              i.priority === out.priority &&
              i.name === out.name
          );
          expect(match).toBeDefined();
        }

        // priorities are non-increasing
        for (let i = 1; i < result.items.length; i++) {
          expect(result.items[i - 1].priority).toBeGreaterThanOrEqual(
            result.items[i].priority
          );
        }

        // stable tie-breaking chain for equal-priority items
        const withIndex = result.items.map((it, idx) => ({
          it,
          resultIndex: idx,
        }));
        for (let p = 0; p <= 4; p++) {
          const group = withIndex.filter((x) => x.it.priority === p);
          const expectedOrder = group
            .map((g) => ({
              ...g,
              originalIndex: items.findIndex(
                (i) =>
                  i.id === g.it.id &&
                  i.name === g.it.name &&
                  i.priority === g.it.priority
              ),
            }))
            .sort((a, b) => {
              const byId = a.it.id.localeCompare(b.it.id);
              if (byId !== 0) return byId;
              const byName = a.it.name.localeCompare(b.it.name);
              if (byName !== 0) return byName;
              return a.originalIndex - b.originalIndex;
            });
          const actualIds = group.map((g) => `${g.it.id}:${g.it.name}`);
          const expectedIds = expectedOrder.map((g) => `${g.it.id}:${g.it.name}`);
          expect(actualIds).toEqual(expectedIds);
        }
      }
    });

    test("invariants still hold when enrichment patches names (id/priority subset, ordering)", async () => {
      const iterations = 20;
      for (let iter = 0; iter < iterations; iter++) {
        const rand = seededRandom(iter + 123);
        const itemCount = 1 + Math.floor(rand() * 6); // 1..6
        const items: Item[] = [];
        for (let i = 0; i < itemCount; i++) {
          const priority = Math.floor(rand() * 5); // 0..4
          const id = String.fromCharCode(97 + (i % 3)); // 'a','b','c'
          const name = `n${Math.floor(rand() * 3)}`; // n0,n1,n2
          items.push({ id: `${id}`, priority, name });
        }

        const enricher: Enricher = {
          enrich: async (item) => ({ name: `${item.name}-enriched` }),
        };
        const processor = new OrderProcessor(new FakeRandomSource([0.1]), async () => {}, enricher, null);

        const options: ProcessorOptions = {
          stable: true,
          deduplicate: false,
          enrich: true,
          enrichConcurrency: 3,
        };

        const result = await processor.processOrders(items, options);

        expect(result.items.length).toBeLessThanOrEqual(items.length);

        for (const out of result.items) {
          const input = items.find((i) => i.id === out.id && i.priority === out.priority);
          expect(input).toBeDefined();
          expect(out.name === input!.name || out.name === `${input!.name}-enriched`).toBe(true);
        }

        for (let i = 1; i < result.items.length; i++) {
          expect(result.items[i - 1].priority).toBeGreaterThanOrEqual(result.items[i].priority);
        }

        // stable tie-breaking is still enforced on the output set
        const outputWithOriginalIndex = result.items.map((it) => ({
          it,
          originalIndex: items.findIndex(
            (x) => x.id === it.id && x.priority === it.priority && (it.name === x.name || it.name === `${x.name}-enriched`)
          ),
        }));

        for (let p = 0; p <= 4; p++) {
          const group = outputWithOriginalIndex.filter((x) => x.it.priority === p);
          const expected = group
            .slice()
            .sort((a, b) => {
              const byId = a.it.id.localeCompare(b.it.id);
              if (byId !== 0) return byId;
              const byName = a.it.name.localeCompare(b.it.name);
              if (byName !== 0) return byName;
              return a.originalIndex - b.originalIndex;
            })
            .map((x) => `${x.it.id}:${x.it.name}`);
          const actual = group.map((x) => `${x.it.id}:${x.it.name}`);
          expect(actual).toEqual(expected);
        }
      }
    });
  });
});