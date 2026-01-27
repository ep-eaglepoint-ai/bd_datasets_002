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

        await page.waitForSelector('textarea', { visible: true });

        const saveBtn = await page.$('button.bg-green-600');
        if (saveBtn) {
            await saveBtn.click();
            await new Promise(r => setTimeout(r, 500));
        }
    });

    test('Shows "Unsaved" indicator when code changes', async () => {
        await page.click('textarea');
        await page.type('textarea', ' // Change');

        await new Promise(r => setTimeout(r, 500));

        const unsaved = await page.$$("xpath///span[contains(., 'Unsaved')]");
        expect(unsaved.length).toBeGreaterThan(0);
    });

    test('Removes "Unsaved" indicator when Saved', async () => {
        await page.click('textarea');
        await page.type('textarea', ' // Change');

        await new Promise(r => setTimeout(r, 500));

        const saveBtn = await page.$('button.bg-green-600');
        await saveBtn.click();

        await new Promise(r => setTimeout(r, 500));

        const unsaved = await page.$$("xpath///span[contains(., 'Unsaved')]");
        expect(unsaved.length).toBe(0);
    });

    test('Undo and Redo work correctly', async () => {
        await page.evaluate(() => {
            const textarea = document.querySelector('textarea');
            const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
            setter.call(textarea, '');
            textarea.dispatchEvent(new Event('input', { bubbles: true }));
        });
        await new Promise(r => setTimeout(r, 200));

        await page.type('textarea', 'A');
        await new Promise(r => setTimeout(r, 500));

        await page.type('textarea', 'B');
        await new Promise(r => setTimeout(r, 500));

        const content1 = await page.$eval('textarea', el => el.value);
        expect(content1).toBe('AB');

        await page.keyboard.down('Control');
        await page.keyboard.press('z');
        await page.keyboard.up('Control');
        await new Promise(r => setTimeout(r, 100));

        const content2 = await page.$eval('textarea', el => el.value);
        expect(content2).toBe('A');

        await page.keyboard.down('Control');
        await page.keyboard.press('y');
        await page.keyboard.up('Control');
        await new Promise(r => setTimeout(r, 100));

        const content3 = await page.$eval('textarea', el => el.value);
        expect(content3).toBe('AB');
    });
});
