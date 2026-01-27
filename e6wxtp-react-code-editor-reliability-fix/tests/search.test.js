const puppeteer = require('puppeteer');

describe('Search & Replace', () => {
    let browser;
    let page;
    const APP_URL = process.env.APP_URL || 'http://localhost:3000';

    beforeAll(async () => {
        browser = await puppeteer.launch({
            headless: "new",
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        page = await browser.newPage();
    }, 30000);

    afterAll(async () => {
        await browser.close();
    });

    beforeEach(async () => {
        await page.goto(APP_URL);

        // Wait for textarea to be visible
        await page.waitForSelector('textarea', { visible: true });

        // Set code to known content using evaluate to bypass React state
        await page.evaluate(() => {
            const textarea = document.querySelector('textarea');
            const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
            setter.call(textarea, 'apple banana apple cherry');
            textarea.dispatchEvent(new Event('input', { bubbles: true }));
        });

        // Small wait for state to update
        await new Promise(r => setTimeout(r, 200));
    });

    test('Finds matches correctly', async () => {
        // Verify content first
        const content = await page.$eval('textarea', el => el.value);
        expect(content).toBe('apple banana apple cherry');

        await page.type('#search-input', 'apple', { delay: 10 });

        const term = await page.$eval('#search-input', el => el.value);
        expect(term).toBe('apple');

        // Wait for "2 matches" text to appear
        await page.waitForFunction(
            () => {
                const spans = Array.from(document.querySelectorAll('span'));
                return spans.some(s => s.textContent.includes('2 matches'));
            },
            { timeout: 5000 }
        );

        // Check match count text
        const matchesFound = await page.evaluate(() => {
            const spans = Array.from(document.querySelectorAll('span'));
            return spans.some(s => s.textContent.includes('2 matches'));
        });
        expect(matchesFound).toBeTruthy();
    });

    test('Handles invalid regex gracefully', async () => {
        await page.type('#search-input', '[');
        // Should NOT crash.
        await new Promise(r => setTimeout(r, 500));

        const textarea = await page.$('textarea');
        expect(textarea).not.toBeNull();

        // Match count should NOT be visible (0 matches or empty)
        const matches = await page.evaluate(() => {
            const spans = Array.from(document.querySelectorAll('span'));
            return spans.find(s => s.textContent.includes('matches'));
        });
        expect(matches).toBeFalsy();
    });

    test('Replace All works', async () => {
        await page.type('#search-input', 'apple');

        // Toggle Replace mode
        const replaceToggle = await page.$$("xpath///button[text()='Replace']");
        if (replaceToggle.length > 0) {
            await replaceToggle[0].click();
            // Wait for replace input to appear
            await page.waitForSelector('input[placeholder="Replace with..."]', { visible: true });
        }

        // Type Replace term
        await page.type('input[placeholder="Replace with..."]', 'orange');

        // Click Replace All
        const replaceAllBtn = await page.$$("xpath///button[text()='Replace All']");
        if (replaceAllBtn.length > 0) {
            await replaceAllBtn[0].click();
            // Wait for content to actually change
            await page.waitForFunction(
                () => document.querySelector('textarea').value.includes('orange'),
                { timeout: 5000 }
            );
        }

        // Verify content
        const content = await page.$eval('textarea', el => el.value);
        expect(content).toBe('orange banana orange cherry');
    });
});
