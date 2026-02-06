const express = require("express");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const { v4: uuidv4 } = require("uuid"); // Req 7
const config = require("./config");
const storage = require("./storage");
const database = require("./database");

const router = express.Router();

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, config.tempDir);
    },
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname);
      const filename = `${uuidv4()}${ext}`;
      cb(null, filename);
    },
  }),
  limits: { fileSize: config.maxFileSize },
});

const cleanupTemp = async (file) => {
  if (file && file.path) {
    await storage.deleteTempFile(file.path);
  }
  if (Array.isArray(file)) {
    for (const f of file) await storage.deleteTempFile(f.path);
  }
};

const cleanupUpload = async (filename) => {
  if (filename) await storage.deleteFile(filename);
};

const checkDiskSpace = async (req, res, next) => {
  try {
    const contentLength = Number(req.headers["content-length"] || 0);
    await storage.checkDiskSpace(contentLength);
    next();
  } catch (error) {
    if (error.message === "Disk space full") {
      return res.status(507).json({ error: "Disk space full" });
    }
    next(error);
  }
};

router.post("/", checkDiskSpace, upload.single("file"), async (req, res) => {
  let uploadedFilename = null;

  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    try {
      await storage.validateFileContent(req.file.path, req.file.mimetype);
    } catch (e) {
      await cleanupTemp(req.file);
      return res.status(400).json({ error: "File content check failed: " + e.message });
    }

    const filename = req.file.filename;
    const finalPath = await storage.moveFromTempToUploads(req.file.path, filename);
    uploadedFilename = filename;
    let thumbnailStatus = "pending";
    if (req.file.mimetype.startsWith("image/")) {
      storage.triggerThumbnailGeneration(filename);
      thumbnailStatus = "generating";
    }

    const uploadId = await database.saveUploadRecord({
      filename: filename,
      originalName: req.file.originalname,
      size: req.file.size,
      mimetype: req.file.mimetype,
      path: finalPath,
    });

    res.json({
      id: uploadId,
      filename: filename,
      size: req.file.size,
      mimetype: req.file.mimetype,
      thumbnailStatus: thumbnailStatus,
    });
  } catch (error) {
    console.error("Upload error:", error);
    if (uploadedFilename) {
      await cleanupUpload(uploadedFilename);
    } else if (req.file) {
      await cleanupTemp(req.file);
    }
    res.status(500).json({ error: "Upload failed" });
  }
});

router.post("/multiple", checkDiskSpace, upload.array("files", 10), async (req, res) => {
  const processed = [];
  const processedIds = [];

  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: "No files uploaded" });
    }

    const results = [];

    for (const file of req.files) {
      try {
        await storage.validateFileContent(file.path, file.mimetype);
      } catch (e) {
        throw new Error(`File ${file.originalname} validation failed`);
      }

      const filename = file.filename;
      const finalPath = await storage.moveFromTempToUploads(file.path, filename);
      processed.push(filename);
      let thumbnailStatus = null;
      if (file.mimetype.startsWith("image/")) {
        storage.triggerThumbnailGeneration(filename);
        thumbnailStatus = "generating";
      }

      const uploadId = await database.saveUploadRecord({
        filename: filename,
        originalName: file.originalname,
        size: file.size,
        mimetype: file.mimetype,
        path: finalPath,
      });
      processedIds.push(uploadId);

      results.push({
        id: uploadId,
        filename: filename,
        size: file.size,
        mimetype: file.mimetype,
        thumbnailStatus: thumbnailStatus,
      });
    }

    res.json({ uploads: results });
  } catch (error) {
    console.error("Multiple upload error:", error);
    for (const f of req.files) {
      const moved = processed.find((p) => p === f.filename);
      if (moved) {
        await cleanupUpload(moved);
      } else {
        await cleanupTemp(f);
      }
    }
    for (const id of processedIds) {
      try {
        await database.deleteUploadRecord(id);
      } catch (e) {
        console.error("Failed to cleanup upload record", id, e);
      }
    }
    res.status(500).json({ error: "Upload failed: " + error.message });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const upload = await database.getUploadById(req.params.id);
    if (!upload) return res.status(404).json({ error: "Upload not found" });
    res.json(upload);
  } catch (error) {
    res.status(500).json({ error: "Failed to get upload" });
  }
});

router.get("/:id/download", async (req, res) => {
  try {
    const upload = await database.getUploadById(req.params.id);
    if (!upload) return res.status(404).json({ error: "Upload not found" });

    const stream = storage.getReadStream(upload.filename);

    res.setHeader("Content-Type", upload.mimetype);
    res.setHeader("Content-Disposition", `attachment; filename="${upload.original_name}"`);
    stream.pipe(res);

    stream.on("error", (err) => {
      console.error("Stream error", err);
      res.end();
    });
  } catch (error) {
    console.error("Download error:", error);
    res.status(500).json({ error: "Download failed" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const upload = await database.getUploadById(req.params.id);
    if (!upload) return res.status(404).json({ error: "Upload not found" });

    await storage.deleteFile(upload.filename);
    await database.deleteUploadRecord(req.params.id);

    res.json({ message: "Upload deleted" });
  } catch (error) {
    console.error("Delete error:", error);
    res.status(500).json({ error: "Delete failed" });
  }
});

router.get("/", async (req, res) => {
  try {
    const uploads = await database.getAllUploads();
    res.json({ uploads });
  } catch (error) {
    res.status(500).json({ error: "Failed to list uploads" });
  }
});

module.exports = router;
