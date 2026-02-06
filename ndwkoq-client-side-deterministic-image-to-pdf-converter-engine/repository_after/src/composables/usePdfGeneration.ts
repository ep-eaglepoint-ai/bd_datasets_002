import { ref, computed } from 'vue'
import type { ImageFile, PdfOptions, ConversionProgress } from '@/types'
import { generatePDF, downloadBlob, estimatePDFSize } from '@/utils/pdfGenerator'

export function usePdfGeneration() {
  const isGenerating = ref(false)
  const progress = ref<ConversionProgress | null>(null)
  const error = ref<string | null>(null)
  
  const progressPercentage = computed(() => {
    if (!progress.value) return 0
    return Math.round((progress.value.current / progress.value.total) * 100)
  })
  
  /**
   * Generates and downloads a PDF from images
   */
  async function generateAndDownloadPDF(
    images: ImageFile[],
    options: PdfOptions
  ): Promise<void> {
    if (images.length === 0) {
      throw new Error('No images to convert')
    }
    
    isGenerating.value = true
    error.value = null
    progress.value = {
      current: 0,
      total: images.length,
      stage: 'compressing',
      message: 'Starting conversion...'
    }
    
    try {
      const pdfBlob = await generatePDF(
        images,
        options,
        (progressUpdate) => {
          progress.value = progressUpdate
        }
      )
      
      // Download the generated PDF
      downloadBlob(pdfBlob, options.filename)
      
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to generate PDF'
      throw err
    } finally {
      isGenerating.value = false
      progress.value = null
    }
  }
  
  /**
   * Estimates the final PDF file size
   */
  function getEstimatedSize(images: ImageFile[]): string {
    const bytes = estimatePDFSize(images)
    if (bytes === 0) return '0 B'
    
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }
  
  /**
   * Resets the generation state
   */
  function resetState(): void {
    isGenerating.value = false
    progress.value = null
    error.value = null
  }
  
  return {
    isGenerating,
    progress,
    progressPercentage,
    error,
    generateAndDownloadPDF,
    getEstimatedSize,
    resetState
  }
}