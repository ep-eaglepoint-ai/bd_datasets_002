<template>
  <div class="version-panel">
    <div class="panel-header">
      <h3>Version History</h3>
      <button @click="$emit('close')" class="close-btn">×</button>
    </div>
    
    <div v-if="loading" class="loading-container">
      <LoadingSpinner />
    </div>
    
    <div v-else-if="versions.length === 0" class="empty-state">
      <p>No versions yet</p>
    </div>
    
    <div v-else class="versions-list">
      <div 
        v-for="version in versions" 
        :key="version.id" 
        class="version-item"
        :class="{ current: version.version_number === currentVersion }"
      >
        <div class="version-info">
          <div class="version-header">
            <span class="version-number">v{{ version.version_number }}</span>
            <span v-if="version.version_number === currentVersion" class="current-badge">Current</span>
          </div>
          <div class="version-meta">
            <span class="version-date">{{ formatDate(version.created_at) }}</span>
            <span class="version-user">by {{ version.created_by?.username || 'Unknown' }}</span>
          </div>
          <div v-if="version.change_note" class="version-note">
            {{ version.change_note }}
          </div>
        </div>
        
        <div class="version-actions">
          <button 
            @click="viewVersion(version)"
            class="btn btn-secondary btn-sm"
          >
            View
          </button>
          <button 
            v-if="version.version_number !== currentVersion"
            @click="confirmRollback(version)"
            class="btn btn-primary btn-sm"
          >
            Rollback
          </button>
        </div>
      </div>
    </div>

    <!-- Rollback Confirmation Modal -->
    <Teleport to="body">
      <div v-if="showConfirm" class="modal-overlay" @click.self="showConfirm = false">
        <div class="modal">
          <div class="modal-header">
            <h3>Confirm Rollback</h3>
          </div>
          <div class="modal-body">
            <p>
              Are you sure you want to rollback to 
              <strong>version {{ selectedVersion?.version_number }}</strong>?
            </p>
            <p class="text-muted text-sm mt-2">
              This will restore the document content from that version and create a new version entry.
            </p>
          </div>
          <div class="modal-footer">
            <button @click="showConfirm = false" class="btn btn-secondary">
              Cancel
            </button>
            <button 
              @click="executeRollback" 
              class="btn btn-primary"
              :disabled="rollingBack"
            >
              <LoadingSpinner v-if="rollingBack" size="sm" />
              <span v-else>Rollback</span>
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Version Preview Modal -->
    <Teleport to="body">
      <div v-if="showPreview" class="modal-overlay" @click.self="showPreview = false">
        <div class="modal modal-lg">
          <div class="modal-header">
            <h3>Version {{ previewVersion?.version_number }} Preview</h3>
            <button @click="showPreview = false" class="close-btn">×</button>
          </div>
          <div class="modal-body">
            <div class="preview-content">
              {{ previewVersion?.content_snapshot }}
            </div>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, inject } from 'vue'
import api from '../api/axios'
import LoadingSpinner from './LoadingSpinner.vue'

const props = defineProps({
  documentId: {
    type: [Number, String],
    required: true
  },
  versions: {
    type: Array,
    default: () => []
  },
  currentVersion: {
    type: Number,
    default: 0
  },
  loading: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['close', 'rollback'])

const toast = inject('toast')
const showConfirm = ref(false)
const showPreview = ref(false)
const selectedVersion = ref(null)
const previewVersion = ref(null)
const rollingBack = ref(false)

const formatDate = (dateString) => {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const viewVersion = async (version) => {
  try {
    const response = await api.get(
      `/documents/${props.documentId}/versions/${version.id}/`
    )
    previewVersion.value = response.data.data
    showPreview.value = true
  } catch (error) {
    toast.show('Failed to load version', 'error')
  }
}

const confirmRollback = (version) => {
  selectedVersion.value = version
  showConfirm.value = true
}

const executeRollback = async () => {
  if (!selectedVersion.value) return
  
  rollingBack.value = true
  try {
    await api.post(
      `/documents/${props.documentId}/versions/${selectedVersion.value.id}/rollback/`
    )
    toast.show(`Rolled back to version ${selectedVersion.value.version_number}`, 'success')
    showConfirm.value = false
    emit('rollback')
  } catch (error) {
    toast.show('Failed to rollback', 'error')
  } finally {
    rollingBack.value = false
  }
}
</script>

<style scoped>
.version-panel {
  background: white;
  border-left: 1px solid var(--gray-200);
  height: 100%;
  display: flex;
  flex-direction: column;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid var(--gray-200);
}

.panel-header h3 {
  font-size: 1.125rem;
  margin: 0;
}

.close-btn {
  background: none;
  border: none;
  font-size: 1.5rem;
  color: var(--gray-400);
  cursor: pointer;
  padding: 0;
  line-height: 1;
}

.close-btn:hover {
  color: var(--gray-600);
}

.versions-list {
  flex: 1;
  overflow-y: auto;
  padding: 1rem;
}

.version-item {
  padding: 1rem;
  border: 1px solid var(--gray-200);
  border-radius: var(--radius-md);
  margin-bottom: 0.75rem;
  transition: all var(--transition-fast);
}

.version-item:hover {
  border-color: var(--primary-300);
  background: var(--gray-50);
}

.version-item.current {
  border-color: var(--primary-500);
  background: var(--primary-50);
}

.version-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.25rem;
}

.version-number {
  font-weight: 600;
  color: var(--gray-800);
}

.current-badge {
  font-size: 0.75rem;
  padding: 0.125rem 0.5rem;
  background: var(--primary-500);
  color: white;
  border-radius: var(--radius-full);
}

.version-meta {
  font-size: 0.8125rem;
  color: var(--gray-500);
}

.version-user {
  margin-left: 0.5rem;
}

.version-note {
  margin-top: 0.5rem;
  font-size: 0.875rem;
  color: var(--gray-600);
  font-style: italic;
}

.version-actions {
  display: flex;
  gap: 0.5rem;
  margin-top: 0.75rem;
}

/* Modal styles */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal {
  background: white;
  border-radius: var(--radius-xl);
  width: 90%;
  max-width: 450px;
  box-shadow: var(--shadow-xl);
  animation: fadeIn 0.2s ease;
}

.modal-lg {
  max-width: 700px;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid var(--gray-200);
}

.modal-header h3 {
  margin: 0;
}

.modal-body {
  padding: 1.5rem;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  padding: 1rem 1.5rem;
  border-top: 1px solid var(--gray-200);
  background: var(--gray-50);
  border-radius: 0 0 var(--radius-xl) var(--radius-xl);
}

.preview-content {
  white-space: pre-wrap;
  font-family: monospace;
  font-size: 0.875rem;
  background: var(--gray-50);
  padding: 1rem;
  border-radius: var(--radius-md);
  max-height: 400px;
  overflow-y: auto;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}
</style>
