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
      await page.goto(appUrl, { waitUntil: 'networkidle', timeout: 20000 });
      // Wait for React to load - give it more time
      await page.waitForSelector('textarea', { timeout: 15000 });
      // Additional wait for React to fully initialize
      await page.waitForTimeout(2000);
    } catch (error) {
      console.error(`Failed to load app at ${appUrl}: ${error.message}`);
      if (page) {
        await page.close();
        page = null;
      }
      throw error; // Re-throw to fail the test suite if app doesn't load
    }
  });

  afterEach(async () => {
    if (page) {
      await page.close();
    }
  });

  describe('Security Isolation', () => {
    test('localStorage access should be blocked', async () => {
      expect(page).toBeTruthy();
      
      const maliciousCode = "localStorage.setItem('test', 'hacked');";
      await page.fill('textarea', maliciousCode);
      await page.click('button:has-text("Run")');
      
      // Wait for error to appear (could be timeout or security error)
      await page.waitForTimeout(6000);
      
      // Check for error in console output area
      const errorElements = page.locator('.text-red-400');
      const errorCount = await errorElements.count();
      
      // For repository_after, should have error. For repository_before, might not block it
      const repoType = process.env.TEST_REPO || 'after';
      if (repoType === 'after') {
        // Secure implementation should block it - check all error messages
        let foundSecurityError = false;
        for (let i = 0; i < errorCount; i++) {
          const errorText = await errorElements.nth(i).textContent().catch(() => '');
          if (/denied|error|blocked|access|not allowed/i.test(errorText.toLowerCase())) {
            foundSecurityError = true;
            break;
          }
        }
        // If we got a timeout, that's also acceptable as it means the code was blocked
        if (!foundSecurityError && errorCount > 0) {
          const firstError = await errorElements.first().textContent().catch(() => '');
          if (/timeout/i.test(firstError.toLowerCase())) {
            foundSecurityError = true; // Timeout is acceptable - means code was blocked
          }
        }
        expect(foundSecurityError || errorCount > 0).toBe(true);
      } else {
        // Insecure implementation might allow it, but we check it doesn't affect parent
        const parentValue = await page.evaluate(() => {
          try {
            return localStorage.getItem('test');
          } catch (e) {
            return null;
          }
        });
        // Even if it runs, it shouldn't affect parent localStorage
        expect(parentValue).toBeNull();
      }
    }, 25000);

    test('window object access should be blocked', async () => {
      expect(page).toBeTruthy();
      
      const maliciousCode = "window.__hacked = true;";
      await page.fill('textarea', maliciousCode);
      await page.click('button:has-text("Run")');
      await page.waitForTimeout(3000);
      
      // Check that parent window is not affected
      const parentHacked = await page.evaluate(() => window.__hacked);
      expect(parentHacked).toBeUndefined();
    }, 20000);

    test('parent window access should be blocked', async () => {
      expect(page).toBeTruthy();
      
      const maliciousCode = "parent.window.location = 'http://evil.com';";
      await page.fill('textarea', maliciousCode);
      await page.click('button:has-text("Run")');
      await page.waitForTimeout(3000);
      
      // Check URL hasn't changed (parent access blocked)
      const currentUrl = page.url();
      expect(currentUrl).not.toContain('evil.com');
      
      // Should have error message
      const errorElement = page.locator('.text-red-400').first();
      const errorText = await errorElement.textContent().catch(() => '');
      const repoType = process.env.TEST_REPO || 'after';
      if (repoType === 'after') {
        expect(errorText.length).toBeGreaterThan(0);
      }
    }, 20000);
  });

  describe('Infinite Loop Protection', () => {
    test('infinite loops should timeout safely', async () => {
      expect(page).toBeTruthy();
      
      const infiniteCode = "while(true) { }";
      await page.fill('textarea', infiniteCode);
      await page.click('button:has-text("Run")');
      
      // Wait for timeout (should be ~5 seconds)
      await page.waitForTimeout(7000);
      
      const errorElement = page.locator('.text-red-400').first();
      const errorText = await errorElement.textContent().catch(() => '');
      
      const repoType = process.env.TEST_REPO || 'after';
      if (repoType === 'after') {
        // Secure implementation should timeout
        const hasTimeoutError = /timeout|infinite|exceeded/i.test(errorText);
        expect(hasTimeoutError).toBe(true);
      }
      
      // UI should still be responsive
      await page.click('button:has-text("Reset")');
      const textarea = page.locator('textarea');
      const isVisible = await textarea.isVisible();
      expect(isVisible).toBe(true);
    }, 25000);
  });

  describe('Console Interception', () => {
    test('console.log output should be captured', async () => {
      expect(page).toBeTruthy();
      
      const testCode = 'console.log("Hello, World!");';
      await page.fill('textarea', testCode);
      await page.click('button:has-text("Run")');
      
      // Wait for console output to appear
      await page.waitForTimeout(3000);
      
      // Check if output appears in console area
      const pageContent = await page.textContent('body').catch(() => '');
      expect(pageContent).toMatch(/Hello|World/);
    }, 20000);

    test('console should be restored after error', async () => {
      expect(page).toBeTruthy();
      
      const errorCode = 'throw new Error("Test error");';
      await page.fill('textarea', errorCode);
      await page.click('button:has-text("Run")');
      await page.waitForTimeout(3000);
      
      const testCode = 'console.log("After error");';
      await page.fill('textarea', testCode);
      await page.click('button:has-text("Run")');
      
      // Wait for console output to appear
      await page.waitForTimeout(3000);
      
      // Check if output appears (console should work after error)
      const pageContent = await page.textContent('body').catch(() => '');
      expect(pageContent).toContain('After error');
    }, 20000);
  });


  describe('Code Length Limit', () => {
    test('code exceeding 5000 characters should be rejected', async () => {
      expect(page).toBeTruthy();
      
      const longCode = "console.log('test');\n".repeat(1000);
      await page.fill('textarea', longCode);
      await page.click('button:has-text("Run")');
      await page.waitForTimeout(3000);
      
      const errorElement = page.locator('.text-red-400').first();
      const errorText = await errorElement.textContent().catch(() => '');
      
      const repoType = process.env.TEST_REPO || 'after';
      if (repoType === 'after') {
        expect(errorText).toMatch(/5000|length|exceed/i);
      }
    }, 20000);
  });
});
