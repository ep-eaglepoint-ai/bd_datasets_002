import { test, expect } from '@playwright/test';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

test('every test file has beforeEach hook for isolation', async () => {
  const testsDir = join(__dirname);
  const testFiles = readdirSync(testsDir)
    .filter(f => f.endsWith('.spec.js') && !f.includes('meta-'))
    .map(f => join(testsDir, f));
  
  const filesWithoutIsolation = [];
  
  for (const filePath of testFiles) {
    const content = readFileSync(filePath, 'utf-8');
    const hasBeforeEach = /test\.beforeEach/.test(content);
    const hasIsolation = 
      /localStorage\.clear\(\)/.test(content) ||
      /page\.goto/.test(content) ||
      /localStorage\.setItem.*skip-default/.test(content);
    
    if (!hasBeforeEach || !hasIsolation) {
      filesWithoutIsolation.push(filePath);
    }
  }
  
  expect(filesWithoutIsolation).toHaveLength(0);
});
