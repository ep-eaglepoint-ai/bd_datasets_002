<template>
  <div class="image-preview-grid">
    <draggable
      v-model="localImages"
      item-key="id"
      class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
      :animation="200"
      ghost-class="sortable-ghost"
      chosen-class="sortable-chosen"
      drag-class="drag-item"
      @end="handleDragEnd"
    >
      <template #item="{ element: image, index }">
        <div class="image-card">
          <div class="image-container">
            <img
              :src="image.preview"
              :alt="image.name"
              class="preview-image"
              loading="lazy"
            />
            
            <!-- Remove button -->
            <button
              class="remove-button"
              @click="$emit('remove', image.id)"
              title="Remove image"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
            
            <!-- Drag handle -->
            <div class="drag-handle" title="Drag to reorder">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="3" y1="6" x2="21" y2="6"/>
                <line x1="3" y1="12" x2="21" y2="12"/>
                <line x1="3" y1="18" x2="21" y2="18"/>
              </svg>
            </div>
            
            <!-- Page number -->
            <div class="page-number">
              Page {{ index + 1 }}
            </div>
          </div>
          
          <div class="image-info">
            <p class="image-name" :title="image.name">
              {{ truncateName(image.name) }}
            </p>
            <p class="image-size">
              {{ formatFileSize(image.size) }}
            </p>
            <p v-if="image.compressed" class="compression-info">
              Compressed: {{ formatFileSize(image.compressed.size) }}
            </p>
          </div>
        </div>
      </template>
    </draggable>
    
    <!-- Empty state -->
    <div v-if="localImages.length === 0" class="empty-state">
      <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
        <circle cx="8.5" cy="8.5" r="1.5"/>
        <polyline points="21,15 16,10 5,21"/>
      </svg>
      <p>No images selected</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import draggable from 'vuedraggable'
import type { ImageFile } from '@/types'

interface Props {
  images: ImageFile[]
}

interface Emits {
  (e: 'remove', id: string): void
  (e: 'reorder', images: ImageFile[]): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const localImages = computed({
  get: () => props.images,
  set: (value) => emit('reorder', value)
})

function handleDragEnd() {
  // The v-model will automatically emit the reorder event
}

function truncateName(name: string, maxLength: number = 25): string {
  if (name.length <= maxLength) return name
  const extension = name.split('.').pop()
  const nameWithoutExt = name.substring(0, name.lastIndexOf('.'))
  const truncated = nameWithoutExt.substring(0, maxLength - extension!.length - 4)
  return `${truncated}...${extension}`
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}
</script>

<style scoped>
.image-preview-grid {
  width: 100%;
}

.image-card {
  background: white;
  border-radius: 0.5rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.image-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.image-container {
  position: relative;
  aspect-ratio: 4/3;
  overflow: hidden;
}

.preview-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.2s ease;
}

.image-card:hover .preview-image {
  transform: scale(1.05);
}

.remove-button {
  position: absolute;
  top: 0.5rem;
  right: 0.5rem;
  background: rgba(220, 53, 69, 0.9);
  color: white;
  border: none;
  border-radius: 50%;
  width: 2rem;
  height: 2rem;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.2s ease;
}

.image-card:hover .remove-button {
  opacity: 1;
}

.remove-button:hover {
  background: rgba(220, 53, 69, 1);
}

.drag-handle {
  position: absolute;
  top: 0.5rem;
  left: 0.5rem;
  background: rgba(0, 0, 0, 0.7);
  color: white;
  border-radius: 0.25rem;
  padding: 0.25rem;
  cursor: move;
  opacity: 0;
  transition: opacity 0.2s ease;
}

.image-card:hover .drag-handle {
  opacity: 1;
}

.page-number {
  position: absolute;
  bottom: 0.5rem;
  left: 0.5rem;
  background: rgba(0, 0, 0, 0.7);
  color: white;
  padding: 0.25rem 0.5rem;
  border-radius: 0.25rem;
  font-size: 0.75rem;
  font-weight: 600;
}

.image-info {
  padding: 1rem;
}

.image-name {
  font-weight: 600;
  color: #2d3748;
  margin-bottom: 0.25rem;
  font-size: 0.875rem;
}

.image-size {
  color: #718096;
  font-size: 0.75rem;
  margin-bottom: 0.25rem;
}

.compression-info {
  color: #48bb78;
  font-size: 0.75rem;
  font-weight: 500;
}

.empty-state {
  grid-column: 1 / -1;
  text-align: center;
  padding: 3rem 2rem;
  color: #a0aec0;
}

.empty-state svg {
  margin: 0 auto 1rem;
}

.empty-state p {
  font-size: 1.125rem;
  font-weight: 500;
}

/* Drag and drop styles */
.sortable-ghost {
  opacity: 0.5;
}

.sortable-chosen {
  transform: scale(1.05);
}

.drag-item {
  cursor: move;
}

@media (prefers-color-scheme: dark) {
  .image-card {
    background: #2d3748;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
  }
  
  .image-card:hover {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
  }
  
  .image-name {
    color: #e2e8f0;
  }
  
  .image-size {
    color: #a0aec0;
  }
  
  .empty-state {
    color: #718096;
  }
}

@media (max-width: 768px) {
  .grid {
    grid-template-columns: repeat(1, minmax(0, 1fr));
  }
}

@media (min-width: 768px) and (max-width: 1024px) {
  .grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>