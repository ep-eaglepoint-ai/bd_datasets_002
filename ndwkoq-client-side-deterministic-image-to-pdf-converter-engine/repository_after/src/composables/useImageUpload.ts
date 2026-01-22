import { ref, computed } from 'vue'
import type { ImageFile } from '@/types'
import { processImageFiles } from '@/utils/imageProcessor'

export function useImageUpload() {
  const images = ref<ImageFile[]>([])
  const isProcessing = ref(false)
  const processingProgress = ref(0)
  const error = ref<string | null>(null)
  
  const hasImages = computed(() => images.value.length > 0)
  const totalSize = computed(() => 
    images.value.reduce((sum, img) => sum + img.size, 0)
  )
  const formattedTotalSize = computed(() => {
    const bytes = totalSize.value
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  })
  
  /**
   * Adds new image files to the collection
   */
  async function addImages(files: File[]): Promise<void> {
    if (files.length === 0) return
    
    isProcessing.value = true
    processingProgress.value = 0
    error.value = null
    
    try {
      const processedImages = await processImageFiles(
        files,
        (current, total) => {
          processingProgress.value = Math.round((current / total) * 100)
        }
      )
      
      images.value.push(...processedImages)
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to process images'
      throw err
    } finally {
      isProcessing.value = false
      processingProgress.value = 0
    }
  }
  
  /**
   * Removes an image by ID
   */
  function removeImage(id: string): void {
    const index = images.value.findIndex(img => img.id === id)
    if (index !== -1) {
      // Revoke preview URL to prevent memory leaks
      URL.revokeObjectURL(images.value[index].preview)
      images.value.splice(index, 1)
    }
  }
  
  /**
   * Clears all images
   */
  function clearImages(): void {
    // Revoke all preview URLs
    images.value.forEach(img => {
      URL.revokeObjectURL(img.preview)
    })
    images.value = []
    error.value = null
  }
  
  /**
   * Reorders images (for drag and drop)
   */
  function reorderImages(newOrder: ImageFile[]): void {
    images.value = newOrder
  }
  
  /**
   * Moves an image to a new position
   */
  function moveImage(fromIndex: number, toIndex: number): void {
    if (fromIndex === toIndex) return
    
    const item = images.value.splice(fromIndex, 1)[0]
    images.value.splice(toIndex, 0, item)
  }
  
  return {
    images,
    isProcessing,
    processingProgress,
    error,
    hasImages,
    totalSize,
    formattedTotalSize,
    addImages,
    removeImage,
    clearImages,
    reorderImages,
    moveImage
  }
}