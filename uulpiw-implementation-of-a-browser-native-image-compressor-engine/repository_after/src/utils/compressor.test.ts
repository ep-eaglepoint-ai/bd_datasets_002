import { describe, it, expect, vi, afterEach } from "vitest";
import { compressImage } from "./compressor";

describe("compressImage", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("Initializes worker and handles success", async () => {
    const postMessageSpy = vi.fn();
    const terminateSpy = vi.fn();

    // Mock Worker specific to this test
    const MockWorker = class {
      onmessage: ((event: MessageEvent) => void) | null = null;
      onerror: ((event: ErrorEvent) => void) | null = null;
      postMessage = postMessageSpy.mockImplementation((data) => {
        // Reply immediately
        setTimeout(() => {
          if (this.onmessage) {
            this.onmessage({
              data: {
                id: data.id,
                result: {
                  blob: new Blob(["data"], { type: "image/png" }),
                  width: 100,
                  height: 100,
                  originalSize: 1000,
                  compressedSize: 500,
                  savings: 50,
                },
              },
            } as MessageEvent);
          }
        }, 0);
      });
      terminate = terminateSpy;
    };

    // @ts-ignore
    window.Worker = MockWorker;

    const file = new File(["abc"], "test.png", { type: "image/png" });
    const result = await compressImage(file, 800, 600, 0.5);

    expect(postMessageSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        maxWidth: 800,
        maxHeight: 600,
        compressionStrength: 0.5,
        file,
      }),
    );

    expect(result.width).toBe(100);
    expect(terminateSpy).toHaveBeenCalled();
  });

  it("Handles worker error", async () => {
    const MockWorker = class {
      onmessage: ((event: MessageEvent) => void) | null = null;
      onerror: ((event: ErrorEvent) => void) | null = null;
      postMessage = (data: any) => {
        setTimeout(() => {
          if (this.onmessage) {
            this.onmessage({
              data: {
                id: data.id,
                error: "Compression failed",
              },
            } as MessageEvent);
          }
        }, 0);
      };
      terminate = vi.fn();
    };

    // @ts-ignore
    window.Worker = MockWorker;

    const file = new File(["abc"], "test.png", { type: "image/png" });
    await expect(compressImage(file)).rejects.toThrow("Compression failed");
  });
});
