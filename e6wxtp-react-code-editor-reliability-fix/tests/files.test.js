const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

describe('File Operations', () => {
    let browser;
    let page;
    const APP_URL = process.env.APP_URL || 'http://localhost:3000';
    const TEST_FILE_PATH = path.join(__dirname, 'test_upload.py');

    beforeAll(async () => {
        // Create a dummy file
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
    });

    beforeEach(async () => {
        await page.goto(APP_URL);
    });

    test('Upload file updates code and language', async () => {
        const fileInput = await page.$('input[type="file"]');
        await fileInput.uploadFile(TEST_FILE_PATH);

        // Wait for read
        await new Promise(r => setTimeout(r, 500));

        // Check Content
        const content = await page.$eval('textarea', el => el.value);
        expect(content).toBe('print("Hello Python")');

        // Check Language Select
        const langValue = await page.$eval('select', el => el.value);
        expect(langValue).toBe('python');

        // Check Filename Input - Expects name without extension as per implementation
        const fileName = await page.$eval('input[placeholder="File name"]', el => el.value);
        expect(fileName).toBe('test_upload');
    });

    test('Download triggers download with correct name', async () => {
        // Setup download behavior
        const client = await page.target().createCDPSession();
        const downloadPath = path.join(__dirname, 'downloads');
        if (!fs.existsSync(downloadPath)) fs.mkdirSync(downloadPath);

        await client.send('Page.setDownloadBehavior', {
            behavior: 'allow',
            downloadPath: downloadPath,
        });

        // Type code
        await page.type('textarea', 'console.log("Download Test");');
        // Set Name
        const nameInput = await page.$('input[placeholder="File name"]');
        await nameInput.click();
        await page.keyboard.down('Control');
        await page.keyboard.press('A');
        await page.keyboard.up('Control');
        await page.keyboard.press('Backspace');
        await nameInput.type('my_script');

        // Select JS
        await page.select('select', 'javascript');

        // Click Download
        const downloadBtn = await page.$('button.bg-blue-600');
        await downloadBtn.click();

        // Wait for file to appear – increase timeout as Docker file system can be slow
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

        // Check file handling
        const files = fs.readdirSync(downloadPath);
        const expectedFile = 'my_script.js';
        expect(files).toContain(expectedFile);

        // Clean up
        if (files.includes(expectedFile)) fs.unlinkSync(path.join(downloadPath, expectedFile));
        fs.rmdirSync(downloadPath);
    });
});
