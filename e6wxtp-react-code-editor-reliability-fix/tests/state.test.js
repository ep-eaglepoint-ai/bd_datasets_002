const puppeteer = require('puppeteer');

describe('State Management & History', () => {
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

        // Click save to ensure we start in saved state (app starts with default code = savedVersion)
        const saveBtn = await page.$('button.bg-green-600');
        if (saveBtn) {
            await saveBtn.click();
            await new Promise(r => setTimeout(r, 500));
        }
    });

    test('Shows "Unsaved" indicator when code changes', async () => {
        // Type something to trigger unsaved state
        await page.click('textarea');
        await page.type('textarea', ' // Change');

        // Wait for update
        await new Promise(r => setTimeout(r, 500));

        // Check for "Unsaved" text
        const unsaved = await page.$$("xpath///span[contains(., 'Unsaved')]");
        expect(unsaved.length).toBeGreaterThan(0);
    });

    test('Removes "Unsaved" indicator when Saved', async () => {
        await page.click('textarea');
        await page.type('textarea', ' // Change');

        // Wait for Unsaved to appear
        await new Promise(r => setTimeout(r, 500));

        // Click Save (bg-green-600)
        const saveBtn = await page.$('button.bg-green-600');
        await saveBtn.click();

        // Wait for state to update
        await new Promise(r => setTimeout(r, 500));

        // Check "Unsaved" is gone
        const unsaved = await page.$$("xpath///span[contains(., 'Unsaved')]");
        expect(unsaved.length).toBe(0);
    });

    test('Undo and Redo work correctly', async () => {
        // Clear text area using evaluate
        await page.evaluate(() => {
            const textarea = document.querySelector('textarea');
            const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
            setter.call(textarea, '');
            textarea.dispatchEvent(new Event('input', { bubbles: true }));
        });
        await new Promise(r => setTimeout(r, 200));

        // Type A
        await page.type('textarea', 'A');
        await new Promise(r => setTimeout(r, 500));

        // Type B
        await page.type('textarea', 'B');
        await new Promise(r => setTimeout(r, 500));

        // Content should be AB
        const content1 = await page.$eval('textarea', el => el.value);
        expect(content1).toBe('AB');

        // Undo (Ctrl+Z)
        await page.keyboard.down('Control');
        await page.keyboard.press('z');
        await page.keyboard.up('Control');
        await new Promise(r => setTimeout(r, 100));

        const content2 = await page.$eval('textarea', el => el.value);
        expect(content2).toBe('A');

        // Redo (Ctrl+Y)
        await page.keyboard.down('Control');
        await page.keyboard.press('y');
        await page.keyboard.up('Control');
        await new Promise(r => setTimeout(r, 100));

        const content3 = await page.$eval('textarea', el => el.value);
        expect(content3).toBe('AB');
    });
});
