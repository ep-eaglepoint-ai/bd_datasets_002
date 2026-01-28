import * as fs from "fs";
import * as path from "path";
import {describe, expect, test, jest} from '@jest/globals';

function readAfterTestFile(): string {
  const root = path.resolve(__dirname, "..");
  const p = path.join(root, "repository_after", "src", "order_processor.test.ts");
  return fs.readFileSync(p, "utf8");
}

function mustMention(src: string, re: RegExp, label: string) {
  if (!re.test(src)) {
    throw new Error(`Missing required coverage signal: ${label} (${String(re)})`);
  }
}

describe("meta-testing: requirement traceability + test integrity (TypeScript)", () => {
  test("no obvious integrity anti-patterns (console output, focused/skipped tests)", () => {
    const src = readAfterTestFile();
    expect(src).not.toMatch(/\bconsole\.(log|info|warn|error|debug)\b/);
    expect(src).not.toMatch(/\bdescribe\.only\b/);
    expect(src).not.toMatch(/\btest\.only\b/);
    expect(src).not.toMatch(/\bit\.only\b/);
    expect(src).not.toMatch(/\bdescribe\.skip\b/);
    expect(src).not.toMatch(/\btest\.skip\b/);
    expect(src).not.toMatch(/\bit\.skip\b/);
  });

  test("requirement traceability signals are present in the generated test suite", () => {
    const src = readAfterTestFile();

    // Input immutability
    mustMention(src, /does not mutate input/i, "input immutability test");

    // Strict validation (invalid items + invalid option combination)
    mustMention(src, /empty id/i, "invalid item: empty id");
    mustMention(src, /non-finite priority/i, "invalid item: non-finite priority");
    mustMention(src, /negative priority/i, "invalid item: negative priority disallowed");
    mustMention(src, /enrich=true/i, "invalid option combo: enrich=true without injected enricher");
    mustMention(src, /rejects\.toThrow\(\s*ValidationError\s*\)/, "assert ValidationError");

    // Filtering boundaries
    mustMention(src, /\bminPriority\b/, "minPriority boundary coverage");
    mustMention(src, /\bmaxPriority\b/, "maxPriority boundary coverage");
    mustMention(src, /just below|justAbove|justBelow|exact/i, "boundary edge cases wording");

    // Include/exclude interactions incl whitespace-only + normalization
    mustMention(src, /\bincludeNameSubstr\b/, "includeNameSubstr interaction coverage");
    mustMention(src, /\bexcludeNameSubstr\b/, "excludeNameSubstr interaction coverage");
    mustMention(src, /whitespace-only/i, "whitespace-only substring/name interaction");
    mustMention(src, /\bnormalizeName\b/, "normalizeName interaction coverage");

    // Deterministic randomness / stable vs unstable
    mustMention(src, /FakeRandomSource/, "fake RNG injected");
    mustMention(src, /stable:\s*false/, "unstable ordering tested");
    mustMention(src, /stable tie-breaking/i, "stable tie-break chain tested");
    mustMention(src, /originalIndex/i, "originalIndex used in stable tie-break assertions");

    // Artificial delay + jitter with injected RNG and fake sleep
    mustMention(src, /artificial delay/i, "artificial delay coverage");
    mustMention(src, /\bjitterMs\b/, "jitterMs coverage");
    mustMention(src, /sleep is awaited once/i, "sleep awaited exactly once assertion");
    mustMention(src, /not to have been called|not\.toHaveBeenCalled/i, "sleep not called when not configured");

    // Enrichment: succeed, fail, timeout, concurrency throttling, metrics enrichedCount
    mustMention(src, /enrichTimeoutMs/i, "per-item enrich timeout coverage");
    mustMention(src, /EnrichTimeoutError/i, "EnrichTimeoutError asserted");
    mustMention(src, /concurrency is throttled/i, "enrichConcurrency throttle test");
    mustMention(src, /enrichedCount/i, "metrics.enrichedCount asserted");

    // Pagination: cursor encode/decode + multi-page union equals full sorted result
    mustMention(src, /pagination/i, "pagination coverage");
    mustMention(src, /\bnextCursor\b/, "nextCursor asserted");
    mustMention(src, /multi-page/i, "multi-page scenario");
    mustMention(src, /union.*equals/i, "union-of-pages equals full result");

    // Metrics: all counts asserted in representative scenarios
    mustMention(src, /onMetrics/i, "onMetrics callback injected");
    mustMention(src, /inputCount/i, "inputCount asserted");
    mustMention(src, /afterFilterCount/i, "afterFilterCount asserted");
    mustMention(src, /afterDedupeCount/i, "afterDedupeCount asserted");
    mustMention(src, /outputCount/i, "outputCount asserted");

    // Abort behavior: already aborted signal rejects promptly without sleep/enrichment
    mustMention(src, /already aborted/i, "already-aborted signal test");
    mustMention(src, /AbortController/i, "AbortSignal/AbortController used");
    mustMention(src, /not\.toHaveBeenCalled\(\)/, "sleep/enrich not called asserted");

    // Property-style invariant test
    mustMention(src, /property-style/i, "property-style invariants test");
    mustMention(src, /iterations\s*=\s*\d+/, "many iterations for generated inputs");
  });
});
