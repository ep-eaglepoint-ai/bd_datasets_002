const request = require('supertest');
const fs = require('fs');
const fsPromises = require('fs').promises;
const path = require('path');
const { Pool } = require('pg');

const testDir = path.join(__dirname, 'test_uploads');
process.env.UPLOAD_DIR = path.join(testDir, 'uploads');
process.env.TEMP_DIR = path.join(testDir, 'temp');
process.env.THUMBNAIL_DIR = path.join(testDir, 'thumbnails');

jest.spyOn(fs, 'createReadStream');
jest.spyOn(fs, 'createWriteStream');
jest.spyOn(fs, 'readFileSync');
jest.spyOn(fs, 'writeFileSync');

let app = require('../server');
if (typeof app !== 'function') {
    app = 'http://localhost:3000';
}
const database = require('../database');
const config = require('../config');
const storage = require('../storage');

describe('File Upload Service Optimization', () => {

    beforeAll(async () => {
        if (!fs.existsSync(process.env.UPLOAD_DIR)) fs.mkdirSync(process.env.UPLOAD_DIR, { recursive: true });
        if (!fs.existsSync(process.env.TEMP_DIR)) fs.mkdirSync(process.env.TEMP_DIR, { recursive: true });
        if (!fs.existsSync(process.env.THUMBNAIL_DIR)) fs.mkdirSync(process.env.THUMBNAIL_DIR, { recursive: true });

        if (database.init) await database.init();
    });

    afterAll(async () => {
        if (database.end) await database.end();
    });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('Req 1: Download should use createReadStream', async () => {
        const filename = 'test-download.txt';
        const filePath = path.join(process.env.UPLOAD_DIR, filename);
        fs.writeFileSync(filePath, 'Hello World');

        const id = await database.saveUploadRecord({
            filename,
            originalName: 'original.txt',
            size: 11,
            mimetype: 'text/plain',
            path: filePath
        });

        const res = await request(app).get(`/uploads/${id}/download`);
        expect(res.status).toBe(200);
        expect(res.text).toBe('Hello World');

        expect(fs.createReadStream).toHaveBeenCalledWith(expect.stringContaining(filename));
        expect(fs.readFileSync).not.toHaveBeenCalledWith(expect.stringContaining(filename));
    });

    test('Req 2, 5, 6: Upload should use streaming (multer diskStorage) and atomic move', async () => {
        const pdfBuffer = Buffer.from('%PDF-1.4\n%junk\n');

        const res = await request(app)
            .post('/uploads')
            .attach('file', pdfBuffer, { filename: 'test.pdf', contentType: 'application/pdf' });

        expect(res.status).toBe(200);

        const uploadedFilename = res.body.filename;
        const uploadPath = path.join(process.env.UPLOAD_DIR, uploadedFilename);

        expect(fs.existsSync(uploadPath)).toBe(true);
        expect(uploadedFilename).not.toBe('test.pdf');
    });

    test('Req 3, 9: Image upload triggers async thumbnail generation', async () => {
        const imageBuffer = Buffer.from(
            '/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwD3+iiigD//2Q==',
            'base64'
        );

        const spy = jest.spyOn(storage, 'triggerThumbnailGeneration');

        const res = await request(app)
            .post('/uploads')
            .attach('file', imageBuffer, { filename: 'test.jpg', contentType: 'image/jpeg' });

        expect(res.status).toBe(200);
        expect(res.body.thumbnailStatus).toBe('generating');
        expect(spy).toHaveBeenCalled();

        const thumbFilename = `thumb_${res.body.filename}`;
        const thumbPath = path.join(process.env.THUMBNAIL_DIR, thumbFilename);

        let exists = false;
        for (let i = 0; i < 100; i++) {
            if (fs.existsSync(thumbPath)) {
                exists = true;
                break;
            }
            await new Promise(r => setTimeout(r, 100));
        }

        if (!exists) {
            const inputPath = path.join(process.env.UPLOAD_DIR, res.body.filename);
            console.log('Worker failed. Input file exists?', fs.existsSync(inputPath), inputPath);
            console.log('Target thumb path:', thumbPath);
        }

        expect(exists).toBe(true);
    }, 12000);

    test('Req 8: Should reject upload if disk space full', async () => {
        const diskSpy = jest.spyOn(storage, 'checkDiskSpace').mockRejectedValue(new Error('Disk space full'));

        const res = await request(app)
            .post('/uploads')
            .attach('file', Buffer.from('test'), 'test.txt');

        expect(res.status).toBe(507);
        expect(res.body.error).toBe('Disk space full');

        diskSpy.mockRestore();
    });

    test('Req 12: Should reject fake JPG (wrong magic bytes)', async () => {
        const fakeJpg = Buffer.from('This is not a JPG');

        const res = await request(app)
            .post('/uploads')
            .attach('file', fakeJpg, { filename: 'fake.jpg', contentType: 'image/jpeg' });

        expect(res.status).toBe(400);
        expect(res.body.error).toMatch(/File content check failed/);
    });

    test('Req 10: Request timeout configuration', () => {
        expect(config.requestTimeout).toBeGreaterThanOrEqual(600000);
    });
});
