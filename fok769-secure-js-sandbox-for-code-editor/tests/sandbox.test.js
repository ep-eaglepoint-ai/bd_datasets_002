/**
 * Sandbox security and functionality tests.
 * Optimized for fast execution.
 */

const { describe, test, expect, beforeAll, afterAll, beforeEach, afterEach } = require('@jest/globals');
const { chromium } = require('playwright');

const appUrl = process.env.TEST_APP_URL || 'http://localhost:3000';

describe('Sandbox Security Tests', () => {
  let browser;
  let page;

  beforeAll(async () => {
    browser = await chromium.launch({ headless: true });
  }, 30000);

  afterAll(async () => {
    if (browser) {
      await browser.close();
    }
  });

  beforeEach(async () => {
    page = await browser.newPage();
    try {
      await page.goto(appUrl, { waitUntil: 'domcontentloaded', timeout: 10000 });
      // Wait for React to load
      await page.waitForSelector('textarea', { timeout: 5000 });
    } catch (error) {
      console.warn(`Could not load app at ${appUrl}: ${error.message}`);
      throw error;
    }
  });

  afterEach(async () => {
    if (page) {
      await page.close();
    }
  });

  describe('Security Isolation', () => {
    test('localStorage access should be blocked', async () => {
      const maliciousCode = "localStorage.setItem('test', 'hacked');";
      await page.fill('textarea', maliciousCode);
      await page.click('button:has-text("Run")');
      
      // Wait for error to appear (reduced timeout)
      await page.waitForSelector('.text-red-400', { timeout: 3000 }).catch(() => {});
      
      const errorElement = page.locator('.text-red-400').first();
      const errorText = await errorElement.textContent().catch(() => '');
      
      expect(errorText.toLowerCase()).toMatch(/denied|error|blocked|access/);
    }, 10000);

    test('window object access should be blocked', async () => {
      const maliciousCode = "window.__hacked = true;";
      await page.fill('textarea', maliciousCode);
      await page.click('button:has-text("Run")');
      await page.waitForTimeout(1500);
      
      const parentHacked = await page.evaluate(() => window.__hacked);
      expect(parentHacked).toBeUndefined();
    }, 10000);

    test('parent window access should be blocked', async () => {
      const maliciousCode = "parent.window.location = 'http://evil.com';";
      await page.fill('textarea', maliciousCode);
      await page.click('button:has-text("Run")');
      
      await page.waitForSelector('.text-red-400', { timeout: 3000 }).catch(() => {});
      const errorElement = page.locator('.text-red-400').first();
      const errorText = await errorElement.textContent().catch(() => '');
      
      expect(errorText.length).toBeGreaterThan(0);
    }, 10000);
  });

  describe('Infinite Loop Protection', () => {
    test('infinite loops should timeout safely', async () => {
      const infiniteCode = "while(true) { }";
      await page.fill('textarea', infiniteCode);
      await page.click('button:has-text("Run")');
      
      // Wait for timeout (reduced from 6s to check faster)
      await page.waitForSelector('.text-red-400', { timeout: 7000 }).catch(() => {});
      
      const errorElement = page.locator('.text-red-400').first();
      const errorText = await errorElement.textContent().catch(() => '');
      
      expect(errorText.toLowerCase()).toMatch(/timeout|infinite|exceeded/);
      
      // UI should still be responsive
      await page.click('button:has-text("Reset")');
      const textarea = page.locator('textarea');
      await expect(textarea).toBeVisible();
    }, 15000);
  });

  describe('Console Interception', () => {
    test('console.log output should be captured', async () => {
      const testCode = 'console.log("Hello, World!");';
      await page.fill('textarea', testCode);
      await page.click('button:has-text("Run")');
      
      await page.waitForSelector('.text-green-400, .text-blue-400', { timeout: 3000 }).catch(() => {});
      const outputElement = page.locator('.text-green-400, .text-blue-400').first();
      const output = await outputElement.textContent().catch(() => '');
      
      expect(output).toMatch(/Hello|World/);
    }, 10000);

    test('console should be restored after error', async () => {
      const errorCode = 'throw new Error("Test error");';
      await page.fill('textarea', errorCode);
      await page.click('button:has-text("Run")');
      await page.waitForTimeout(1500);
      
      const testCode = 'console.log("After error");';
      await page.fill('textarea', testCode);
      await page.click('button:has-text("Run")');
      await page.waitForTimeout(1500);
      
      const outputElement = page.locator('.text-green-400, .text-blue-400').first();
      const output = await outputElement.textContent().catch(() => '');
      
      expect(output.length).toBeGreaterThan(0);
    }, 10000);
  });

  describe('Safe Execution', () => {
    test('simple arithmetic should work', async () => {
      const code = 'console.log(2 + 2);';
      await page.fill('textarea', code);
      await page.click('button:has-text("Run")');
      
      await page.waitForSelector('.text-green-400, .text-blue-400', { timeout: 3000 }).catch(() => {});
      const outputElement = page.locator('.text-green-400, .text-blue-400').first();
      const output = await outputElement.textContent().catch(() => '');
      
      expect(output).toContain('4');
    }, 10000);

    test('function execution should work', async () => {
      const code = `function add(a, b) { return a + b; } console.log(add(5, 3));`;
      
      await page.fill('textarea', code);
      await page.click('button:has-text("Run")');
      await page.waitForTimeout(1500);
      
      const outputElement = page.locator('.text-green-400, .text-blue-400').first();
      const output = await outputElement.textContent().catch(() => '');
      
      expect(output).toContain('8');
    }, 10000);
  });

  describe('Code Length Limit', () => {
    test('code exceeding 5000 characters should be rejected', async () => {
      const longCode = "console.log('test');\n".repeat(1000);
      await page.fill('textarea', longCode);
      await page.click('button:has-text("Run")');
      await page.waitForTimeout(1500);
      
      const errorElement = page.locator('.text-red-400').first();
      const errorText = await errorElement.textContent().catch(() => '');
      
      expect(errorText).toMatch(/5000|length|exceed/i);
    }, 10000);
  });
});
