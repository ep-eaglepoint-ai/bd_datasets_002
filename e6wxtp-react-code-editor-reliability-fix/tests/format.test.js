const puppeteer = require('puppeteer');

describe('Formatting & Indentation', () => {
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

        await page.waitForSelector('textarea', { visible: true });

        await page.evaluate(() => {
            const textarea = document.querySelector('textarea');
            const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
            setter.call(textarea, '');
            textarea.dispatchEvent(new Event('input', { bubbles: true }));
        });

        await new Promise(r => setTimeout(r, 200));
    });

    test('Tab key inserts spaces', async () => {
        await page.type('textarea', 'start');
        await page.keyboard.press('Home');
        await page.keyboard.press('Tab');

        const content = await page.$eval('textarea', el => el.value);
        expect(content).toBe('  start');
    });

    test('Auto Format indents code', async () => {
        await page.type('textarea', 'function foo() {\nreturn true;\n}');

        const formatBtn = await page.$('button.bg-purple-600');
        await formatBtn.click();

        await page.waitForFunction(
            () => document.querySelector('textarea').value.includes('  return'),
            { timeout: 5000 }
        );

        const content = await page.$eval('textarea', el => el.value);
        const lines = content.split('\n');
        expect(lines[1]).toMatch(/^  return/);
    });
});
