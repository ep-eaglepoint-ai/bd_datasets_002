export interface ImageFile {
  id: string
  file: File
  preview: string
  name: string
  size: number
  type: string
  compressed?: File
}

export interface PdfOptions {
  pageSize: 'A4' | 'Letter' | 'Auto'
  orientation: 'portrait' | 'landscape'
  scalingMode: 'fit' | 'fill' | 'original'
  filename: string
}

export interface ConversionProgress {
  current: number
  total: number
  stage: 'compressing' | 'generating' | 'complete'
  message: string
}

export interface CompressionOptions {
  maxSizeMB: number
  maxWidthOrHeight: number
  useWebWorker: boolean
  quality: number
}