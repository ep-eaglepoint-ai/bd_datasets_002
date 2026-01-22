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
  }, 15000);

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
      // Minimal wait for React to initialize
      await page.waitForTimeout(500);
    } catch (error) {
      console.error(`Failed to load app at ${appUrl}: ${error.message}`);
      if (page) {
        await page.close();
        page = null;
      }
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
      expect(page).toBeTruthy();
      
      const maliciousCode = "localStorage.setItem('test', 'hacked');";
      await page.fill('textarea', maliciousCode);
      await page.click('button:has-text("Run")');
      
      // Wait for any output (error or console) to appear
      await page.waitForTimeout(2000);
      
      // Check for error in console output area
      const errorElements = page.locator('.text-red-400');
      const errorCount = await errorElements.count();
      
      // Also check console output for error messages
      const consoleOutput = await page.textContent('body').catch(() => '');
      
      const repoType = process.env.TEST_REPO || 'after';
      if (repoType === 'after') {
        // Secure implementation should block it
        // In sandboxed iframe, browser blocks localStorage access with SecurityError
        let foundSecurityError = false;
        
        // Check error elements
        for (let i = 0; i < errorCount; i++) {
          const errorText = await errorElements.nth(i).textContent().catch(() => '');
          const lowerText = errorText.toLowerCase();
          if (/denied|error|blocked|access|not allowed|security|failed|securityerror|localstorage/i.test(lowerText)) {
            foundSecurityError = true;
            break;
          }
        }
        
        // Check console output for error messages (including console.error output)
        const lowerConsole = consoleOutput.toLowerCase();
        if (!foundSecurityError && /denied|error|blocked|access|security|failed|securityerror|localstorage/i.test(lowerConsole)) {
          foundSecurityError = true;
        }
        
        // If we have any error element, that's also acceptable
        if (!foundSecurityError && errorCount > 0) {
          const firstError = await errorElements.first().textContent().catch(() => '');
          if (/timeout/i.test(firstError.toLowerCase())) {
            foundSecurityError = true;
          }
        }
        
        // In sandboxed iframe, localStorage access throws SecurityError which should be caught
        expect(foundSecurityError || errorCount > 0).toBe(true);
      } else {
        const parentValue = await page.evaluate(() => {
          try {
            return localStorage.getItem('test');
          } catch (e) {
            return null;
          }
        });
        expect(parentValue).toBeNull();
      }
    }, 10000);

    test('window object access should be blocked', async () => {
      expect(page).toBeTruthy();
      
      const maliciousCode = "window.__hacked = true;";
      await page.fill('textarea', maliciousCode);
      await page.click('button:has-text("Run")');
      await page.waitForTimeout(1000);
      
      // Check that parent window is not affected
      const parentHacked = await page.evaluate(() => window.__hacked);
      expect(parentHacked).toBeUndefined();
    }, 8000);

    test('parent window access should be blocked', async () => {
      expect(page).toBeTruthy();
      
      const maliciousCode = "parent.window.location = 'http://evil.com';";
      await page.fill('textarea', maliciousCode);
      await page.click('button:has-text("Run")');
      await page.waitForTimeout(1000);
      
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
    }, 8000);
  });

  describe('Infinite Loop Protection', () => {
    test('infinite loops should timeout safely', async () => {
      expect(page).toBeTruthy();
      
      const infiniteCode = "while(true) { }";
      await page.fill('textarea', infiniteCode);
      await page.click('button:has-text("Run")');
      
      // Wait for timeout (should be ~5 seconds, but check earlier)
      await page.waitForTimeout(5500);
      
      const errorElement = page.locator('.text-red-400').first();
      const errorText = await errorElement.textContent().catch(() => '');
      
      const repoType = process.env.TEST_REPO || 'after';
      if (repoType === 'after') {
        const hasTimeoutError = /timeout|infinite|exceeded/i.test(errorText);
        expect(hasTimeoutError).toBe(true);
      }
      
      // UI should still be responsive
      await page.click('button:has-text("Reset")');
      const textarea = page.locator('textarea');
      const isVisible = await textarea.isVisible();
      expect(isVisible).toBe(true);
    }, 12000);
  });

  describe('Console Interception', () => {
    test('console.log output should be captured', async () => {
      expect(page).toBeTruthy();
      
      const testCode = 'console.log("Hello, World!");';
      await page.fill('textarea', testCode);
      await page.click('button:has-text("Run")');
      
      // Wait for console output to appear (reduced timeout)
      await page.waitForTimeout(1000);
      
      // Check if output appears in console area
      const pageContent = await page.textContent('body').catch(() => '');
      expect(pageContent).toMatch(/Hello|World/);
    }, 8000);

    test('console should be restored after error', async () => {
      expect(page).toBeTruthy();
      
      const errorCode = 'throw new Error("Test error");';
      await page.fill('textarea', errorCode);
      await page.click('button:has-text("Run")');
      await page.waitForTimeout(1000);
      
      const testCode = 'console.log("After error");';
      await page.fill('textarea', testCode);
      await page.click('button:has-text("Run")');
      
      // Wait for console output to appear
      await page.waitForTimeout(1000);
      
      // Check if output appears (console should work after error)
      const pageContent = await page.textContent('body').catch(() => '');
      expect(pageContent).toContain('After error');
    }, 8000);
  });


  describe('Code Length Limit', () => {
    test('code exceeding 5000 characters should be rejected', async () => {
      expect(page).toBeTruthy();
      
      const longCode = "console.log('test');\n".repeat(1000);
      await page.fill('textarea', longCode);
      
      // Click run button
      await page.click('button:has-text("Run")');
      
      // Wait for error element to appear (error should appear immediately since it's synchronous)
      // The error is set before execution, so it should appear right away
      await page.waitForSelector('.text-red-400', { timeout: 3000 });
      
      const errorElement = page.locator('.text-red-400').first();
      const errorText = await errorElement.textContent().catch(() => '');
      
      const repoType = process.env.TEST_REPO || 'after';
      if (repoType === 'after') {
        expect(errorText).toMatch(/5000|length|exceed/i);
      }
    }, 10000);
  });
});
