/**
 * End-to-end tests verifying the complete application
 * Tests requirements: 1, 13, 15
 */

import puppeteer, { Browser, Page } from 'puppeteer';
import { spawn, ChildProcess } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('E2E Tests (Requirements 1, 13, 15)', () => {
    let browser: Browser;
    let page: Page;
    let serverProcess: ChildProcess;
    const PORT = 8100;
    const APP_URL = `http://localhost:${PORT}`;

    beforeAll(async () => {
        // Start the development server (Requirement 15: ionic serve)
        const repoPath = path.join(__dirname, '../repository_after');

        serverProcess = spawn('npm', ['run', 'dev'], {
            cwd: repoPath,
            stdio: 'pipe',
            shell: true
        });

        // Wait for server to be ready
        await new Promise<void>((resolve) => {
            const checkServer = async () => {
                try {
                    const response = await fetch(APP_URL);
                    if (response.ok || response.status === 404) {
                        resolve();
                    } else {
                        setTimeout(checkServer, 500);
                    }
                } catch {
                    setTimeout(checkServer, 500);
                }
            };
            setTimeout(checkServer, 2000);
        });

        // Launch browser
        browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
    }, 60000);

    afterAll(async () => {
        if (browser) {
            await browser.close();
        }
        if (serverProcess) {
            serverProcess.kill('SIGTERM');
        }
    });

    beforeEach(async () => {
        page = await browser.newPage();
    });

    afterEach(async () => {
        if (page) {
            await page.close();
        }
    });

    test('Requirement 15: app runs with vite dev server (ionic serve equivalent)', async () => {
        const response = await page.goto(APP_URL, { waitUntil: 'networkidle0' });
        expect(response?.status()).toBe(200);
    });

    test('Requirement 1: verifies Ionic + React + TypeScript stack', async () => {
        await page.goto(APP_URL, { waitUntil: 'networkidle0' });

        // Check for React root
        const reactRoot = await page.$('#root');
        expect(reactRoot).toBeTruthy();

        // Check for Ionic components in DOM
        const ionPage = await page.$('[data-testid="ion-page"]');
        expect(ionPage).toBeTruthy();
    });

    test('Requirement 13: app is mobile-friendly and responsive (mobile viewport)', async () => {
        // Set mobile viewport
        await page.setViewport({ width: 375, height: 667 }); // iPhone SE
        await page.goto(APP_URL, { waitUntil: 'networkidle0' });

        // Verify page renders without horizontal scroll
        const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
        expect(bodyWidth).toBeLessThanOrEqual(375);

        // Verify inputs are visible and accessible
        const incomeInput = await page.$('[data-testid="annual-income-input"]');
        expect(incomeInput).toBeTruthy();

        const deductionsInput = await page.$('[data-testid="deductions-input"]');
        expect(deductionsInput).toBeTruthy();
    });

    test('Requirement 13: app is responsive (tablet viewport)', async () => {
        // Set tablet viewport
        await page.setViewport({ width: 768, height: 1024 }); // iPad
        await page.goto(APP_URL, { waitUntil: 'networkidle0' });

        // Verify page renders properly
        const ionContent = await page.$('[data-testid="ion-content"]');
        expect(ionContent).toBeTruthy();

        // Verify all cards are visible
        const cards = await page.$$('[data-testid="ion-card"]');
        expect(cards.length).toBeGreaterThanOrEqual(2);
    });

    test('Complete user flow: input values and see instant results', async () => {
        await page.goto(APP_URL, { waitUntil: 'networkidle0' });

        // Input annual income
        await page.waitForSelector('[data-testid="annual-income-input"]');
        await page.focus('[data-testid="annual-income-input"]');
        await page.keyboard.type('75000');

        // Input deductions
        await page.focus('[data-testid="deductions-input"]');
        await page.keyboard.type('15000');

        // Select flat tax mode
        await page.select('[data-testid="tax-mode-select"]', 'flat');

        // Wait for flat tax rate input to appear and fill it
        await page.waitForSelector('[data-testid="flat-tax-rate-input"]');
        await page.focus('[data-testid="flat-tax-rate-input"]');
        await page.keyboard.type('20');

        // Verify results are displayed
        await page.waitForSelector('[data-testid="taxable-income"]');
        const taxableIncome = await page.$eval('[data-testid="taxable-income"]', el => el.textContent);
        expect(taxableIncome).toBeTruthy();
        expect(taxableIncome).toContain('$');

        const totalTax = await page.$eval('[data-testid="total-tax"]', el => el.textContent);
        expect(totalTax).toBeTruthy();
        expect(totalTax).toContain('$');
    });

    test('Verifies progressive tax mode switch', async () => {
        await page.goto(APP_URL, { waitUntil: 'networkidle0' });

        // Select progressive tax mode
        await page.waitForSelector('[data-testid="tax-mode-select"]');
        await page.select('[data-testid="tax-mode-select"]', 'progressive');

        // Flat tax rate input should not be visible
        const flatRateInput = await page.$('[data-testid="flat-tax-rate-input"]');
        expect(flatRateInput).toBeNull();

        // Results should still be calculated
        const taxableIncome = await page.$('[data-testid="taxable-income"]');
        expect(taxableIncome).toBeTruthy();
    });
});
