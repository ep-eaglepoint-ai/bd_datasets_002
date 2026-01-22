<template>
  <div class="app">
    <header class="app-header">
      <h1 class="app-title">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="title-icon">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <polyline points="14,2 14,8 20,8"/>
          <line x1="16" y1="13" x2="8" y2="13"/>
          <line x1="16" y1="17" x2="8" y2="17"/>
          <polyline points="10,9 9,9 8,9"/>
        </svg>
        Image to PDF Converter
      </h1>
      <p class="app-description">
        Convert your images to PDF with drag-and-drop simplicity. 
        Fully client-side, no uploads required.
      </p>
    </header>

    <main class="app-main">
      <!-- File Upload Section -->
      <section class="upload-section">
        <FileUpload
          :images="images"
          :is-processing="isProcessing"
          :processing-progress="processingProgress"
          :error="uploadError"
          :formatted-total-size="formattedTotalSize"
          @upload="handleFileUpload"
        />
      </section>

      <!-- Image Preview Section -->
      <section v-if="hasImages" class="preview-section">
        <div class="section-header">
          <h2 class="section-title">Image Preview</h2>
          <div class="section-actions">
            <button
              class="btn btn-secondary"
              @click="clearImages"
              :disabled="isProcessing || isGenerating"
            >
              Clear All
            </button>
          </div>
        </div>
        
        <ImagePreview
          :images="images"
          @remove="removeImage"
          @reorder="reorderImages"
        />
      </section>

      <!-- PDF Options Section -->
      <section v-if="hasImages" class="options-section">
        <PdfOptions
          v-model:options="pdfOptions"
          :image-count="images.length"
          :estimated-size="getEstimatedSize(images)"
        />
      </section>

      <!-- Conversion Progress -->
      <section v-if="isGenerating || progress" class="progress-section">
        <ConversionProgress
          :progress="progress"
          :progress-percentage="progressPercentage"
          :is-generating="isGenerating"
        />
      </section>

      <!-- Convert Button -->
      <section v-if="hasImages && !isGenerating" class="convert-section">
        <button
          class="btn btn-primary convert-button"
          :disabled="!canConvert"
          @click="handleConvert"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="7,10 12,15 17,10"/>
            <line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
          Convert to PDF
        </button>
        
        <p class="convert-info">
          {{ images.length }} image{{ images.length !== 1 ? 's' : '' }} will be converted to PDF
        </p>
      </section>

      <!-- Error Display -->
      <section v-if="conversionError" class="error-section">
        <div class="error-message">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <line x1="15" y1="9" x2="9" y2="15"/>
            <line x1="9" y1="9" x2="15" y2="15"/>
          </svg>
          <div>
            <strong>Conversion Failed</strong>
            <p>{{ conversionError }}</p>
          </div>
        </div>
        <button
          class="btn btn-secondary"
          @click="resetConversionState"
        >
          Try Again
        </button>
      </section>
    </main>

    <footer class="app-footer">
      <p>
        Built with Vue 3 and jsPDF. 
        <a href="https://github.com" target="_blank" rel="noopener noreferrer">
          View Source
        </a>
      </p>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { PdfOptions } from '@/types'
import { useImageUpload } from '@/composables/useImageUpload'
import { usePdfGeneration } from '@/composables/usePdfGeneration'
import FileUpload from '@/components/FileUpload.vue'
import ImagePreview from '@/components/ImagePreview.vue'
import PdfOptions from '@/components/PdfOptions.vue'
import ConversionProgress from '@/components/ConversionProgress.vue'

// Image upload composable
const {
  images,
  isProcessing,
  processingProgress,
  error: uploadError,
  hasImages,
  formattedTotalSize,
  addImages,
  removeImage,
  clearImages,
  reorderImages
} = useImageUpload()

// PDF generation composable
const {
  isGenerating,
  progress,
  progressPercentage,
  error: conversionError,
  generateAndDownloadPDF,
  getEstimatedSize,
  resetState: resetConversionState
} = usePdfGeneration()

// PDF options
const pdfOptions = ref<PdfOptions>({
  pageSize: 'A4',
  orientation: 'portrait',
  scalingMode: 'fit',
  filename: ''
})

// Computed properties
const canConvert = computed(() => {
  return hasImages.value && 
         !isProcessing.value && 
         !isGenerating.value && 
         pdfOptions.value.filename.trim() !== ''
})

// Event handlers
async function handleFileUpload(files: File[]) {
  try {
    await addImages(files)
  } catch (error) {
    console.error('Failed to upload files:', error)
  }
}

async function handleConvert() {
  if (!canConvert.value) return
  
  try {
    await generateAndDownloadPDF(images.value, pdfOptions.value)
  } catch (error) {
    console.error('Failed to convert to PDF:', error)
  }
}
</script>

<style scoped>
.app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 1rem;
}

.app-header {
  text-align: center;
  padding: 2rem 0;
  border-bottom: 1px solid #e5e7eb;
  margin-bottom: 2rem;
}

.app-title {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  font-size: 2rem;
  font-weight: 700;
  color: #1f2937;
  margin-bottom: 0.5rem;
}

.title-icon {
  color: #007bff;
}

.app-description {
  color: #6b7280;
  font-size: 1.125rem;
  max-width: 600px;
  margin: 0 auto;
  line-height: 1.6;
}

.app-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.section-title {
  font-size: 1.5rem;
  font-weight: 600;
  color: #1f2937;
  margin: 0;
}

.section-actions {
  display: flex;
  gap: 0.5rem;
}

.convert-section {
  text-align: center;
  padding: 2rem;
  background: white;
  border-radius: 0.5rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.convert-button {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 1.125rem;
  padding: 1rem 2rem;
  margin-bottom: 0.5rem;
}

.convert-info {
  color: #6b7280;
  font-size: 0.875rem;
  margin: 0;
}

.error-section {
  text-align: center;
  padding: 1.5rem;
}

.error-message {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 1rem;
  background-color: #fef2f2;
  color: #dc2626;
  border-radius: 0.375rem;
  margin-bottom: 1rem;
  text-align: left;
}

.error-message strong {
  display: block;
  margin-bottom: 0.25rem;
}

.error-message p {
  margin: 0;
  font-size: 0.875rem;
}

.app-footer {
  text-align: center;
  padding: 2rem 0;
  border-top: 1px solid #e5e7eb;
  margin-top: 2rem;
  color: #6b7280;
  font-size: 0.875rem;
}

.app-footer a {
  color: #007bff;
  text-decoration: none;
}

.app-footer a:hover {
  text-decoration: underline;
}

@media (prefers-color-scheme: dark) {
  .app-header {
    border-bottom-color: #4b5563;
  }
  
  .app-title {
    color: #f3f4f6;
  }
  
  .app-description {
    color: #d1d5db;
  }
  
  .section-title {
    color: #f3f4f6;
  }
  
  .convert-section {
    background: #2d3748;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
  }
  
  .convert-info {
    color: #d1d5db;
  }
  
  .error-message {
    background-color: #7f1d1d;
    color: #fca5a5;
  }
  
  .app-footer {
    border-top-color: #4b5563;
    color: #d1d5db;
  }
  
  .app-footer a {
    color: #60a5fa;
  }
}

@media (max-width: 768px) {
  .app {
    padding: 0 0.5rem;
  }
  
  .app-header {
    padding: 1.5rem 0;
  }
  
  .app-title {
    font-size: 1.5rem;
    flex-direction: column;
    gap: 0.5rem;
  }
  
  .app-description {
    font-size: 1rem;
  }
  
  .section-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 1rem;
  }
  
  .convert-section {
    padding: 1.5rem 1rem;
  }
  
  .convert-button {
    font-size: 1rem;
    padding: 0.875rem 1.5rem;
  }
}
</style>