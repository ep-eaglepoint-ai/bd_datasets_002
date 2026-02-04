const puppeteer = require('puppeteer');

jest.setTimeout(60000);

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
    }, 30000);

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

    test('Reset clears all state including regex and replace modes', async () => {
        // First, set up some state: enable regex mode, open replace panel, type a search term
        await page.type('#search-input', 'test');
        await new Promise(r => setTimeout(r, 200));

        // Enable regex mode (checkbox with .* label)
        const regexCheckbox = await page.$('input[type="checkbox"]');
        if (regexCheckbox) {
            await regexCheckbox.click();
            await new Promise(r => setTimeout(r, 100));
        }

        // Open replace mode
        const replaceToggle = await page.$$("xpath///button[text()='Replace']");
        if (replaceToggle.length > 0) {
            await replaceToggle[0].click();
            await new Promise(r => setTimeout(r, 200));
        }

        // Verify replace panel is visible
        const replaceInput = await page.$('input[placeholder="Replace with..."]');
        expect(replaceInput).not.toBeNull();

        // Type something in code area
        await page.type('textarea', 'some code');
        await new Promise(r => setTimeout(r, 300));

        // Click reset button (red button)
        const resetBtn = await page.$('button.bg-red-600');
        await resetBtn.click();
        await new Promise(r => setTimeout(r, 300));

        // Verify search input is cleared
        const searchValue = await page.$eval('#search-input', el => el.value);
        expect(searchValue).toBe('');

        // Verify regex checkbox is unchecked
        const regexChecked = await page.$eval('input[type="checkbox"]', el => el.checked);
        expect(regexChecked).toBe(false);

        // Verify replace panel is closed (no replace input visible)
        const replaceInputAfter = await page.$('input[placeholder="Replace with..."]');
        expect(replaceInputAfter).toBeNull();

        // Verify no matches are shown
        const matchesSpan = await page.evaluate(() => {
            const spans = Array.from(document.querySelectorAll('span'));
            return spans.find(s => s.textContent.includes('matches'));
        });
        expect(matchesSpan).toBeFalsy();

        // Verify code is reset to default
        const content = await page.$eval('textarea', el => el.value);
        expect(content).toContain('// Write your code here');
    });

    test('Reset clears pending history timeout', async () => {
        // Type something quickly
        await page.evaluate(() => {
            const textarea = document.querySelector('textarea');
            const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
            setter.call(textarea, '');
            textarea.dispatchEvent(new Event('input', { bubbles: true }));
        });
        await new Promise(r => setTimeout(r, 100));

        await page.type('textarea', 'typing quickly');

        // Immediately reset (before debounce timeout fires)
        const resetBtn = await page.$('button.bg-red-600');
        await resetBtn.click();
        await new Promise(r => setTimeout(r, 500));

        // Verify code is reset
        const content = await page.$eval('textarea', el => el.value);
        expect(content).toContain('// Write your code here');

        // Verify history is reset (should show 1/1)
        const historyDisplay = await page.evaluate(() => {
            const spans = Array.from(document.querySelectorAll('span'));
            const posSpan = spans.find(s => /\d+\/\d+/.test(s.textContent));
            return posSpan ? posSpan.textContent : null;
        });
        expect(historyDisplay).toBe('1/1');
    });

    test('Reset also resets language to default', async () => {
        // Change the language to something other than JavaScript
        await page.select('select', 'python');
        await new Promise(r => setTimeout(r, 100));

        // Verify language changed
        let langValue = await page.$eval('select', el => el.value);
        expect(langValue).toBe('python');

        // Click reset
        const resetBtn = await page.$('button.bg-red-600');
        await resetBtn.click();
        await new Promise(r => setTimeout(r, 300));

        // Verify language is reset to JavaScript
        langValue = await page.$eval('select', el => el.value);
        expect(langValue).toBe('javascript');
    });

    test('Format with pending debounce does not cause issues', async () => {
        // Clear the textarea
        await page.evaluate(() => {
            const textarea = document.querySelector('textarea');
            const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
            setter.call(textarea, '');
            textarea.dispatchEvent(new Event('input', { bubbles: true }));
        });
        await new Promise(r => setTimeout(r, 100));

        // Type some unformatted code
        await page.type('textarea', 'function foo() {\nreturn 1;\n}');

        // Immediately click format (before debounce fires)
        const formatBtn = await page.$('button.bg-purple-600');
        await formatBtn.click();
        await new Promise(r => setTimeout(r, 300));

        // Code should be formatted
        const content = await page.$eval('textarea', el => el.value);
        expect(content).toContain('  return');

        // Undo should work
        await page.keyboard.down('Control');
        await page.keyboard.press('z');
        await page.keyboard.up('Control');
        await new Promise(r => setTimeout(r, 100));

        const afterUndo = await page.$eval('textarea', el => el.value);
        expect(afterUndo).not.toContain('  return');
    });

    test('Save with pending debounce properly saves current content', async () => {
        // Clear the textarea
        await page.evaluate(() => {
            const textarea = document.querySelector('textarea');
            const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
            setter.call(textarea, '');
            textarea.dispatchEvent(new Event('input', { bubbles: true }));
        });
        await new Promise(r => setTimeout(r, 100));

        // Type some content
        await page.type('textarea', 'save test content');

        // Immediately save (before debounce fires)
        const saveBtn = await page.$('button.bg-green-600');
        await saveBtn.click();
        await new Promise(r => setTimeout(r, 300));

        // Modify the content
        await page.type('textarea', ' more');
        await new Promise(r => setTimeout(r, 100));

        // Should show unsaved indicator
        const unsaved = await page.$$("xpath///span[contains(., 'Unsaved')]");
        expect(unsaved.length).toBeGreaterThan(0);

        // Save again
        await saveBtn.click();
        await new Promise(r => setTimeout(r, 200));

        // Unsaved should be gone
        const unsaved2 = await page.$$("xpath///span[contains(., 'Unsaved')]");
        expect(unsaved2.length).toBe(0);
    });
});
