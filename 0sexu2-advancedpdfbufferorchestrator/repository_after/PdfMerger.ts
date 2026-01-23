import { PDFDocument, PDFPage } from 'pdf-lib';
import { InvalidDocumentError, MergeOptions } from './types';

export class PdfMerger {
    /**
     * Merges two PDF buffers with optional page range selection.
     * Uses pdf-lib for binary-safe merging.
     */
    public async merge(pdfA: Buffer, pdfB: Buffer, options?: MergeOptions): Promise<Buffer> {
        try {
            // Validate headers purely to mimic requirement 7 in a basic way, 
            // though pdf-lib load() handles validation better.
            if (!this.isValidPdfHeader(pdfA) || !this.isValidPdfHeader(pdfB)) {
                 throw new InvalidDocumentError('One or more inputs are not valid PDF buffers');
            }

            // Load documents
            // We use { ignoreEncryption: true } if needed, but for now standard load
            const docA = await PDFDocument.load(pdfA, { throwOnInvalidPDF: true });
            const docB = await PDFDocument.load(pdfB, { throwOnInvalidPDF: true });

            // Create a new document
            const mergedPdf = await PDFDocument.create();

            // Copy pages from A
            // Logic for page ranges if implemented would go here.
            // Requirement 4: Page Range Logic
            if (options?.pageRange) {
                 // Complex range parsing would happen here. 
                 // For the scope of this refactor, I will implement a parser logic
                 // But let's copy all pages first as a baseline or handle ranges if provided.
                 await this.copyPagesWithRange(mergedPdf, docA, options.pageRange);
                 await this.copyPagesWithRange(mergedPdf, docB, options.pageRange);
            } else {
                const pagesA = await mergedPdf.copyPages(docA, docA.getPageIndices());
                pagesA.forEach((page: PDFPage) => mergedPdf.addPage(page));

                const pagesB = await mergedPdf.copyPages(docB, docB.getPageIndices());
                pagesB.forEach((page: PDFPage) => mergedPdf.addPage(page));
            }

            const savedBytes = await mergedPdf.save();
            
            // Explicitly clear references if possible? 
            // In JS, variables go out of scope. 
            // We can return a Buffer from the Uint8Array
            return Buffer.from(savedBytes);

        } catch (error) {
             if (error instanceof Error && error.message.includes('Failed to parse PDF')) {
                 throw new InvalidDocumentError();
             }
             throw error;
        }
    }

    public async addWatermark(pdfBuffer: Buffer, text: string): Promise<Buffer> {
        try {
             if (!this.isValidPdfHeader(pdfBuffer)) {
                 throw new InvalidDocumentError('Invalid PDF buffer');
             }

             const pdfDoc = await PDFDocument.load(pdfBuffer);
             const pages = pdfDoc.getPages();
             
             // Requirement 6: Watermark at 45 degree angle
             const { degrees, rgb } = await import('pdf-lib'); // Dynamic import or use top-level
             
             pages.forEach(page => {
                 const { width, height } = page.getSize();
                 page.drawText(text, {
                     x: width / 2 - 50, // rough centering logic
                     y: height / 2,
                     size: 50,
                     color: rgb(0.95, 0.1, 0.1),
                     rotate: degrees(45),
                     opacity: 0.5,
                 });
             });

             const savedBytes = await pdfDoc.save();
             return Buffer.from(savedBytes);
        } catch (error) {
             throw error;
        }
    }

    private isValidPdfHeader(buffer: Buffer): boolean {
        // Basic check for %PDF-
        // Slice first 5 bytes
        if (buffer.length < 5) return false;
        const header = buffer.subarray(0, 5).toString('ascii');
        return header === '%PDF-';
    }

    private async copyPagesWithRange(targetDoc: PDFDocument, sourceDoc: PDFDocument, rangeStr: string): Promise<void> {
        const totalPages = sourceDoc.getPageCount();
        const indicesToCopy: number[] = [];
        
        // Parse range "1-5, 8, 11-12"
        const parts = rangeStr.split(',').map(p => p.trim());
        
        for (const part of parts) {
            if (part.includes('-')) {
                const [start, end] = part.split('-').map(Number);
                // 1-based to 0-based
                for (let i = start; i <= end; i++) {
                    if (i >= 1 && i <= totalPages) {
                        indicesToCopy.push(i - 1);
                    }
                }
            } else {
                const pageNum = Number(part);
                if (pageNum >= 1 && pageNum <= totalPages) {
                    indicesToCopy.push(pageNum - 1);
                }
            }
        }
        
        // Unique indices
        const uniqueIndices = [...new Set(indicesToCopy)];
        
        if (uniqueIndices.length > 0) {
             const copiedPages = await targetDoc.copyPages(sourceDoc, uniqueIndices);
             copiedPages.forEach(page => targetDoc.addPage(page));
        }
    }
}
