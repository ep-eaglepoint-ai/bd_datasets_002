const puppeteer = require('puppeteer');

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
    });

    beforeEach(async () => {
        await page.goto(APP_URL, { waitUntil: 'networkidle0', timeout: 30000 });

        // Wait for textarea to be visible
        await page.waitForSelector('textarea', { visible: true, timeout: 10000 });

        // Clear content using evaluate to bypass React state
        await page.evaluate(() => {
            const textarea = document.querySelector('textarea');
            const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
            setter.call(textarea, '');
            textarea.dispatchEvent(new Event('input', { bubbles: true }));
        });

        await new Promise(r => setTimeout(r, 200));
    }, 30000);

    test('Massive input does not crash app', async () => {
        const hugeString = 'a'.repeat(10000);
        // Paste it?
        // Using evaluate is faster and safer for clipboard emulation issues
        await page.evaluate((text) => {
            const textarea = document.querySelector('textarea');
            // React 16+ hack to trigger onChange
            const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
            setter.call(textarea, text);
            textarea.dispatchEvent(new Event('input', { bubbles: true }));
        }, hugeString);

        // Wait a bit
        await new Promise(r => setTimeout(r, 500));

        // Check if still responsive
        const charCount = await page.$eval('span.font-mono', el => el.innerText); // First one is Lines? Or checking text-white ones.
        // Use xpath to find the chars count specifically
        // "Characters: <span...>{charCount}</span>"
        const charCountEl = await page.$$("xpath///div[contains(text(), 'Characters:')]/span");
        const count = await page.evaluate(el => el.textContent, charCountEl[0]);
        expect(parseInt(count)).toBe(10000); // Or approximately logic
    });

    test('Rapid typing does not lose state (Race conditions)', async () => {
        // Type rapidly but with slight delay to capture all
        await page.type('textarea', '1234567890', { delay: 50 });

        const content = await page.$eval('textarea', el => el.value);
        // Should contain all headers + '1234567890' (if appends) 
        // or just the typed if we cleared (we didn't clear in this test)
        // Just check it contains the sequence
        expect(content).toContain('1234567890');

        // Check history count
        // Should be reliable.
        // Undo once should remove '0'?
        await page.keyboard.down('Control');
        await page.keyboard.press('z');
        await page.keyboard.up('Control');

        // With rapid typing, history might batch or record every key. 
        // Implementation `handleCodeChange`: `recordHistory(); setCode(newCode)`.
        // It records history on EVERY CHANGE. 
        // So 10 keystrokes = 10 history entries.
        // Undo should remove the entire rapid sequence (grouped undo)
        const content2 = await page.$eval('textarea', el => el.value);
        expect(content2).not.toContain('1234567890');
        // Because of debouncing, the rapid typing is treated as one atomic action.
        // Undo should revert to the state BEFORE the typing started.
        // Since we didn't clear (in this test, actually we usually start with default or whatever was there),
        // we check that we DON'T have the partial string either.
        expect(content2).not.toContain('123456789');
    });
});
