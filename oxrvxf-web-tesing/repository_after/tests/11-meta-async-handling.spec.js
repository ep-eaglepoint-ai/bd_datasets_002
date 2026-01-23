import { test, expect } from '@playwright/test';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

test('all Playwright actions are properly awaited', async () => {
  const testsDir = join(__dirname);
  const testFiles = readdirSync(testsDir)
    .filter(f => f.endsWith('.spec.js') && !f.includes('meta-'))
    .map(f => join(testsDir, f));
  
  const asyncActions = [
    /\.click\(/,
    /\.fill\(/,
    /\.dragTo\(/,
    /\.press\(/,
    /\.dblclick\(/,
    /\.blur\(/,
    /\.evaluate\(/,
    /\.reload\(/,
    /\.goto\(/,
    /\.waitForTimeout\(/,
  ];
  
  const unawaitedActions = [];
  
  for (const filePath of testFiles) {
    const content = readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.trim().startsWith('//')) continue;
      
      for (const pattern of asyncActions) {
        if (pattern.test(line)) {
          const isAwaited = 
            line.trim().startsWith('await ') ||
            (i > 0 && lines[i - 1].trim().endsWith('await'));
          
          if (!isAwaited && !line.includes('//')) {
            unawaitedActions.push(`${filePath}:${i + 1}`);
            break;
          }
        }
      }
    }
  }
  
  expect(unawaitedActions).toHaveLength(0);
});
