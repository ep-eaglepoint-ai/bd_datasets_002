const request = require("supertest");
const fs = require("fs");
const fsPromises = require("fs").promises;
const path = require("path");
const { Pool } = require("pg");

const testDir = path.join(__dirname, "test_uploads");
process.env.UPLOAD_DIR = path.join(testDir, "uploads");
process.env.TEMP_DIR = path.join(testDir, "temp");
process.env.THUMBNAIL_DIR = path.join(testDir, "thumbnails");

jest.spyOn(fs, "createReadStream");
jest.spyOn(fs, "createWriteStream");
jest.spyOn(fs, "readFileSync");
jest.spyOn(fs, "writeFileSync");

let app = require("../server");
if (typeof app !== "function") {
  app = "http://localhost:3000";
}
const database = require("../database");
const config = require("../config");
const storage = require("../storage");

describe("File Upload Service Optimization", () => {
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

  test("Req 1: Download should use createReadStream", async () => {
    const filename = "test-download.txt";
    const filePath = path.join(process.env.UPLOAD_DIR, filename);
    fs.writeFileSync(filePath, "Hello World");

    const id = await database.saveUploadRecord({
      filename,
      originalName: "original.txt",
      size: 11,
      mimetype: "text/plain",
      path: filePath,
    });

    const res = await request(app).get(`/uploads/${id}/download`);
    expect(res.status).toBe(200);
    expect(res.text).toBe("Hello World");

    expect(fs.createReadStream).toHaveBeenCalledWith(expect.stringContaining(filename));
    expect(fs.readFileSync).not.toHaveBeenCalledWith(expect.stringContaining(filename));
  });

  test("Req 2, 5, 6: Upload should use streaming (multer diskStorage) and atomic move", async () => {
    const pdfBuffer = Buffer.from("%PDF-1.4\n%junk\n");

    const renameSpy = jest.spyOn(fsPromises, "rename");

    const res = await request(app)
      .post("/uploads")
      .attach("file", pdfBuffer, { filename: "test.pdf", contentType: "application/pdf" });

    expect(res.status).toBe(200);

    const uploadedFilename = res.body.filename;
    const uploadPath = path.join(process.env.UPLOAD_DIR, uploadedFilename);

    expect(fs.existsSync(uploadPath)).toBe(true);
    expect(uploadedFilename).not.toBe("test.pdf");
    expect(fs.createWriteStream).toHaveBeenCalled();
    expect(fs.writeFileSync).not.toHaveBeenCalled();
    expect(renameSpy).toHaveBeenCalledWith(
      expect.stringContaining(process.env.TEMP_DIR),
      expect.stringContaining(process.env.UPLOAD_DIR),
    );

    renameSpy.mockRestore();
  });

  test("Req 3, 9: Image upload triggers async thumbnail generation", async () => {
    const imageBuffer = Buffer.from(
      "/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwD3+iiigD//2Q==",
      "base64",
    );

    const spy = jest.spyOn(storage, "triggerThumbnailGeneration");

    const res = await request(app)
      .post("/uploads")
      .attach("file", imageBuffer, { filename: "test.jpg", contentType: "image/jpeg" });

    expect(res.status).toBe(200);
    expect(res.body.thumbnailStatus).toBe("generating");
    expect(spy).toHaveBeenCalled();

    const thumbFilename = `thumb_${res.body.filename}`;
    const thumbPath = path.join(process.env.THUMBNAIL_DIR, thumbFilename);

    let exists = false;
    for (let i = 0; i < 100; i++) {
      if (fs.existsSync(thumbPath)) {
        exists = true;
        break;
      }
      await new Promise((r) => setTimeout(r, 100));
    }

    if (!exists) {
      const inputPath = path.join(process.env.UPLOAD_DIR, res.body.filename);
      console.log("Worker failed. Input file exists?", fs.existsSync(inputPath), inputPath);
      console.log("Target thumb path:", thumbPath);
    }

    expect(exists).toBe(true);
  }, 12000);

  test("Req 8: Should reject upload if disk space full", async () => {
    const diskSpy = jest.spyOn(storage, "checkDiskSpace").mockRejectedValue(new Error("Disk space full"));

    const res = await request(app).post("/uploads").attach("file", Buffer.from("test"), "test.txt");

    expect(res.status).toBe(507);
    expect(res.body.error).toBe("Disk space full");

    diskSpy.mockRestore();
  });

  test("Req 12: Should reject fake JPG (wrong magic bytes)", async () => {
    const fakeJpg = Buffer.from("This is not a JPG");

    const res = await request(app)
      .post("/uploads")
      .attach("file", fakeJpg, { filename: "fake.jpg", contentType: "image/jpeg" });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/File content check failed/);
  });

  test("Req 10: Request timeout configuration", () => {
    expect(config.requestTimeout).toBeGreaterThanOrEqual(600000);
  });

  test("Req 4: Database uses Pool, not Client per request", () => {
    jest.isolateModules(() => {
      const poolQuery = jest.fn();
      const poolOn = jest.fn();
      const poolEnd = jest.fn();
      const Pool = jest.fn(() => ({ query: poolQuery, on: poolOn, end: poolEnd }));
      const Client = jest.fn();

      jest.doMock("pg", () => ({ Pool, Client }));

      const db = require("../database");

      expect(Pool).toHaveBeenCalledTimes(1);
      expect(Client).not.toHaveBeenCalled();
      expect(db).toBeDefined();
    });
  });

  test("Req 5: Multer uses diskStorage engine", () => {
    jest.isolateModules(() => {
      const diskStorage = jest.fn(() => ({}));
      const multerMock = jest.fn(() => ({
        single: jest.fn(() => (req, res, next) => next()),
        array: jest.fn(() => (req, res, next) => next()),
      }));
      multerMock.diskStorage = diskStorage;

      jest.doMock("multer", () => multerMock);

      require("../upload");

      expect(diskStorage).toHaveBeenCalled();
    });
  });

  test("Req 7: Concurrent uploads with same name get unique filenames", async () => {
    const pdfBuffer = Buffer.from("%PDF-1.4\n%junk\n");

    const res1 = await request(app)
      .post("/uploads")
      .attach("file", pdfBuffer, { filename: "same.pdf", contentType: "application/pdf" });

    const res2 = await request(app)
      .post("/uploads")
      .attach("file", pdfBuffer, { filename: "same.pdf", contentType: "application/pdf" });

    expect(res1.status).toBe(200);
    expect(res2.status).toBe(200);
    expect(res1.body.filename).not.toBe(res2.body.filename);
  });

  test("Req 11: Failed DB insert cleans up files", async () => {
    const beforeUploads = fs.readdirSync(process.env.UPLOAD_DIR);
    const beforeTemp = fs.readdirSync(process.env.TEMP_DIR);

    const dbSpy = jest.spyOn(database, "saveUploadRecord").mockImplementationOnce(() => {
      throw new Error("DB failure");
    });

    const pdfBuffer = Buffer.from("%PDF-1.4\n%junk\n");
    const res = await request(app)
      .post("/uploads")
      .attach("file", pdfBuffer, { filename: "cleanup.pdf", contentType: "application/pdf" });

    expect(res.status).toBe(500);

    const afterUploads = fs.readdirSync(process.env.UPLOAD_DIR);
    const afterTemp = fs.readdirSync(process.env.TEMP_DIR);

    expect(afterUploads.length).toBe(beforeUploads.length);
    expect(afterTemp.length).toBe(beforeTemp.length);

    dbSpy.mockRestore();
  });
});
