const puppeteer = require('puppeteer');

jest.setTimeout(60000);
const fs = require('fs');
const path = require('path');
const os = require('os');

describe('File Operations', () => {
    let browser;
    let page;
    const APP_URL = process.env.APP_URL || 'http://localhost:3000';
    const TEST_FILE_PATH = path.join(os.tmpdir(), 'test_upload.py');

    beforeAll(async () => {
        fs.writeFileSync(TEST_FILE_PATH, 'print("Hello Python")');

        browser = await puppeteer.launch({
            headless: "new",
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        page = await browser.newPage();
    }, 30000);

    afterAll(async () => {
        await browser.close();
        if (fs.existsSync(TEST_FILE_PATH)) fs.unlinkSync(TEST_FILE_PATH);
    }, 30000);

    beforeEach(async () => {
        await page.goto(APP_URL);
    });

    test('Upload file updates code and language', async () => {
        const fileInput = await page.$('input[type="file"]');
        await fileInput.uploadFile(TEST_FILE_PATH);

        await new Promise(r => setTimeout(r, 500));

        const content = await page.$eval('textarea', el => el.value);
        expect(content).toBe('print("Hello Python")');

        const langValue = await page.$eval('select', el => el.value);
        expect(langValue).toBe('python');

        const fileName = await page.$eval('input[placeholder="File name"]', el => el.value);
        expect(fileName).toBe('test_upload');
    });

    test('Download triggers download with correct name', async () => {
        const client = await page.target().createCDPSession();
        const downloadPath = path.join(os.tmpdir(), `downloads_${Date.now()}`);
        if (!fs.existsSync(downloadPath)) fs.mkdirSync(downloadPath);

        await client.send('Page.setDownloadBehavior', {
            behavior: 'allow',
            downloadPath: downloadPath,
        });

        await page.type('textarea', 'console.log("Download Test");');
        const nameInput = await page.$('input[placeholder="File name"]');
        await nameInput.click();
        await page.keyboard.down('Control');
        await page.keyboard.press('A');
        await page.keyboard.up('Control');
        await page.keyboard.press('Backspace');
        await nameInput.type('my_script');

        await page.select('select', 'javascript');

        const downloadBtn = await page.$('button.bg-blue-600');
        await downloadBtn.click();

        let found = false;
        for (let i = 0; i < 20; i++) {
            if (fs.existsSync(downloadPath)) {
                const files = fs.readdirSync(downloadPath);
                if (files.includes('my_script.js')) {
                    found = true;
                    break;
                }
            }
            await new Promise(r => setTimeout(r, 500));
        }
        expect(found).toBe(true);

        const files = fs.readdirSync(downloadPath);
        const expectedFile = 'my_script.js';
        expect(files).toContain(expectedFile);

        if (files.includes(expectedFile)) fs.unlinkSync(path.join(downloadPath, expectedFile));
        fs.rmdirSync(downloadPath);
    });

    test('Upload empty file handles gracefully', async () => {
        // Create an empty test file
        const emptyFilePath = path.join(os.tmpdir(), 'empty_test.js');
        fs.writeFileSync(emptyFilePath, '');

        try {
            const fileInput = await page.$('input[type="file"]');
            await fileInput.uploadFile(emptyFilePath);

            await new Promise(r => setTimeout(r, 500));

            // App should handle empty file without crashing
            const content = await page.$eval('textarea', el => el.value);
            expect(content).toBe('');

            // Language should still be detected
            const langValue = await page.$eval('select', el => el.value);
            expect(langValue).toBe('javascript');

            // File name should be set
            const fileName = await page.$eval('input[placeholder="File name"]', el => el.value);
            expect(fileName).toBe('empty_test');
        } finally {
            if (fs.existsSync(emptyFilePath)) fs.unlinkSync(emptyFilePath);
        }
    });

    test('Upload file with no extension handles gracefully', async () => {
        // Create a file without extension
        const noExtFilePath = path.join(os.tmpdir(), 'noextension');
        fs.writeFileSync(noExtFilePath, '# some content');

        try {
            const fileInput = await page.$('input[type="file"]');
            await fileInput.uploadFile(noExtFilePath);

            await new Promise(r => setTimeout(r, 500));

            // App should handle file without crashing
            const content = await page.$eval('textarea', el => el.value);
            expect(content).toBe('# some content');

            // File name should be set to the full filename
            const fileName = await page.$eval('input[placeholder="File name"]', el => el.value);
            expect(fileName).toBe('noextension');
        } finally {
            if (fs.existsSync(noExtFilePath)) fs.unlinkSync(noExtFilePath);
        }
    });

    test('Copy button does not crash app even with potential clipboard issues', async () => {
        // Type some code
        await page.type('textarea', 'test code for copy');
        await new Promise(r => setTimeout(r, 200));

        // Find copy button (button with svg icon but no text, in the toolbar)
        // The copy button is after the save button
        const copyBtn = await page.evaluate(() => {
            const buttons = Array.from(document.querySelectorAll('button'));
            // Find button that contains Copy icon (SVG)
            const copyButton = buttons.find(btn => {
                const svg = btn.querySelector('svg');
                return svg && btn.className.includes('bg-gray-700') && !btn.textContent.includes('Format');
            });
            return copyButton ? true : false;
        });

        // If we can find and click the copy button, the app shouldn't crash
        const allButtons = await page.$$('button.bg-gray-700');
        // The copy button should be one of these - just click the first gray one that's not undo/redo
        for (const btn of allButtons) {
            const text = await page.evaluate(el => el.textContent, btn);
            // Copy button has no text, just SVG
            if (text === '') {
                await btn.click();
                break;
            }
        }

        // Wait a moment for any async clipboard operation
        await new Promise(r => setTimeout(r, 300));

        // App should still be functional - verify by checking textarea still exists
        const textarea = await page.$('textarea');
        expect(textarea).not.toBeNull();

        // Content should still be there
        const content = await page.$eval('textarea', el => el.value);
        expect(content).toContain('test code for copy');
    });

    test('Upload updates history correctly', async () => {
        // First, type something
        await page.evaluate(() => {
            const textarea = document.querySelector('textarea');
            const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
            setter.call(textarea, 'initial content');
            textarea.dispatchEvent(new Event('input', { bubbles: true }));
        });
        await new Promise(r => setTimeout(r, 400));

        // Upload a file
        const fileInput = await page.$('input[type="file"]');
        await fileInput.uploadFile(TEST_FILE_PATH);
        await new Promise(r => setTimeout(r, 500));

        // Content should be from file
        const content = await page.$eval('textarea', el => el.value);
        expect(content).toBe('print("Hello Python")');

        // Should be able to undo back to initial content
        await page.keyboard.down('Control');
        await page.keyboard.press('z');
        await page.keyboard.up('Control');
        await new Promise(r => setTimeout(r, 100));

        const afterUndo = await page.$eval('textarea', el => el.value);
        expect(afterUndo).toBe('initial content');
    });
});
