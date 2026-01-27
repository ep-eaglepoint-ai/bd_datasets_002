import fs from "fs/promises";
import { createReadStream, Stats } from "fs";
import path from "path";
import crypto from "crypto";
import { prisma } from "./prisma";
import pLimit from "p-limit";

const CONCURRENCY_LIMIT = 20;
const limit = pLimit(CONCURRENCY_LIMIT);

// Track visited directories to prevent symlink cycles
const visitedDirs = new Set<string>();

// Scan progress tracking
export interface ScanProgress {
  filesScanned: number;
  directoriesScanned: number;
  errors: ScanError[];
  currentPath: string;
}

export interface ScanError {
  path: string;
  error: string;
  type: "permission" | "symlink_cycle" | "read_error" | "hash_error" | "unknown";
}

// Global progress state for current scan
let currentProgress: ScanProgress = {
  filesScanned: 0,
  directoriesScanned: 0,
  errors: [],
  currentPath: "",
};

let scanCancelled = false;

export function resetProgress(): void {
  currentProgress = {
    filesScanned: 0,
    directoriesScanned: 0,
    errors: [],
    currentPath: "",
  };
  visitedDirs.clear();
  scanCancelled = false;
}

export function getProgress(): ScanProgress {
  return { ...currentProgress };
}

export function cancelScan(): void {
  scanCancelled = true;
}

export function isScanCancelled(): boolean {
  return scanCancelled;
}

// Helper to safely stat a file/directory with symlink detection
const safeLstat = async (
  filePath: string,
): Promise<{ stats: Stats | null; isSymlink: boolean }> => {
  try {
    const lstats = await fs.lstat(filePath);
    return {
      stats: lstats,
      isSymlink: lstats.isSymbolicLink(),
    };
  } catch (error: any) {
    if (error.code === "EACCES" || error.code === "EPERM") {
      currentProgress.errors.push({
        path: filePath,
        error: `Permission denied: ${error.message}`,
        type: "permission",
      });
    } else {
      currentProgress.errors.push({
        path: filePath,
        error: error.message || String(error),
        type: "unknown",
      });
    }
    return { stats: null, isSymlink: false };
  }
};

// Get real path for symlink cycle detection
const safeRealpath = async (filePath: string): Promise<string | null> => {
  try {
    return await fs.realpath(filePath);
  } catch {
    return null;
  }
};

const getFileHash = (filePath: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash("sha256");
    const stream = createReadStream(filePath);
    stream.on("error", (err) => reject(err));
    stream.on("data", (chunk) => hash.update(chunk));
    stream.on("end", () => resolve(hash.digest("hex")));
  });
};

// Get MIME type based on extension
const getMimeType = (extension: string): string => {
  const mimeTypes: Record<string, string> = {
    ".txt": "text/plain",
    ".html": "text/html",
    ".htm": "text/html",
    ".css": "text/css",
    ".js": "application/javascript",
    ".json": "application/json",
    ".xml": "application/xml",
    ".pdf": "application/pdf",
    ".doc": "application/msword",
    ".docx":
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ".xls": "application/vnd.ms-excel",
    ".xlsx":
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ".ppt": "application/vnd.ms-powerpoint",
    ".pptx":
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    ".zip": "application/zip",
    ".rar": "application/x-rar-compressed",
    ".7z": "application/x-7z-compressed",
    ".tar": "application/x-tar",
    ".gz": "application/gzip",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".gif": "image/gif",
    ".bmp": "image/bmp",
    ".svg": "image/svg+xml",
    ".webp": "image/webp",
    ".ico": "image/x-icon",
    ".mp3": "audio/mpeg",
    ".wav": "audio/wav",
    ".ogg": "audio/ogg",
    ".mp4": "video/mp4",
    ".webm": "video/webm",
    ".avi": "video/x-msvideo",
    ".mov": "video/quicktime",
    ".mkv": "video/x-matroska",
    ".ts": "text/typescript",
    ".tsx": "text/typescript-jsx",
    ".jsx": "text/javascript-jsx",
    ".py": "text/x-python",
    ".rb": "text/x-ruby",
    ".java": "text/x-java",
    ".c": "text/x-c",
    ".cpp": "text/x-c++",
    ".h": "text/x-c",
    ".md": "text/markdown",
    ".yaml": "text/yaml",
    ".yml": "text/yaml",
  };
  return mimeTypes[extension.toLowerCase()] || "application/octet-stream";
};

export async function scanFile(filePath: string, scanTime: Date) {
  if (scanCancelled) return;

  currentProgress.currentPath = filePath;

  const { stats, isSymlink } = await safeLstat(filePath);
  if (!stats) return; // Skip if can't access

  // Skip symlinks to files (we only follow directory symlinks with cycle detection)
  if (isSymlink && !stats.isDirectory()) {
    // For file symlinks, we could optionally index the symlink itself
    // For now, skip them to avoid confusion
    return;
  }

  if (stats.isDirectory()) {
    return; // Only indexing files, directories handled in recursion
  }

  // Check if file exists in DB
  const existing = await prisma.fileRecord.findUnique({
    where: { path: filePath },
  });

  const mtime = stats.mtime;
  const size = BigInt(stats.size);
  const extension = path.extname(filePath).toLowerCase();
  const filename = path.basename(filePath);
  const mimeType = getMimeType(extension);

  let hash = existing?.hash || null;
  let shouldHash = false;

  if (!existing) {
    shouldHash = true;
  } else if (
    existing.updatedAt.getTime() !== mtime.getTime() ||
    existing.size !== size
  ) {
    shouldHash = true; // Content potentially changed
  }

  if (shouldHash) {
    try {
      hash = await getFileHash(filePath);
    } catch (e: any) {
      currentProgress.errors.push({
        path: filePath,
        error: `Failed to hash: ${e.message}`,
        type: "hash_error",
      });
    }
  }

  // Move Detection: If this is a new file (by path) but has a hash, check if it matches a "missing" file
  if (!existing && hash) {
    const candidates = await prisma.fileRecord.findMany({
      where: { hash },
    });

    for (const candidate of candidates) {
      if (candidate.path === filePath) continue;

      // Check if candidate actually exists on disk
      const { stats: candidateStat } = await safeLstat(candidate.path);
      if (!candidateStat) {
        // Candidate is missing, assume this file is a rename/move of candidate
        // Update the existing record instead of creating new one
        await prisma.fileRecord.update({
          where: { id: candidate.id },
          data: {
            path: filePath,
            filename,
            extension,
            size,
            updatedAt: mtime,
            lastScannedAt: scanTime,
            hash,
            mimeType,
          },
        });
        currentProgress.filesScanned++;
        return; // Stop processing, we reused the record
      }
    }
  }

  await prisma.fileRecord.upsert({
    where: { path: filePath },
    update: {
      filename,
      extension,
      size,
      updatedAt: mtime,
      lastScannedAt: scanTime,
      hash,
      mimeType,
    },
    create: {
      path: filePath,
      filename,
      extension,
      size,
      updatedAt: mtime,
      createdAt: stats.birthtime,
      lastScannedAt: scanTime,
      hash,
      mimeType,
    },
  });

  currentProgress.filesScanned++;
}

// Recursive scanner with limited concurrency and symlink cycle detection
export async function scanDirectory(
  dirPath: string,
  scanTime: Date = new Date(),
): Promise<void> {
  if (scanCancelled) return;

  currentProgress.currentPath = dirPath;

  // Get real path for cycle detection
  const realPath = await safeRealpath(dirPath);
  if (!realPath) {
    currentProgress.errors.push({
      path: dirPath,
      error: "Could not resolve real path",
      type: "read_error",
    });
    return;
  }

  // Check for symlink cycles
  if (visitedDirs.has(realPath)) {
    currentProgress.errors.push({
      path: dirPath,
      error: `Symlink cycle detected (already visited: ${realPath})`,
      type: "symlink_cycle",
    });
    return;
  }

  visitedDirs.add(realPath);
  currentProgress.directoriesScanned++;

  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });

    // Process files in parallel
    const filePromises = entries
      .filter((entry) => entry.isFile() || entry.isSymbolicLink())
      .map((entry) => {
        const fullPath = path.join(dirPath, entry.name);
        return limit(() =>
          scanFile(fullPath, scanTime).catch((e) => {
            currentProgress.errors.push({
              path: fullPath,
              error: e.message || String(e),
              type: "unknown",
            });
          }),
        );
      });

    await Promise.all(filePromises);

    if (scanCancelled) return;

    // Process directories (including symlinks to directories)
    const dirPromises = entries
      .filter((entry) => entry.isDirectory())
      .map((entry) => {
        const fullPath = path.join(dirPath, entry.name);
        return scanDirectory(fullPath, scanTime);
      });

    // Also check symlinks that point to directories
    const symlinkPromises = entries
      .filter((entry) => entry.isSymbolicLink())
      .map(async (entry) => {
        const fullPath = path.join(dirPath, entry.name);
        const { stats } = await safeLstat(fullPath);
        if (stats) {
          // Check if symlink points to directory
          try {
            const targetStats = await fs.stat(fullPath);
            if (targetStats.isDirectory()) {
              return scanDirectory(fullPath, scanTime);
            }
          } catch {
            // Broken symlink, skip
          }
        }
      });

    await Promise.all([...dirPromises, ...symlinkPromises]);
  } catch (error: any) {
    if (error.code === "EACCES" || error.code === "EPERM") {
      currentProgress.errors.push({
        path: dirPath,
        error: `Permission denied: ${error.message}`,
        type: "permission",
      });
    } else {
      currentProgress.errors.push({
        path: dirPath,
        error: error.message || String(error),
        type: "read_error",
      });
    }
  }
}
