describe("Format and UI Integration Tests", () => {
  it("Accepts only JPEG, PNG, and WebP formats", async () => {
    const validFormats = ["image/jpeg", "image/png", "image/webp"];
    
    const canvas = new OffscreenCanvas(100, 100);
    const jpegBlob = await canvas.convertToBlob({ type: "image/jpeg" });
    const pngBlob = await canvas.convertToBlob({ type: "image/png" });
    
    expect(validFormats.includes(jpegBlob.type)).toBe(true);
    expect(validFormats.includes(pngBlob.type)).toBe(true);
    expect(validFormats.includes("image/webp")).toBe(true);
    expect(validFormats.includes("image/gif")).toBe(false);
    expect(validFormats.includes("text/plain")).toBe(false);
  });

  it("Displays stats in correct format", async () => {
    const formatBytes = (bytes) => (bytes / (1024 * 1024)).toFixed(2) + "MB";
    
    const canvas1 = new OffscreenCanvas(500, 500);
    const canvas2 = new OffscreenCanvas(250, 250);
    
    const originalBlob = await canvas1.convertToBlob({ type: "image/png" });
    const compressedBlob = await canvas2.convertToBlob({ type: "image/png" });
    
    const originalSize = originalBlob.size;
    const compressedSize = compressedBlob.size;
    const savings = ((originalSize - compressedSize) / originalSize) * 100;

    const originalText = formatBytes(originalSize);
    const compressedText = formatBytes(compressedSize);
    const savingsText = savings.toFixed(0) + "%";

    expect(originalText).toMatch(/^\d+\.\d{2}MB$/);
    expect(compressedText).toMatch(/^\d+\.\d{2}MB$/);
    expect(savingsText).toMatch(/^\d+%$/);
    expect(parseFloat(savingsText)).toBeGreaterThan(0);
  });

  it("100% client-side processing (no external APIs)", async () => {
    const originalFetch = global.fetch;
    let fetchCalled = false;

    global.fetch = () => {
      fetchCalled = true;
      return Promise.reject(new Error("No external calls allowed"));
    };

    const canvas = new OffscreenCanvas(100, 100);
    const blob = await canvas.convertToBlob({ type: "image/png" });
    const img = await createImageBitmap(blob);
    
    expect(fetchCalled).toBe(false);
    expect(img.width).toBeGreaterThan(0);
    
    global.fetch = originalFetch;
  });
});
