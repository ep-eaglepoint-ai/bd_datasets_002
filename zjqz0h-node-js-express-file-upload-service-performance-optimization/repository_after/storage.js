const fs = require("fs");
const fsPromises = require("fs").promises;
const path = require("path");
const config = require("./config");
const { Worker } = require("worker_threads");

let thumbnailWorker;

function init() {
  ensureDirectoriesSync();
  if (!thumbnailWorker) {
    thumbnailWorker = new Worker(path.join(__dirname, "thumbnailWorker.js"), {
      env: process.env,
    });
    thumbnailWorker.unref();
  }
}

function ensureDirectoriesSync() {
  if (!fs.existsSync(config.uploadDir)) {
    fs.mkdirSync(config.uploadDir, { recursive: true });
  }
  if (!fs.existsSync(config.tempDir)) {
    fs.mkdirSync(config.tempDir, { recursive: true });
  }
  if (!fs.existsSync(config.thumbnailDir)) {
    fs.mkdirSync(config.thumbnailDir, { recursive: true });
  }
}

async function checkDiskSpace(requiredBytes = 0) {
  try {
    const stats = await fsPromises.statfs(config.uploadDir);
    const available = stats.bavail * stats.bsize;
    const needed = config.diskSpaceMetadata.minFreeSpace + Math.max(0, requiredBytes);
    if (available < needed) {
      throw new Error("Disk space full");
    }
    return true;
  } catch (error) {
    if (error.code === "ENOENT") return true;
    throw error;
  }
}

const MAGIC_NUMBERS = {
  jpg: [0xff, 0xd8, 0xff],
  png: [0x89, 0x50, 0x4e, 0x47],
  gif: [0x47, 0x49, 0x46, 0x38],
  pdf: [0x25, 0x50, 0x44, 0x46],
  zip: [0x50, 0x4b, 0x03, 0x04],
};

async function validateFileContent(filePath, mimetype) {
  const handle = await fsPromises.open(filePath, "r");
  const buffer = Buffer.alloc(8);
  try {
    await handle.read(buffer, 0, 8, 0);
  } finally {
    await handle.close();
  }

  let valid = false;

  if (mimetype === "image/jpeg" || mimetype === "image/jpg") {
    if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) valid = true;
  } else if (mimetype === "image/png") {
    if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) valid = true;
  } else if (mimetype === "image/gif") {
    if (buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x38) valid = true;
  } else if (mimetype === "application/pdf") {
    if (buffer[0] === 0x25 && buffer[1] === 0x50 && buffer[2] === 0x44 && buffer[3] === 0x46) valid = true;
  } else if (mimetype === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
    if (buffer[0] === 0x50 && buffer[1] === 0x4b && buffer[2] === 0x03 && buffer[3] === 0x04) valid = true;
  } else {
    valid = false;
  }

  if (!valid) {
    throw new Error("Invalid file content");
  }
  return true;
}

async function moveFromTempToUploads(tempPath, filename) {
  const targetPath = path.join(config.uploadDir, filename);
  await fsPromises.rename(tempPath, targetPath);
  return targetPath;
}

function getReadStream(filename) {
  const filePath = path.join(config.uploadDir, filename);
  return fs.createReadStream(filePath);
}

async function deleteFile(filename) {
  const filePath = path.join(config.uploadDir, filename);
  try {
    await fsPromises.unlink(filePath);
  } catch (e) {
    if (e.code !== "ENOENT") console.error("Error deleting file", e);
  }
  const thumbPath = path.join(config.thumbnailDir, `thumb_${filename}`);
  try {
    await fsPromises.unlink(thumbPath);
  } catch (e) {}
}

async function deleteTempFile(path) {
  try {
    await fsPromises.unlink(path);
  } catch (e) {}
}

function triggerThumbnailGeneration(filename) {
  if (!thumbnailWorker) init();
  const thumbnailFilename = `thumb_${filename}`;
  thumbnailWorker.postMessage({ filename, thumbnailFilename });
  return thumbnailFilename;
}

async function getStats() {
  const files = await fsPromises.readdir(config.uploadDir);
  let totalSize = 0;
  for (const file of files) {
    try {
      const stats = await fsPromises.stat(path.join(config.uploadDir, file));
      totalSize += stats.size;
    } catch (e) {}
  }
  return {
    fileCount: files.length,
    totalSize,
    uploadDir: config.uploadDir,
  };
}

module.exports = {
  init,
  checkDiskSpace,
  validateFileContent,
  moveFromTempToUploads,
  getReadStream,
  deleteFile,
  deleteTempFile,
  triggerThumbnailGeneration,
  getStats,
};
