import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import App from "./App";

describe("App", () => {
  beforeEach(() => {
    // Default mock worker implementation
    class Worker {
      url: string;
      onmessage: ((event: MessageEvent) => void) | null = null;
      onerror: ((event: ErrorEvent) => void) | null = null;

      constructor(stringUrl: string) {
        this.url = stringUrl;
      }

      postMessage(data: any) {
        // Simulate async work with real timeout
        setTimeout(() => {
          if (this.onmessage) {
            // Echo back success with mock result
            this.onmessage({
              data: {
                id: data.id,
                result: {
                  blob: new Blob(["c"], { type: "image/png" }),
                  width: 100,
                  height: 100,
                  originalSize: 1000,
                  compressedSize: 500,
                  savings: 50,
                },
              },
            } as MessageEvent);
          }
        }, 50);
      }

      terminate() {}
    }
    // @ts-ignore
    window.Worker = Worker;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("Requirement 6: Accepts jpeg, png, and webp", async () => {
    render(<App />);

    const fileInput = screen.getByLabelText(/Select Images/i);
    const jpegFile = new File(["a"], "test.jpeg", { type: "image/jpeg" });
    const pngFile = new File(["b"], "test.png", { type: "image/png" });
    const webpFile = new File(["c"], "test.webp", { type: "image/webp" });
    const txtFile = new File(["d"], "test.txt", { type: "text/plain" });

    // Upload mixed files
    fireEvent.change(fileInput, {
      target: { files: [jpegFile, pngFile, webpFile, txtFile] },
    });

    // Should process valid images
    await waitFor(
      () => {
        expect(screen.getByText("test.jpeg")).toBeInTheDocument();
        expect(screen.getByText("test.png")).toBeInTheDocument();
        expect(screen.getByText("test.webp")).toBeInTheDocument();
      },
      { timeout: 2000 },
    );

    // Should ignore non-image files
    expect(screen.queryByText("test.txt")).not.toBeInTheDocument();
  });

  it("Requirement 4: Handles multiple files asynchronously (Main thread check)", async () => {
    render(<App />);
    const fileInput = screen.getByLabelText(/Select Images/i);

    // Create 5 files
    const files = Array.from(
      { length: 5 },
      (_, i) => new File(["x"], `img${i}.png`, { type: "image/png" }),
    );

    // Start processing
    fireEvent.change(fileInput, { target: { files } });

    // All should be in "Compressing..." state initially
    await waitFor(() => {
      expect(screen.getAllByText("Compressing...")).toHaveLength(5);
    });

    // Wait for completion (real time)
    await waitFor(
      () => {
        // 5 "Original: ..." / stats lines implies 5 completions
        expect(screen.getAllByText(/Original:/)).toHaveLength(5);
      },
      { timeout: 3000 },
    );
  });
});
