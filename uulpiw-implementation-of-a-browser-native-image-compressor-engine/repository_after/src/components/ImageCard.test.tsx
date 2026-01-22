import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { ImageCard } from "./ImageCard";

describe("ImageCard", () => {
  const mockFile = new File(["dummy"], "test.png", { type: "image/png" });

  it("Requirement 3: UI clearly displays stats in the required format", () => {
    const result = {
      blob: new Blob(["c".repeat(900 * 1024)]),
      width: 800,
      height: 600,
      originalSize: 2 * 1024 * 1024,
      compressedSize: 0.9 * 1024 * 1024,
      savings: 55,
    };

    render(
      <ImageCard
        file={mockFile}
        preview="mock-preview-url"
        result={result}
        status="done"
      />,
    );

    expect(screen.getByText(/Original: 2.00MB/)).toBeInTheDocument();
    expect(screen.getByText(/Compressed: 0.90MB/)).toBeInTheDocument();
    expect(screen.getByText(/Saved: 55%/)).toBeInTheDocument();
  });

  it("Displays error state correctly", () => {
    render(
      <ImageCard
        file={mockFile}
        preview="mock-preview-url"
        result={null}
        status="error"
        error="Compression failed"
      />,
    );

    expect(screen.getByText("Compression failed")).toBeInTheDocument();
  });

  it("Displays processing state correctly", () => {
    render(
      <ImageCard
        file={mockFile}
        preview="mock-preview-url"
        result={null}
        status="processing"
      />,
    );

    expect(screen.getByText("Compressing...")).toBeInTheDocument();
  });
});
