const puppeteer = require('puppeteer');

jest.setTimeout(60000);

describe('Edge Cases & Stability', () => {
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
    }, 30000);

    beforeEach(async () => {
        await page.goto(APP_URL, { waitUntil: 'networkidle0', timeout: 30000 });

        await page.waitForSelector('textarea', { visible: true, timeout: 10000 });

        await page.evaluate(() => {
            const textarea = document.querySelector('textarea');
            const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
            setter.call(textarea, '');
            textarea.dispatchEvent(new Event('input', { bubbles: true }));
        });

        await new Promise(r => setTimeout(r, 400)); // Wait for debounce (300ms) to complete
    }, 30000);

    test('Massive input does not crash app', async () => {
        const hugeString = 'a'.repeat(10000);
        await page.evaluate((text) => {
            const textarea = document.querySelector('textarea');
            const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
            setter.call(textarea, text);
            textarea.dispatchEvent(new Event('input', { bubbles: true }));
        }, hugeString);

        await new Promise(r => setTimeout(r, 500));

        const charCountEl = await page.$$("xpath///div[contains(text(), 'Characters:')]/span");
        const count = await page.evaluate(el => el.textContent, charCountEl[0]);
        expect(parseInt(count)).toBe(10000);
    });

    test('Rapid typing does not lose state (Race conditions)', async () => {
        await page.type('textarea', '1234567890', { delay: 50 });

        const content = await page.$eval('textarea', el => el.value);
        expect(content).toContain('1234567890');

        await page.keyboard.down('Control');
        await page.keyboard.press('z');
        await page.keyboard.up('Control');

        const content2 = await page.$eval('textarea', el => el.value);
        expect(content2).not.toContain('1234567890');
        expect(content2).not.toContain('123456789');
    });

    test('Redo works correctly after typing with pending debounce', async () => {
        // Type something and let it settle into history
        await page.type('textarea', 'first');
        await new Promise(r => setTimeout(r, 500)); // Wait for debounce

        // Type more (this creates a pending debounce)
        await page.type('textarea', 'second');

        // Immediately undo (while debounce is still pending)
        await page.keyboard.down('Control');
        await page.keyboard.press('z');
        await page.keyboard.up('Control');
        await new Promise(r => setTimeout(r, 100));

        const afterUndo = await page.$eval('textarea', el => el.value);
        expect(afterUndo).toBe('first');

        // Now redo - this should restore 'firstsecond'
        await page.keyboard.down('Control');
        await page.keyboard.press('y');
        await page.keyboard.up('Control');
        await new Promise(r => setTimeout(r, 100));

        const afterRedo = await page.$eval('textarea', el => el.value);
        expect(afterRedo).toBe('firstsecond');
    });

    test('Undo/redo with immediate actions (no debounce wait)', async () => {
        // Capture the initial state (after beforeEach cleared it)
        const initialContent = await page.$eval('textarea', el => el.value);

        // Type something quickly
        await page.type('textarea', 'ABC');

        // Immediately undo without waiting for debounce
        await page.keyboard.down('Control');
        await page.keyboard.press('z');
        await page.keyboard.up('Control');
        await new Promise(r => setTimeout(r, 100));

        // The typed content should be undone (back to initial state)
        const content2 = await page.$eval('textarea', el => el.value);
        expect(content2).toBe(initialContent);

        // Redo should bring back the typed content
        await page.keyboard.down('Control');
        await page.keyboard.press('y');
        await page.keyboard.up('Control');
        await new Promise(r => setTimeout(r, 100));

        const content3 = await page.$eval('textarea', el => el.value);
        expect(content3).toContain('ABC');
    });

    test('Multiple rapid undo/redo cycles work correctly', async () => {
        // Type 'A', wait, type 'B', wait, type 'C'
        await page.type('textarea', 'A');
        await new Promise(r => setTimeout(r, 400));
        await page.type('textarea', 'B');
        await new Promise(r => setTimeout(r, 400));
        await page.type('textarea', 'C');
        await new Promise(r => setTimeout(r, 400));

        // Should have 'ABC'
        let content = await page.$eval('textarea', el => el.value);
        expect(content).toBe('ABC');

        // Undo twice rapidly
        await page.keyboard.down('Control');
        await page.keyboard.press('z');
        await page.keyboard.up('Control');
        await new Promise(r => setTimeout(r, 50));
        await page.keyboard.down('Control');
        await page.keyboard.press('z');
        await page.keyboard.up('Control');
        await new Promise(r => setTimeout(r, 100));

        content = await page.$eval('textarea', el => el.value);
        expect(content).toBe('A');

        // Redo twice rapidly
        await page.keyboard.down('Control');
        await page.keyboard.press('y');
        await page.keyboard.up('Control');
        await new Promise(r => setTimeout(r, 50));
        await page.keyboard.down('Control');
        await page.keyboard.press('y');
        await page.keyboard.up('Control');
        await new Promise(r => setTimeout(r, 100));

        content = await page.$eval('textarea', el => el.value);
        expect(content).toBe('ABC');
    });
});
