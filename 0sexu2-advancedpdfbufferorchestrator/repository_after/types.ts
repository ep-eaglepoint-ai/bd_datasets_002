export interface PdfDocument {
    buffer: Buffer;
    pageCount?: number;
}

export interface MergeOptions {
    pageRange?: string; // e.g., "1-5, 8, 11-12"
}

export class PdfError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'PdfError';
    }
}

export class InvalidDocumentError extends PdfError {
    constructor(message: string = 'Invalid PDF document') {
        super(message);
        this.name = 'InvalidDocumentError';
    }
}

export class MemoryLimitExceededError extends PdfError {
    constructor(message: string = 'Memory limit exceeded') {
        super(message);
        this.name = 'MemoryLimitExceededError';
    }
}
