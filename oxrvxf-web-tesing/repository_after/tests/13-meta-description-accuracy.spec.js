import { test, expect } from '@playwright/test';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

test('test descriptions match their assertions', async () => {
  const testsDir = join(__dirname);
  const testFiles = readdirSync(testsDir)
    .filter(f => f.endsWith('.spec.js') && !f.includes('meta-'))
    .map(f => join(testsDir, f));
  
  const mismatches = [];
  
  for (const filePath of testFiles) {
    const content = readFileSync(filePath, 'utf-8');
    const testMatches = content.matchAll(/test\(['"]([^'"]+)['"]/g);
    
    for (const match of testMatches) {
      const testName = match[1].toLowerCase();
      const testStart = match.index;
      const testEnd = content.indexOf('});', testStart);
      const testBody = content.substring(testStart, testEnd);
      
      if ((testName.includes('creates') || testName.includes('create')) && !testName.includes('does not create')) {
        const hasCreationCheck = 
          /\.toHaveLength\(/.test(testBody) ||
          /\.toBeDefined\(/.test(testBody) ||
          /\.toHaveCount\(/.test(testBody) ||
          /expect\(.*\)\.toHaveProperty/.test(testBody) ||
          /\.find\(/.test(testBody);
        
        if (!hasCreationCheck) {
          mismatches.push(`${filePath}: "${testName}"`);
        }
      }
      
      if ((testName.includes('deletes') || testName.includes('delete')) && !testName.includes('does not delete')) {
        const hasDeletionCheck =
          /\.toHaveLength\(/.test(testBody) ||
          /\.toBeUndefined\(/.test(testBody) ||
          /\.find\(.*\)\.toBeUndefined/.test(testBody);
        
        if (!hasDeletionCheck) {
          mismatches.push(`${filePath}: "${testName}"`);
        }
      }
      
      if (testName.includes('fails') || testName.includes('error') || (testName.includes('invalid') && !testName.includes('valid'))) {
        const hasErrorCheck =
          /\.not\.toThrow/.test(testBody) ||
          /unchanged/.test(testBody) ||
          /still/.test(testBody) ||
          /\.toHaveLength\(/.test(testBody);
        
        if (!hasErrorCheck) {
          mismatches.push(`${filePath}: "${testName}"`);
        }
      }
    }
  }
  
  expect(mismatches).toHaveLength(0);
});
