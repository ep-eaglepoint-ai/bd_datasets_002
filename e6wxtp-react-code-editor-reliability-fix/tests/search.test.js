const puppeteer = require('puppeteer');

jest.setTimeout(60000);

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
    }, 30000);

    beforeEach(async () => {
        await page.goto(APP_URL);

        await page.waitForSelector('textarea', { visible: true });

        await page.evaluate(() => {
            const textarea = document.querySelector('textarea');
            const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
            setter.call(textarea, 'apple banana apple cherry');
            textarea.dispatchEvent(new Event('input', { bubbles: true }));
        });

        await new Promise(r => setTimeout(r, 200));
    });

    test('Finds matches correctly', async () => {
        const content = await page.$eval('textarea', el => el.value);
        expect(content).toBe('apple banana apple cherry');

        await page.type('#search-input', 'apple', { delay: 10 });

        const term = await page.$eval('#search-input', el => el.value);
        expect(term).toBe('apple');

        await page.waitForFunction(
            () => {
                const spans = Array.from(document.querySelectorAll('span'));
                return spans.some(s => s.textContent.includes('2 matches'));
            },
            { timeout: 5000 }
        );

        const matchesFound = await page.evaluate(() => {
            const spans = Array.from(document.querySelectorAll('span'));
            return spans.some(s => s.textContent.includes('2 matches'));
        });
        expect(matchesFound).toBeTruthy();
    });

    test('Handles invalid regex gracefully', async () => {
        await page.type('#search-input', '[');
        await new Promise(r => setTimeout(r, 500));

        const textarea = await page.$('textarea');
        expect(textarea).not.toBeNull();

        const matches = await page.evaluate(() => {
            const spans = Array.from(document.querySelectorAll('span'));
            return spans.find(s => s.textContent.includes('matches'));
        });
        expect(matches).toBeFalsy();
    });

    test('Replace All works', async () => {
        await page.type('#search-input', 'apple');

        const replaceToggle = await page.$$("xpath///button[text()='Replace']");
        if (replaceToggle.length > 0) {
            await replaceToggle[0].click();
            await page.waitForSelector('input[placeholder="Replace with..."]', { visible: true });
        }

        await page.type('input[placeholder="Replace with..."]', 'orange');

        const replaceAllBtn = await page.$$("xpath///button[text()='Replace All']");
        if (replaceAllBtn.length > 0) {
            await replaceAllBtn[0].click();
            await page.waitForFunction(
                () => document.querySelector('textarea').value.includes('orange'),
                { timeout: 5000 }
            );
        }

        const content = await page.$eval('textarea', el => el.value);
        expect(content).toBe('orange banana orange cherry');
    });

    test('Replace with pending debounce works correctly', async () => {
        // Type in the textarea to create pending debounce
        await page.click('textarea');
        await page.type('textarea', ' extra');

        // Immediately perform a replace operation (before debounce fires)
        await page.type('#search-input', 'apple');
        await new Promise(r => setTimeout(r, 100));

        const replaceToggle = await page.$$("xpath///button[text()='Replace']");
        if (replaceToggle.length > 0) {
            await replaceToggle[0].click();
            await page.waitForSelector('input[placeholder="Replace with..."]', { visible: true });
        }

        await page.type('input[placeholder="Replace with..."]', 'grape');

        const replaceAllBtn = await page.$$("xpath///button[text()='Replace All']");
        if (replaceAllBtn.length > 0) {
            await replaceAllBtn[0].click();
            await new Promise(r => setTimeout(r, 300));
        }

        const content = await page.$eval('textarea', el => el.value);
        expect(content).toBe('grape banana grape cherry extra');

        // Undo should work correctly
        await page.keyboard.down('Control');
        await page.keyboard.press('z');
        await page.keyboard.up('Control');
        await new Promise(r => setTimeout(r, 100));

        const afterUndo = await page.$eval('textarea', el => el.value);
        expect(afterUndo).toContain('apple');
    });

    test('Regex toggle preserves search behavior', async () => {
        // Search with regex mode off (should escape special chars)
        await page.type('#search-input', '.');
        await new Promise(r => setTimeout(r, 200));

        // With regex off, '.' should not match anything (no literal dot in content)
        let matchesSpan = await page.evaluate(() => {
            const spans = Array.from(document.querySelectorAll('span'));
            return spans.find(s => s.textContent.includes('matches'));
        });
        expect(matchesSpan).toBeFalsy();

        // Enable regex mode - now '.' should match everything
        const regexCheckbox = await page.$('input[type="checkbox"]');
        if (regexCheckbox) {
            await regexCheckbox.click();
            await new Promise(r => setTimeout(r, 200));
        }

        // Should now show matches (since . matches any char in regex)
        matchesSpan = await page.evaluate(() => {
            const spans = Array.from(document.querySelectorAll('span'));
            const match = spans.find(s => s.textContent.includes('matches'));
            return match ? match.textContent : null;
        });
        expect(matchesSpan).toBeTruthy();
    });
});
