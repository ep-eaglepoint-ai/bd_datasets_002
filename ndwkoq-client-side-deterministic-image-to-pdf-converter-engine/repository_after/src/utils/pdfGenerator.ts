import jsPDF from 'jspdf'
import type { ImageFile, PdfOptions, ConversionProgress } from '@/types'
import { getImageDimensions } from './imageProcessor'

/**
 * Page size configurations in mm
 */
const PAGE_SIZES = {
  A4: { width: 210, height: 297 },
  Letter: { width: 216, height: 279 }
} as const

/**
 * Converts an image file to base64 data URL
 */
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      if (reader.result && typeof reader.result === 'string') {
        resolve(reader.result)
      } else {
        reject(new Error('Failed to convert file to base64'))
      }
    }
    reader.onerror = () => reject(new Error('File reading failed'))
    reader.readAsDataURL(file)
  })
}

/**
 * Calculates optimal image dimensions based on scaling mode
 */
function calculateImageDimensions(
  imageWidth: number,
  imageHeight: number,
  pageWidth: number,
  pageHeight: number,
  scalingMode: PdfOptions['scalingMode']
): { width: number; height: number; x: number; y: number } {
  const margin = 10 // 10mm margin
  const availableWidth = pageWidth - (margin * 2)
  const availableHeight = pageHeight - (margin * 2)
  
  let width: number
  let height: number
  
  switch (scalingMode) {
    case 'original':
      // Use original dimensions, but scale down if too large
      const mmPerPixel = 0.264583 // Convert pixels to mm (96 DPI)
      width = Math.min(imageWidth * mmPerPixel, availableWidth)
      height = Math.min(imageHeight * mmPerPixel, availableHeight)
      break
      
    case 'fill':
      // Fill the entire page, may crop image
      const scaleX = availableWidth / imageWidth
      const scaleY = availableHeight / imageHeight
      const scale = Math.max(scaleX, scaleY)
      width = imageWidth * scale
      height = imageHeight * scale
      break
      
    case 'fit':
    default:
      // Fit entire image within page, maintain aspect ratio
      const fitScaleX = availableWidth / imageWidth
      const fitScaleY = availableHeight / imageHeight
      const fitScale = Math.min(fitScaleX, fitScaleY)
      width = imageWidth * fitScale
      height = imageHeight * fitScale
      break
  }
  
  // Center the image on the page
  const x = (pageWidth - width) / 2
  const y = (pageHeight - height) / 2
  
  return { width, height, x, y }
}

/**
 * Processes images in chunks to avoid blocking the UI
 */
async function processImagesInChunks<T>(
  items: T[],
  processor: (item: T, index: number) => Promise<void>,
  chunkSize: number = 5,
  onProgress?: (current: number, total: number) => void
): Promise<void> {
  for (let i = 0; i < items.length; i += chunkSize) {
    const chunk = items.slice(i, i + chunkSize)
    
    // Process chunk
    await Promise.all(
      chunk.map((item, chunkIndex) => processor(item, i + chunkIndex))
    )
    
    // Report progress
    if (onProgress) {
      onProgress(Math.min(i + chunkSize, items.length), items.length)
    }
    
    // Yield control to prevent UI blocking
    if (i + chunkSize < items.length) {
      await new Promise(resolve => {
        if (window.requestIdleCallback) {
          window.requestIdleCallback(resolve)
        } else {
          setTimeout(resolve, 0)
        }
      })
    }
  }
}

/**
 * Generates PDF from image files with progress tracking
 */
export async function generatePDF(
  images: ImageFile[],
  options: PdfOptions,
  onProgress?: (progress: ConversionProgress) => void
): Promise<Blob> {
  if (images.length === 0) {
    throw new Error('No images provided')
  }
  
  // Determine page dimensions
  let pageWidth: number
  let pageHeight: number
  
  if (options.pageSize === 'Auto') {
    // Use dimensions of first image
    const firstImage = images[0]
    const dimensions = await getImageDimensions(firstImage.compressed || firstImage.file)
    const mmPerPixel = 0.264583 // Convert pixels to mm (96 DPI)
    pageWidth = dimensions.width * mmPerPixel
    pageHeight = dimensions.height * mmPerPixel
  } else {
    const size = PAGE_SIZES[options.pageSize]
    pageWidth = options.orientation === 'landscape' ? size.height : size.width
    pageHeight = options.orientation === 'landscape' ? size.width : size.height
  }
  
  // Create PDF document
  const pdf = new jsPDF({
    orientation: options.orientation,
    unit: 'mm',
    format: options.pageSize === 'Auto' ? [pageWidth, pageHeight] : options.pageSize.toLowerCase() as any
  })
  
  // Process images with progress tracking
  let processedCount = 0
  
  await processImagesInChunks(
    images,
    async (imageFile, index) => {
      try {
        // Report compression progress
        if (onProgress) {
          onProgress({
            current: processedCount,
            total: images.length,
            stage: 'compressing',
            message: `Processing ${imageFile.name}...`
          })
        }
        
        // Use compressed file if available, otherwise original
        const fileToUse = imageFile.compressed || imageFile.file
        
        // Convert to base64
        const base64 = await fileToBase64(fileToUse)
        
        // Get image dimensions
        const dimensions = await getImageDimensions(fileToUse)
        
        // Calculate placement
        const placement = calculateImageDimensions(
          dimensions.width,
          dimensions.height,
          pageWidth,
          pageHeight,
          options.scalingMode
        )
        
        // Add new page for subsequent images
        if (index > 0) {
          pdf.addPage()
        }
        
        // Add image to PDF
        pdf.addImage(
          base64,
          fileToUse.type === 'image/png' ? 'PNG' : 'JPEG',
          placement.x,
          placement.y,
          placement.width,
          placement.height
        )
        
        processedCount++
        
        // Report generation progress
        if (onProgress) {
          onProgress({
            current: processedCount,
            total: images.length,
            stage: 'generating',
            message: `Added ${imageFile.name} to PDF`
          })
        }
      } catch (error) {
        throw new Error(`Failed to process ${imageFile.name}: ${error}`)
      }
    },
    images.length > 10 ? 3 : 5 // Smaller chunks for many images
  )
  
  // Final progress update
  if (onProgress) {
    onProgress({
      current: images.length,
      total: images.length,
      stage: 'complete',
      message: 'PDF generation complete'
    })
  }
  
  // Generate PDF blob
  const pdfBlob = pdf.output('blob')
  return pdfBlob
}

/**
 * Downloads a blob as a file
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename.endsWith('.pdf') ? filename : `${filename}.pdf`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/**
 * Estimates PDF file size based on images
 */
export function estimatePDFSize(images: ImageFile[]): number {
  // Rough estimation: compressed image size + PDF overhead
  const totalImageSize = images.reduce((sum, img) => {
    const fileToUse = img.compressed || img.file
    return sum + fileToUse.size
  }, 0)
  
  // PDF overhead is roughly 10-20% of image data
  const overhead = totalImageSize * 0.15
  return totalImageSize + overhead
}