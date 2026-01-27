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

        await page.waitForSelector('textarea', { visible: true, timeout: 10000 });

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
});
