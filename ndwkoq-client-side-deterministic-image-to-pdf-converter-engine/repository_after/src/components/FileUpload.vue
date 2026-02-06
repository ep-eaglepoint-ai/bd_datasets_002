<template>
  <div class="file-upload">
    <!-- Drag and Drop Zone -->
    <div
      ref="dropZone"
      class="drop-zone"
      :class="{ 'drag-over': isDragOver, 'has-files': hasFiles }"
      @click="triggerFileInput"
      @dragover.prevent="handleDragOver"
      @dragleave.prevent="handleDragLeave"
      @drop.prevent="handleDrop"
    >
      <input
        ref="fileInput"
        type="file"
        multiple
        accept="image/jpeg,image/jpg,image/png,image/webp"
        class="file-input"
        @change="handleFileSelect"
      />
      
      <div class="drop-zone-content">
        <div class="upload-icon">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="7,10 12,15 17,10"/>
            <line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
        </div>
        
        <h3 class="upload-title">
          {{ hasFiles ? 'Add More Images' : 'Upload Images' }}
        </h3>
        
        <p class="upload-description">
          Drag and drop images here, or click to select files
        </p>
        
        <p class="upload-formats">
          Supports: JPG, PNG, WEBP (max 50MB each)
        </p>
      </div>
    </div>
    
    <!-- Processing Progress -->
    <div v-if="isProcessing" class="processing-status">
      <div class="progress">
        <div 
          class="progress-bar" 
          :style="{ width: `${processingProgress}%` }"
        ></div>
      </div>
      <p class="processing-text">
        Processing images... {{ processingProgress }}%
      </p>
    </div>
    
    <!-- Error Display -->
    <div v-if="error" class="error-message">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10"/>
        <line x1="15" y1="9" x2="9" y2="15"/>
        <line x1="9" y1="9" x2="15" y2="15"/>
      </svg>
      {{ error }}
    </div>
    
    <!-- File Info -->
    <div v-if="hasFiles && !isProcessing" class="file-info">
      <p class="file-count">
        {{ images.length }} image{{ images.length !== 1 ? 's' : '' }} selected
      </p>
      <p class="file-size">
        Total size: {{ formattedTotalSize }}
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

interface Props {
  images: any[]
  isProcessing: boolean
  processingProgress: number
  error: string | null
  formattedTotalSize: string
}

interface Emits {
  (e: 'upload', files: File[]): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const dropZone = ref<HTMLElement>()
const fileInput = ref<HTMLInputElement>()
const isDragOver = ref(false)

const hasFiles = computed(() => props.images.length > 0)

function triggerFileInput() {
  fileInput.value?.click()
}

function handleFileSelect(event: Event) {
  const target = event.target as HTMLInputElement
  if (target.files) {
    const files = Array.from(target.files)
    emit('upload', files)
    // Reset input to allow selecting the same files again
    target.value = ''
  }
}

function handleDragOver(event: DragEvent) {
  event.preventDefault()
  isDragOver.value = true
}

function handleDragLeave(event: DragEvent) {
  event.preventDefault()
  // Only set to false if leaving the drop zone itself
  if (!dropZone.value?.contains(event.relatedTarget as Node)) {
    isDragOver.value = false
  }
}

function handleDrop(event: DragEvent) {
  event.preventDefault()
  isDragOver.value = false
  
  if (event.dataTransfer?.files) {
    const files = Array.from(event.dataTransfer.files)
    emit('upload', files)
  }
}
</script>

<style scoped>
.file-upload {
  width: 100%;
}

.drop-zone {
  border: 2px dashed #cbd5e0;
  border-radius: 0.5rem;
  padding: 3rem 2rem;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s ease;
  background-color: #f7fafc;
  position: relative;
}

.drop-zone:hover {
  border-color: #007bff;
  background-color: #ebf8ff;
}

.drop-zone.drag-over {
  border-color: #007bff;
  background-color: #ebf8ff;
  transform: scale(1.02);
}

.drop-zone.has-files {
  border-color: #48bb78;
  background-color: #f0fff4;
}

.file-input {
  display: none;
}

.drop-zone-content {
  pointer-events: none;
}

.upload-icon {
  color: #718096;
  margin-bottom: 1rem;
}

.drop-zone:hover .upload-icon,
.drop-zone.drag-over .upload-icon {
  color: #007bff;
}

.upload-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: #2d3748;
  margin-bottom: 0.5rem;
}

.upload-description {
  color: #718096;
  margin-bottom: 0.5rem;
}

.upload-formats {
  font-size: 0.875rem;
  color: #a0aec0;
}

.processing-status {
  margin-top: 1rem;
}

.processing-text {
  text-align: center;
  color: #718096;
  margin-top: 0.5rem;
  font-size: 0.875rem;
}

.error-message {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  background-color: #fed7d7;
  color: #c53030;
  border-radius: 0.375rem;
  margin-top: 1rem;
  font-size: 0.875rem;
}

.file-info {
  margin-top: 1rem;
  padding: 1rem;
  background-color: #edf2f7;
  border-radius: 0.375rem;
  text-align: center;
}

.file-count {
  font-weight: 600;
  color: #2d3748;
  margin-bottom: 0.25rem;
}

.file-size {
  color: #718096;
  font-size: 0.875rem;
}

@media (prefers-color-scheme: dark) {
  .drop-zone {
    background-color: #2d3748;
    border-color: #4a5568;
  }
  
  .drop-zone:hover,
  .drop-zone.drag-over {
    background-color: #2a4365;
  }
  
  .drop-zone.has-files {
    background-color: #22543d;
    border-color: #48bb78;
  }
  
  .upload-title {
    color: #e2e8f0;
  }
  
  .upload-description {
    color: #a0aec0;
  }
  
  .upload-formats {
    color: #718096;
  }
  
  .file-info {
    background-color: #4a5568;
  }
  
  .file-count {
    color: #e2e8f0;
  }
  
  .file-size {
    color: #a0aec0;
  }
}
</style>