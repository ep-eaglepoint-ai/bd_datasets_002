const MIN_DIMENSION = 100;
const TARGET_REDUCTION = 0.5;

interface CompressionJob {
  id: string;
  file: File;
  maxWidth?: number;
  maxHeight?: number;
  compressionStrength: number;
}

self.onmessage = async (e: MessageEvent<CompressionJob>) => {
  const { id, file, maxWidth, maxHeight, compressionStrength } = e.data;

  try {
    const result = await compressImage(
      file,
      maxWidth,
      maxHeight,
      compressionStrength,
    );
    self.postMessage({ id, result });
  } catch (error) {
    self.postMessage({
      id,
      error: error instanceof Error ? error.message : "Compression failed",
    });
  }
};

async function compressToWebP(
  canvas: OffscreenCanvas,
  quality: number,
): Promise<Blob> {
  return canvas.convertToBlob({ type: "image/webp", quality });
}

async function convertToPNG(canvas: OffscreenCanvas): Promise<Blob> {
  return canvas.convertToBlob({ type: "image/png" });
}

async function tryCompress(
  img: ImageBitmap,
  targetSize: number,
  scaleFactor: number,
  quality: number,
): Promise<{ blob: Blob; width: number; height: number } | null> {
  const width = Math.max(MIN_DIMENSION, Math.floor(img.width * scaleFactor));
  const height = Math.max(MIN_DIMENSION, Math.floor(img.height * scaleFactor));

  if (width < MIN_DIMENSION || height < MIN_DIMENSION) return null;

  const canvas = new OffscreenCanvas(width, height);
  const ctx = canvas.getContext("2d", { alpha: true });
  if (!ctx) return null;

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, 0, 0, width, height);

  // Apply lossy compression via WebP roundtrip
  const webpBlob = await compressToWebP(canvas, quality);
  if (webpBlob) {
    const webpImg = await createImageBitmap(webpBlob);
    ctx.clearRect(0, 0, width, height);
    ctx.drawImage(webpImg, 0, 0);
    webpImg.close(); // Clean up
  }

  const pngBlob = await convertToPNG(canvas);

  // Clean up context helps? OffscreenCanvas is GC'd.

  if (!pngBlob || pngBlob.size >= targetSize) return null;

  return { blob: pngBlob, width, height };
}

async function compressImage(
  file: File,
  maxWidth?: number,
  maxHeight?: number,
  compressionStrength: number = 0.7,
) {
  // Use createImageBitmap which respects EXIF orientation by default in modern environments
  const img = await createImageBitmap(file);
  const originalSize = file.size;
  const targetSize = originalSize * TARGET_REDUCTION;

  let finalWidth = img.width;
  let finalHeight = img.height;

  if (maxWidth || maxHeight) {
    const aspectRatio = img.width / img.height;
    if (maxWidth && finalWidth > maxWidth) {
      finalWidth = maxWidth;
      finalHeight = Math.floor(maxWidth / aspectRatio);
    }
    if (maxHeight && finalHeight > maxHeight) {
      finalHeight = maxHeight;
      finalWidth = Math.floor(maxHeight * aspectRatio);
    }
  }

  const scaledCanvas = new OffscreenCanvas(finalWidth, finalHeight);
  const scaledCtx = scaledCanvas.getContext("2d", { alpha: true });
  if (!scaledCtx) throw new Error("Canvas not supported");

  scaledCtx.imageSmoothingEnabled = true;
  scaledCtx.imageSmoothingQuality = "high";
  scaledCtx.drawImage(img, 0, 0, finalWidth, finalHeight);

  // Convert scaled canvas to bitmap for efficient re-use
  // Using PNG here to preserve quality before the lossy step
  const scaledBlob = await scaledCanvas.convertToBlob({ type: "image/png" });
  const scaledImg = await createImageBitmap(scaledBlob);

  img.close(); // Release original

  // Progressive retry with expanding ranges until 50% target is met
  let currentScale = 1.0;
  let currentQuality = 0.6;
  const qualityStep = 0.05;
  const scaleStep = 0.05;
  const minQuality = 0.1;
  const minScale = MIN_DIMENSION / Math.max(finalWidth, finalHeight);

  while (currentQuality >= minQuality || currentScale >= minScale) {
    const result = await tryCompress(
      scaledImg,
      targetSize,
      currentScale,
      currentQuality * compressionStrength,
    );
    
    if (result) {
      scaledImg.close();
      return {
        blob: result.blob,
        width: result.width,
        height: result.height,
        originalSize,
        compressedSize: result.blob.size,
        savings: ((originalSize - result.blob.size) / originalSize) * 100,
      };
    }

    // Progressively reduce quality and scale
    currentQuality -= qualityStep;
    if (currentQuality < minQuality) {
      currentQuality = 0.6;
      currentScale -= scaleStep;
    }

    if (currentScale < minScale) break;
  }

  // Final fallback: Ensure 50% reduction by aggressive scaling
  let fallbackScale = 0.4;
  while (fallbackScale >= minScale) {
    const canvas = new OffscreenCanvas(
      Math.max(MIN_DIMENSION, Math.floor(finalWidth * fallbackScale)),
      Math.max(MIN_DIMENSION, Math.floor(finalHeight * fallbackScale)),
    );
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) throw new Error("Canvas not supported");

    ctx.drawImage(scaledImg, 0, 0, canvas.width, canvas.height);
    const fallbackBlob = await convertToPNG(canvas);

    if (fallbackBlob.size < targetSize) {
      scaledImg.close();
      return {
        blob: fallbackBlob,
        width: canvas.width,
        height: canvas.height,
        originalSize,
        compressedSize: fallbackBlob.size,
        savings: ((originalSize - fallbackBlob.size) / originalSize) * 100,
      };
    }

    fallbackScale -= 0.1;
  }

  scaledImg.close();
  throw new Error("Unable to achieve 50% compression target");
}
