<template>
  <div class="pdf-options">
    <h3 class="options-title">PDF Options</h3>
    
    <div class="options-grid">
      <!-- Page Size -->
      <div class="form-group">
        <label for="pageSize" class="form-label">Page Size</label>
        <select
          id="pageSize"
          v-model="localOptions.pageSize"
          class="form-control"
        >
          <option value="A4">A4 (210 × 297 mm)</option>
          <option value="Letter">Letter (8.5 × 11 in)</option>
          <option value="Auto">Auto-fit to image</option>
        </select>
      </div>
      
      <!-- Orientation -->
      <div class="form-group">
        <label for="orientation" class="form-label">Orientation</label>
        <select
          id="orientation"
          v-model="localOptions.orientation"
          class="form-control"
          :disabled="localOptions.pageSize === 'Auto'"
        >
          <option value="portrait">Portrait</option>
          <option value="landscape">Landscape</option>
        </select>
      </div>
      
      <!-- Scaling Mode -->
      <div class="form-group">
        <label for="scalingMode" class="form-label">Image Scaling</label>
        <select
          id="scalingMode"
          v-model="localOptions.scalingMode"
          class="form-control"
        >
          <option value="fit">Fit (maintain aspect ratio)</option>
          <option value="fill">Fill (may crop image)</option>
          <option value="original">Original size</option>
        </select>
      </div>
      
      <!-- Filename -->
      <div class="form-group filename-group">
        <label for="filename" class="form-label">Output Filename</label>
        <div class="filename-input-group">
          <input
            id="filename"
            v-model="localOptions.filename"
            type="text"
            class="form-control filename-input"
            placeholder="Enter filename"
            @input="validateFilename"
          />
          <span class="filename-extension">.pdf</span>
        </div>
        <p v-if="filenameError" class="filename-error">
          {{ filenameError }}
        </p>
      </div>
    </div>
    
    <!-- Preview Info -->
    <div v-if="hasImages" class="preview-info">
      <div class="info-item">
        <span class="info-label">Pages:</span>
        <span class="info-value">{{ imageCount }}</span>
      </div>
      <div class="info-item">
        <span class="info-label">Estimated size:</span>
        <span class="info-value">{{ estimatedSize }}</span>
      </div>
      <div v-if="localOptions.pageSize !== 'Auto'" class="info-item">
        <span class="info-label">Page format:</span>
        <span class="info-value">
          {{ localOptions.pageSize }} {{ localOptions.orientation }}
        </span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { PdfOptions } from '@/types'

interface Props {
  options: PdfOptions
  imageCount: number
  estimatedSize: string
}

interface Emits {
  (e: 'update:options', options: PdfOptions): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const filenameError = ref<string | null>(null)

const localOptions = computed({
  get: () => props.options,
  set: (value) => emit('update:options', value)
})

const hasImages = computed(() => props.imageCount > 0)

// Watch for page size changes to reset orientation for Auto mode
watch(
  () => localOptions.value.pageSize,
  (newSize) => {
    if (newSize === 'Auto') {
      localOptions.value = {
        ...localOptions.value,
        orientation: 'portrait'
      }
    }
  }
)

function validateFilename() {
  const filename = localOptions.value.filename.trim()
  
  if (!filename) {
    filenameError.value = 'Filename is required'
    return
  }
  
  // Check for invalid characters
  const invalidChars = /[<>:"/\\|?*]/
  if (invalidChars.test(filename)) {
    filenameError.value = 'Filename contains invalid characters'
    return
  }
  
  // Check for reserved names (Windows)
  const reservedNames = [
    'CON', 'PRN', 'AUX', 'NUL',
    'COM1', 'COM2', 'COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8', 'COM9',
    'LPT1', 'LPT2', 'LPT3', 'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9'
  ]
  
  if (reservedNames.includes(filename.toUpperCase())) {
    filenameError.value = 'Filename is reserved'
    return
  }
  
  // Check length
  if (filename.length > 255) {
    filenameError.value = 'Filename is too long'
    return
  }
  
  filenameError.value = null
}

// Generate default filename based on current date
function generateDefaultFilename(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  const hours = String(now.getHours()).padStart(2, '0')
  const minutes = String(now.getMinutes()).padStart(2, '0')
  
  return `images-to-pdf-${year}${month}${day}-${hours}${minutes}`
}

// Initialize with default filename if empty
if (!localOptions.value.filename) {
  localOptions.value = {
    ...localOptions.value,
    filename: generateDefaultFilename()
  }
}
</script>

<style scoped>
.pdf-options {
  background: white;
  border-radius: 0.5rem;
  padding: 1.5rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.options-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: #2d3748;
  margin-bottom: 1.5rem;
}

.options-grid {
  display: grid;
  gap: 1.5rem;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
}

.filename-group {
  grid-column: 1 / -1;
}

.form-group {
  display: flex;
  flex-direction: column;
}

.form-label {
  font-weight: 500;
  color: #374151;
  margin-bottom: 0.5rem;
  font-size: 0.875rem;
}

.form-control {
  padding: 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.form-control:focus {
  outline: none;
  border-color: #007bff;
  box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.1);
}

.form-control:disabled {
  background-color: #f3f4f6;
  color: #9ca3af;
  cursor: not-allowed;
}

.filename-input-group {
  display: flex;
  align-items: center;
}

.filename-input {
  flex: 1;
  border-top-right-radius: 0;
  border-bottom-right-radius: 0;
  border-right: none;
}

.filename-extension {
  background-color: #f3f4f6;
  border: 1px solid #d1d5db;
  border-left: none;
  border-top-right-radius: 0.375rem;
  border-bottom-right-radius: 0.375rem;
  padding: 0.75rem;
  font-size: 0.875rem;
  color: #6b7280;
  font-weight: 500;
}

.filename-error {
  color: #dc2626;
  font-size: 0.75rem;
  margin-top: 0.25rem;
}

.preview-info {
  margin-top: 1.5rem;
  padding-top: 1.5rem;
  border-top: 1px solid #e5e7eb;
}

.info-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}

.info-item:last-child {
  margin-bottom: 0;
}

.info-label {
  font-weight: 500;
  color: #6b7280;
  font-size: 0.875rem;
}

.info-value {
  font-weight: 600;
  color: #1f2937;
  font-size: 0.875rem;
}

@media (prefers-color-scheme: dark) {
  .pdf-options {
    background: #2d3748;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
  }
  
  .options-title {
    color: #e2e8f0;
  }
  
  .form-label {
    color: #d1d5db;
  }
  
  .form-control {
    background-color: #374151;
    border-color: #4b5563;
    color: #f3f4f6;
  }
  
  .form-control:focus {
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }
  
  .form-control:disabled {
    background-color: #1f2937;
    color: #6b7280;
  }
  
  .filename-extension {
    background-color: #374151;
    border-color: #4b5563;
    color: #9ca3af;
  }
  
  .filename-error {
    color: #f87171;
  }
  
  .preview-info {
    border-top-color: #4b5563;
  }
  
  .info-label {
    color: #9ca3af;
  }
  
  .info-value {
    color: #f3f4f6;
  }
}

@media (max-width: 768px) {
  .options-grid {
    grid-template-columns: 1fr;
  }
  
  .pdf-options {
    padding: 1rem;
  }
}
</style>