import CompressorWorker from "./compressor.worker?worker";

export interface CompressionResult {
  blob: Blob;
  width: number;
  height: number;
  originalSize: number;
  compressedSize: number;
  savings: number;
}

export function compressImage(
  file: File,
  maxWidth?: number,
  maxHeight?: number,
  compressionStrength: number = 0.7,
): Promise<CompressionResult> {
  return new Promise((resolve, reject) => {
    const worker = new CompressorWorker();
    const id = Math.random().toString(36);

    worker.onmessage = (e: MessageEvent) => {
      const { id: responseId, result, error } = e.data;
      if (responseId !== id) return;

      if (error) {
        reject(new Error(error));
      } else {
        resolve(result);
      }
      worker.terminate();
    };

    worker.onerror = (error: ErrorEvent) => {
      reject(error);
      worker.terminate();
    };

    worker.postMessage({
      id,
      file,
      maxWidth,
      maxHeight,
      compressionStrength,
    });
  });
}
