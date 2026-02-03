import * as fs from 'fs';
import * as path from 'path';

const repo = process.env.REPO || 'after';

describe('Sales Discount Calculator - Constraints', () => {
  it('should have no any types in refactored code', () => {
    if (repo === 'after') {
      const codePath = path.join(__dirname, '..', 'repository_after', 'discountCalculator.ts');
      const code = fs.readFileSync(codePath, 'utf8');
      const anyCount = (code.match(/\bany\b/g) || []).length;
      expect(anyCount).toBe(0);
    }
  });

  it('should have any types in original code', () => {
    if (repo === 'before') {
      const codePath = path.join(__dirname, '..', 'repository_before', 'discountCalculator.ts');
      const code = fs.readFileSync(codePath, 'utf8');
      const anyCount = (code.match(/\bany\b/g) || []).length;
      expect(anyCount).toBeGreaterThan(0);
    }
  });
});