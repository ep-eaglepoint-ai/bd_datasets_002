import {
  scanDirectory,
  resetProgress,
  getProgress,
  cancelScan,
  isScanCancelled,
  ScanProgress,
  ScanError,
} from "./scanner";
import { prisma } from "./prisma";
import { validateScanPath } from "./pathValidator";

export interface ScanStatus {
  isScanning: boolean;
  currentPath: string;
  status: "idle" | "scanning" | "completed" | "cancelled" | "error";
  error: string | null;
  startTime: Date | null;
  progress: ScanProgress | null;
}

export class ScanManager {
  static isScanning = false;
  static currentPath = "";
  static startTime: Date | null = null;
  static status: ScanStatus["status"] = "idle";
  static error: string | null = null;
  static lastProgress: ScanProgress | null = null;

  static async startScan(dirPath: string): Promise<{ success: boolean; error?: string }> {
    if (this.isScanning) {
      return { success: false, error: "Scan already in progress" };
    }

    // Validate path
    const validation = validateScanPath(dirPath);
    if (!validation.isValid) {
      return { success: false, error: validation.error };
    }

    const normalizedPath = validation.normalizedPath;

    this.isScanning = true;
    this.currentPath = normalizedPath;
    this.startTime = new Date();
    this.status = "scanning";
    this.error = null;
    this.lastProgress = null;

    // Reset scanner progress
    resetProgress();

    // Run in background
    scanDirectory(normalizedPath, this.startTime)
      .then(async () => {
        if (isScanCancelled()) {
          this.status = "cancelled";
          this.isScanning = false;
          this.lastProgress = getProgress();
          return;
        }

        // Cleanup old files that were not seen in this scan
        if (this.startTime) {
          try {
            await prisma.fileRecord.deleteMany({
              where: {
                path: { startsWith: normalizedPath },
                lastScannedAt: { lt: this.startTime },
              },
            });
          } catch (e) {
            console.error("Failed to cleanup old records:", e);
          }
        }

        this.status = "completed";
        this.isScanning = false;
        this.lastProgress = getProgress();
      })
      .catch((err) => {
        console.error("Scan failed:", err);
        this.status = "error";
        this.error = err.message || String(err);
        this.isScanning = false;
        this.lastProgress = getProgress();
      });

    return { success: true };
  }

  static cancelCurrentScan(): boolean {
    if (!this.isScanning) {
      return false;
    }
    cancelScan();
    return true;
  }

  static getStatus(): ScanStatus {
    return {
      isScanning: this.isScanning,
      currentPath: this.currentPath,
      status: this.status,
      error: this.error,
      startTime: this.startTime,
      progress: this.isScanning ? getProgress() : this.lastProgress,
    };
  }

  static getErrors(): ScanError[] {
    const progress = this.isScanning ? getProgress() : this.lastProgress;
    return progress?.errors || [];
  }

  static reset(): void {
    this.isScanning = false;
    this.currentPath = "";
    this.startTime = null;
    this.status = "idle";
    this.error = null;
    this.lastProgress = null;
    resetProgress();
  }
}
