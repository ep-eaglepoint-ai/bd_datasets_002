/**
 * Meta-tests to detect fake or incomplete sandbox implementations.
 * 
 * These tests run locally only (not in Docker) and check for:
 * - Hidden eval() usage
 * - Incomplete console interception
 * - Fake isolation
 * - Missing security features
 */

const { describe, test, expect } = require('@jest/globals');
const fs = require('fs');
const path = require('path');

const projectRoot = path.join(__dirname, '..');
const afterPath = path.join(projectRoot, 'repository_after');
const beforePath = path.join(projectRoot, 'repository_before');

function getAllJsFiles(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  
  list.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat && stat.isDirectory()) {
      results = results.concat(getAllJsFiles(filePath));
    } else if (file.endsWith('.js')) {
      results.push(filePath);
    }
  });
  
  return results;
}

describe('Meta Tests', () => {
  test('repository_after should not use eval()', () => {
    const jsFiles = getAllJsFiles(afterPath);
    const violations = [];
    
    jsFiles.forEach(file => {
      const content = fs.readFileSync(file, 'utf8');
      const lines = content.split('\n');
      
      lines.forEach((line, index) => {
        // Check for eval usage (not in comments)
        if (/\beval\s*\(/.test(line) && !line.trim().startsWith('//')) {
          violations.push(`${file}:${index + 1} - eval() usage found`);
        }
        
        // Check for new Function
        if (/new\s+Function\s*\(/.test(line) && !line.trim().startsWith('//')) {
          violations.push(`${file}:${index + 1} - new Function() usage found`);
        }
      });
    });
    
    expect(violations.length).toBe(0);
  });

  test('sandbox should use iframe isolation', () => {
    const sandboxFile = path.join(afterPath, 'src', 'SecureSandbox.js');
    
    expect(fs.existsSync(sandboxFile)).toBe(true);
    
    const content = fs.readFileSync(sandboxFile, 'utf8').toLowerCase();
    
    expect(content).toMatch(/iframe/);
    expect(content).toMatch(/sandbox/);
    expect(content).toMatch(/postmessage/);
  });

  test('console interception should be implemented', () => {
    const sandboxFile = path.join(afterPath, 'src', 'SecureSandbox.js');
    const content = fs.readFileSync(sandboxFile, 'utf8');
    
    expect(content).toMatch(/console\.(log|\[)/);
    expect(content.toLowerCase()).toMatch(/intercept|backup/);
  });

  test('timeout protection should be implemented', () => {
    const sandboxFile = path.join(afterPath, 'src', 'SecureSandbox.js');
    const content = fs.readFileSync(sandboxFile, 'utf8').toLowerCase();
    
    expect(content).toMatch(/timeout|settimeout/);
    expect(content).toMatch(/5000|max_execution/);
  });

  test('repository_before should use eval()', () => {
    const appFile = path.join(beforePath, 'src', 'App.js');
    
    expect(fs.existsSync(appFile)).toBe(true);
    
    const content = fs.readFileSync(appFile, 'utf8');
    
    expect(/\beval\s*\(/.test(content)).toBe(true);
  });

  test('no Web Workers should be used', () => {
    const jsFiles = getAllJsFiles(afterPath);
    const violations = [];
    
    jsFiles.forEach(file => {
      const content = fs.readFileSync(file, 'utf8');
      if (/new\s+Worker\s*\(/.test(content)) {
        violations.push(file);
      }
    });
    
    expect(violations.length).toBe(0);
  });

  test('no external sandbox libraries should be used', () => {
    const packageFile = path.join(afterPath, 'package.json');
    
    if (fs.existsSync(packageFile)) {
      const packageData = JSON.parse(fs.readFileSync(packageFile, 'utf8'));
      const dependencies = packageData.dependencies || {};
      
      const forbiddenLibs = ['vm2', 'isolated-vm', 'safe-eval', 'node-vm'];
      const foundLibs = forbiddenLibs.filter(lib => dependencies[lib]);
      
      expect(foundLibs.length).toBe(0);
    }
  });
});
