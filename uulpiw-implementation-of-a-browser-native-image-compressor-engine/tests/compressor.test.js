async function createTestPNG(width, height, hasAlpha = false) {
  const canvas = new OffscreenCanvas(width, height);
  const ctx = canvas.getContext("2d", { alpha: true });

  if (hasAlpha) {
    ctx.fillStyle = "rgba(255, 0, 0, 0.5)";
  } else {
    ctx.fillStyle = "rgb(255, 0, 0)";
  }
  ctx.fillRect(0, 0, width, height);

  return await canvas.convertToBlob({ type: "image/png" });
}

async function compressImageInWorker(blob) {
  return new Promise((resolve, reject) => {
    const worker = new Worker(
      new URL(
        "../repository_after/src/utils/compressor.worker.ts",
        import.meta.url,
      ),
      { type: "module" },
    );

    worker.onmessage = (e) => {
      const { result, error } = e.data;
      if (error) {
        reject(new Error(error));
      } else {
        resolve(result);
      }
      worker.terminate();
    };

    worker.onerror = (error) => {
      reject(error);
      worker.terminate();
    };

    const file = new File([blob], "test.png", { type: blob.type });
    worker.postMessage({
      id: "test",
      file,
      compressionStrength: 0.7,
    });
  });
}

describe("Image Compressor Requirements", () => {
  it("Preserves transparency in PNG images", async () => {
    const inputBlob = await createTestPNG(200, 200, true);
    const inputBitmap = await createImageBitmap(inputBlob);

    const inputCanvas = new OffscreenCanvas(
      inputBitmap.width,
      inputBitmap.height,
    );
    const inputCtx = inputCanvas.getContext("2d", { alpha: true });
    inputCtx.drawImage(inputBitmap, 0, 0);
    const inputData = inputCtx.getImageData(0, 0, 1, 1);

    expect(inputData.data[3]).toBeLessThan(255);

    const result = await compressImageInWorker(inputBlob);
    expect(result.blob.type).toBe("image/png");

    const outputBitmap = await createImageBitmap(result.blob);
    const outputCanvas = new OffscreenCanvas(
      outputBitmap.width,
      outputBitmap.height,
    );
    const outputCtx = outputCanvas.getContext("2d", { alpha: true });
    outputCtx.drawImage(outputBitmap, 0, 0);
    const outputData = outputCtx.getImageData(0, 0, 1, 1);

    expect(outputData.data[3]).toBeLessThan(255);

    inputBitmap.close();
    outputBitmap.close();
  });

  it("Respects EXIF orientation via createImageBitmap", async () => {
    const canvas = new OffscreenCanvas(800, 600);
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "blue";
    ctx.fillRect(0, 0, 800, 600);

    const blob = await canvas.convertToBlob({ type: "image/jpeg" });
    const bitmap = await createImageBitmap(blob);

    expect(bitmap.width).toBe(800);
    expect(bitmap.height).toBe(600);
    expect(typeof bitmap.close).toBe("function");

    bitmap.close();
  });

  it("All exports are PNG format", async () => {
    const jpegBlob = await createTestPNG(100, 100, false);
    const result = await compressImageInWorker(jpegBlob);

    expect(result.blob.type).toBe("image/png");
    expect(result.blob.size).toBeGreaterThan(0);
  });

  it("Enforces minimum 50% file size reduction", async () => {
    const inputBlob = await createTestPNG(800, 800, false);
    const originalSize = inputBlob.size;

    const result = await compressImageInWorker(inputBlob);
    const compressedSize = result.blob.size;
    const savings = ((originalSize - compressedSize) / originalSize) * 100;

    expect(compressedSize).toBeLessThan(originalSize * 0.5);
    expect(savings).toBeGreaterThanOrEqual(50);
    expect(result.compressedSize).toBe(compressedSize);
    expect(result.originalSize).toBe(originalSize);
  });
});
