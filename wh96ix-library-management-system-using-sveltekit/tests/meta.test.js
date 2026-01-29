import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

const REQUIREMENT_COUNT = 12;
const REQ_TEST_FILE = path.resolve(__dirname, 'requirements.test.js');

function getRequirementsSource() {
  const content = fs.readFileSync(REQ_TEST_FILE, 'utf-8');
  return content;
}

describe('Meta: Requirements test suite structure', () => {
  const source = getRequirementsSource();

  it('has describe blocks for requirements 1-12', () => {
    for (let i = 1; i <= REQUIREMENT_COUNT; i++) {
      const pattern = new RegExp(`describe\\(['"]Requirement ${i}:`);
      expect(pattern.test(source)).toBe(true);
    }
  });

  it('each requirement describe block contains at least one test case', () => {
    for (let i = 1; i <= REQUIREMENT_COUNT; i++) {
      // Simple heuristic: the requirement header should appear in at least one `it(...)` fullName
      // in the source (since tests are written as nested describes).
      const requirementTag = `Requirement ${i}:`;
      const hasIt = new RegExp(`${requirementTag}[\\s\\S]*?it\\(`).test(source);
      expect(hasIt, `Requirement ${i} has no test cases (it(...))`).toBe(true);
    }
  });

  it('does not reference undefined requirement numbers', () => {
    const matches = Array.from(source.matchAll(/Requirement (\d+):/g));
    const nums = Array.from(new Set(matches.map((m) => Number(m[1]))));
    nums.forEach((n) => {
      expect(n).toBeGreaterThanOrEqual(1);
      expect(n).toBeLessThanOrEqual(REQUIREMENT_COUNT);
    });
  });
});

