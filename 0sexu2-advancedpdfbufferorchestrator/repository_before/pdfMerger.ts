/// <reference types="node" />

import fs from 'fs';
// fs: Node.js File System module.
// Note: Buffer is the global Node.js binary type.

export class PdfMerger {
    // Potential memory leak: references are held indefinitely in this array.
    private tempStorage: Buffer[] = [];

    /**
     * Merges two PDF buffers.
     * BUG: PDF files have complex internal structures (cross-reference tables).
     * Raw binary concatenation results in a corrupted, unreadable file.
     */
    public merge(pdfA: any, pdfB: any): Buffer {
        console.log("Starting merge...");
        // BUG: Using 'any' bypasses type safety.
        // BUG: Raw concatenation is invalid for PDF binary structures.
        const result = Buffer.concat([pdfA, pdfB]);
        this.tempStorage.push(result);
        return result;
    }

    public async addWatermark(data: Buffer, text: string): Promise<Buffer> {
        // BUG: Marked async but performs synchronous addition which is invalid for binary PDFs.
        // BUG: No validation to check if the Buffer contains a valid PDF header (%PDF-).
        return Buffer.concat([data, Buffer.from(text)]);
    }
}