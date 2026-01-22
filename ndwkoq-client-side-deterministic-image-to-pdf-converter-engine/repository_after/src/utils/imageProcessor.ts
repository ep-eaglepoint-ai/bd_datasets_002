import imageCompression from 'browser-image-compression'
import type { ImageFile, CompressionOptions } from '@/types'

/**
 * Validates if a file is a supported image type
 */
export function isValidImageFile(file: File): boolean {
  const supportedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
  return supportedTypes.includes(file.type.toLowerCase())
}

/**
 * Validates file size (max 50MB per requirement)
 */
export function isValidFileSize(file: File): boolean {
  const maxSizeBytes = 50 * 1024 * 1024 // 50MB
  return file.size <= maxSizeBytes
}

/**
 * Creates a preview URL for an image file
 */
export function createImagePreview(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      if (e.target?.result) {
        resolve(e.target.result as string)
      } else {
        reject(new Error('Failed to create preview'))
      }
    }
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsDataURL(file)
  })
}

/**
 * Compresses an image file to optimize memory usage
 */
export async function compressImage(
  file: File,
  options: CompressionOptions = {
    maxSizeMB: 5,
    maxWidthOrHeight: 2048,
    useWebWorker: true,
    quality: 0.8
  }
): Promise<File> {
  try {
    // If file is already small enough, return as-is
    if (file.size <= options.maxSizeMB * 1024 * 1024) {
      return file
    }

    const compressedFile = await imageCompression(file, {
      maxSizeMB: options.maxSizeMB,
      maxWidthOrHeight: options.maxWidthOrHeight,
      useWebWorker: options.useWebWorker,
      initialQuality: options.quality
    })

    return compressedFile
  } catch (error) {
    console.warn('Compression failed, using original file:', error)
    return file
  }
}

/**
 * Processes multiple image files with compression and validation
 */
export async function processImageFiles(
  files: File[],
  onProgress?: (current: number, total: number) => void
): Promise<ImageFile[]> {
  const processedImages: ImageFile[] = []
  
  for (let i = 0; i < files.length; i++) {
    const file = files[i]
    
    // Validate file type
    if (!isValidImageFile(file)) {
      throw new Error(`Unsupported file type: ${file.name}`)
    }
    
    // Validate file size
    if (!isValidFileSize(file)) {
      throw new Error(`File too large (max 50MB): ${file.name}`)
    }
    
    try {
      // Create preview
      const preview = await createImagePreview(file)
      
      // Compress image
      const compressed = await compressImage(file)
      
      // Create ImageFile object
      const imageFile: ImageFile = {
        id: `${Date.now()}-${i}-${Math.random().toString(36).substr(2, 9)}`,
        file,
        preview,
        name: file.name,
        size: file.size,
        type: file.type,
        compressed
      }
      
      processedImages.push(imageFile)
      
      // Report progress
      if (onProgress) {
        onProgress(i + 1, files.length)
      }
    } catch (error) {
      throw new Error(`Failed to process ${file.name}: ${error}`)
    }
  }
  
  return processedImages
}

/**
 * Gets image dimensions from a file
 */
export function getImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve({
        width: img.naturalWidth,
        height: img.naturalHeight
      })
    }
    
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Failed to load image'))
    }
    
    img.src = url
  })
}

/**
 * Resizes an image using canvas to fit within specified dimensions
 */
export function resizeImage(
  file: File,
  maxWidth: number,
  maxHeight: number,
  quality: number = 0.8
): Promise<File> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    
    if (!ctx) {
      reject(new Error('Canvas context not available'))
      return
    }
    
    img.onload = () => {
      const { width, height } = img
      
      // Calculate new dimensions maintaining aspect ratio
      let newWidth = width
      let newHeight = height
      
      if (width > maxWidth) {
        newWidth = maxWidth
        newHeight = (height * maxWidth) / width
      }
      
      if (newHeight > maxHeight) {
        newHeight = maxHeight
        newWidth = (width * maxHeight) / height
      }
      
      // Set canvas dimensions
      canvas.width = newWidth
      canvas.height = newHeight
      
      // Draw resized image
      ctx.drawImage(img, 0, 0, newWidth, newHeight)
      
      // Convert to blob
      canvas.toBlob(
        (blob) => {
          if (blob) {
            const resizedFile = new File([blob], file.name, {
              type: file.type,
              lastModified: Date.now()
            })
            resolve(resizedFile)
          } else {
            reject(new Error('Failed to create resized image'))
          }
        },
        file.type,
        quality
      )
    }
    
    img.onerror = () => reject(new Error('Failed to load image'))
    img.src = URL.createObjectURL(file)
  })
}