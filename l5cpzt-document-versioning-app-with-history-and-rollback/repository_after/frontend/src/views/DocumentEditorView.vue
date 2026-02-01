<template>
  <div class="editor-page">
    <!-- Loading state -->
    <div v-if="loading" class="loading-container">
      <LoadingSpinner size="lg" />
    </div>

    <template v-else>
      <!-- Editor header -->
      <div class="editor-header">
        <div class="header-left">
          <button @click="goBack" class="btn btn-secondary btn-sm">
            ← Back
          </button>
          <input 
            v-model="document.title"
            type="text"
            class="title-input"
            placeholder="Untitled Document"
            @blur="handleTitleChange"
          />
        </div>
        <div class="header-right">
          <span v-if="saving" class="save-status saving">Saving...</span>
          <span v-else-if="lastSaved" class="save-status saved">Saved {{ lastSavedText }}</span>
          <button @click="toggleHistory" class="btn btn-secondary btn-sm">
            📜 History
          </button>
          <button @click="saveDocument" class="btn btn-primary btn-sm" :disabled="saving">
            Save
          </button>
        </div>
      </div>

      <!-- Main content area -->
      <div class="editor-main" :class="{ 'with-panel': showHistory }">
        <!-- Editor -->
        <div class="editor-container">
          <div class="form-group">
            <label for="changeNote">Change Note (optional)</label>
            <input 
              id="changeNote"
              v-model="changeNote"
              type="text"
              placeholder="Describe your changes..."
            />
          </div>
          <div class="form-group">
            <label for="content">Content</label>
            <textarea 
              id="content"
              v-model="document.current_content"
              class="content-editor"
              placeholder="Start writing..."
            ></textarea>
          </div>
        </div>

        <!-- Version History Panel -->
        <div v-if="showHistory" class="history-panel">
          <VersionHistoryPanel 
            :document-id="documentId"
            :versions="versions"
            :current-version="document.current_version"
            :loading="loadingVersions"
            @close="showHistory = false"
            @rollback="handleRollback"
          />
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { inject } from 'vue'
import api from '../api/axios'
import LoadingSpinner from '../components/LoadingSpinner.vue'
import VersionHistoryPanel from '../components/VersionHistoryPanel.vue'

const router = useRouter()
const route = useRoute()
const toast = inject('toast')

const isNewDocument = computed(() => route.name === 'NewDocument')
const documentId = computed(() => route.params.id)

const loading = ref(false)
const saving = ref(false)
const loadingVersions = ref(false)
const showHistory = ref(false)
const lastSaved = ref(null)

const document = ref({
  title: '',
  current_content: '',
  current_version: 0,
  optimistic_version: 1
})
const versions = ref([])
const changeNote = ref('')

// Debounce helper
const debounce = (fn, delay) => {
  let timeoutId
  return (...args) => {
    clearTimeout(timeoutId)
    timeoutId = setTimeout(() => fn(...args), delay)
  }
}

const lastSavedText = computed(() => {
  if (!lastSaved.value) return ''
  const diff = Math.floor((Date.now() - lastSaved.value) / 1000)
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  return `${Math.floor(diff / 3600)}h ago`
})

const fetchDocument = async () => {
  if (isNewDocument.value) return
  
  loading.value = true
  try {
    const response = await api.get(`/documents/${documentId.value}/`)
    document.value = response.data.data
    fetchVersions()
  } catch (error) {
    toast.show('Failed to load document', 'error')
    router.push('/')
  } finally {
    loading.value = false
  }
}

const fetchVersions = async () => {
  if (isNewDocument.value) return
  
  loadingVersions.value = true
  try {
    const response = await api.get(`/documents/${documentId.value}/versions/`)
    versions.value = response.data.data.results || response.data.data
  } catch (error) {
    console.error('Failed to load versions', error)
  } finally {
    loadingVersions.value = false
  }
}

const saveDocument = async (isAutoSave = false) => {
  if (!document.value.title.trim()) {
    if (!isAutoSave) toast.show('Please enter a title', 'warning')
    return
  }
  
  // Don't autosave new documents
  if (isAutoSave && isNewDocument.value) return

  saving.value = true
  try {
    const payload = {
      title: document.value.title,
      current_content: document.value.current_content,
      optimistic_version: document.value.optimistic_version,
      change_note: changeNote.value || undefined
    }
    
    let response
    if (isNewDocument.value) {
      response = await api.post('/documents/', payload)
      toast.show('Document created!', 'success')
      router.replace(`/documents/${response.data.data.id}`)
    } else {
      response = await api.patch(`/documents/${documentId.value}/`, payload)
      document.value = response.data.data
      if (!isAutoSave) toast.show('Document saved!', 'success')
    }
    
    lastSaved.value = Date.now()
    if (!isAutoSave) changeNote.value = ''
    fetchVersions()
  } catch (error) {
    const isConflict = error.response?.status === 400 && error.response?.data?.data?.optimistic_version
    if (isConflict) {
      toast.show('Conflict: This document was updated by someone else. Please refresh.', 'error')
    } else if (!isAutoSave) {
      toast.show('Failed to save document', 'error')
    }
  } finally {
    saving.value = false
  }
}

const debouncedSave = debounce(() => saveDocument(true), 1500)

const handleTitleChange = () => {
  if (!isNewDocument.value) debouncedSave()
}

// Watch for content changes to trigger autosave
watch([() => document.value.current_content, () => document.value.title], () => {
  if (!isNewDocument.value && !loading.value && !saving.value) {
    debouncedSave()
  }
})

const toggleHistory = () => {
  showHistory.value = !showHistory.value
  if (showHistory.value && versions.value.length === 0) {
    fetchVersions()
  }
}

const handleRollback = () => {
  fetchDocument()
}

const goBack = () => {
  router.push('/')
}

onMounted(() => {
  fetchDocument()
})

// Watch for route changes (e.g., from new to edit)
watch(() => route.params.id, () => {
  if (route.params.id) {
    fetchDocument()
  }
})
</script>

<style scoped>
.editor-page {
  height: calc(100vh - 72px);
  display: flex;
  flex-direction: column;
  background: var(--gray-50);
}

.editor-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.5rem;
  background: white;
  border-bottom: 1px solid var(--gray-200);
  box-shadow: var(--shadow-sm);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex: 1;
}

.title-input {
  font-size: 1.25rem;
  font-weight: 600;
  border: none;
  background: transparent;
  padding: 0.5rem;
  width: 100%;
  max-width: 400px;
}

.title-input:focus {
  outline: none;
  background: var(--gray-50);
  border-radius: var(--radius-md);
}

.header-right {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.save-status {
  font-size: 0.8125rem;
  color: var(--gray-500);
}

.save-status.saving {
  color: var(--warning-500);
}

.save-status.saved {
  color: var(--success-500);
}

.editor-main {
  flex: 1;
  display: flex;
  overflow: hidden;
}

.editor-container {
  flex: 1;
  padding: 2rem;
  overflow-y: auto;
}

.content-editor {
  min-height: 400px;
  height: calc(100vh - 350px);
  font-family: 'Inter', sans-serif;
  font-size: 1rem;
  line-height: 1.7;
  resize: none;
}

.history-panel {
  width: 380px;
  flex-shrink: 0;
  overflow: hidden;
}

.editor-main.with-panel .editor-container {
  max-width: calc(100% - 380px);
}

@media (max-width: 768px) {
  .editor-header {
    flex-direction: column;
    gap: 1rem;
    align-items: flex-start;
  }
  
  .header-left, .header-right {
    width: 100%;
    justify-content: space-between;
  }
  
  .history-panel {
    position: fixed;
    right: 0;
    top: 72px;
    bottom: 0;
    z-index: 100;
    box-shadow: var(--shadow-xl);
  }
}
</style>
