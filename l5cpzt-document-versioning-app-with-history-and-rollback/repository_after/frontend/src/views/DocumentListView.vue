<template>
  <div class="document-list-page">
    <div class="container">
      <div class="page-header">
        <h1 class="page-title">My Documents</h1>
        <button @click="createDocument" class="btn btn-primary">
          <span>+ New Document</span>
        </button>
      </div>

      <!-- Search bar -->
      <div class="search-bar">
        <input 
          v-model="searchQuery"
          type="text"
          placeholder="Search documents..."
          @input="debouncedSearch"
        />
      </div>

      <!-- Loading state -->
      <div v-if="loading" class="loading-container">
        <LoadingSpinner size="lg" />
      </div>

      <!-- Empty state -->
      <div v-else-if="documents.length === 0" class="empty-state card">
        <div class="empty-state-icon">📄</div>
        <h3>No documents yet</h3>
        <p>Create your first document to get started.</p>
        <button @click="createDocument" class="btn btn-primary mt-3">
          Create Document
        </button>
      </div>

      <!-- Document grid -->
      <div v-else class="document-grid">
        <div 
          v-for="doc in documents" 
          :key="doc.id" 
          class="document-card card"
          @click="openDocument(doc.id)"
        >
          <div class="card-body">
            <h3 class="doc-title">{{ doc.title }}</h3>
            <div class="doc-meta">
              <span class="doc-versions">{{ doc.version_count }} versions</span>
              <span class="doc-date">{{ formatDate(doc.updated_at) }}</span>
            </div>
          </div>
          <div class="card-actions">
            <button 
              @click.stop="confirmDelete(doc)" 
              class="btn-icon danger"
              title="Delete document"
            >
              🗑️
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Delete Confirmation Modal -->
    <Teleport to="body">
      <div v-if="showDeleteModal" class="modal-overlay" @click.self="showDeleteModal = false">
        <div class="modal">
          <div class="modal-header">
            <h3>Delete Document</h3>
          </div>
          <div class="modal-body">
            <p>Are you sure you want to delete <strong>{{ documentToDelete?.title }}</strong>?</p>
            <p class="text-muted text-sm mt-2">This action cannot be undone.</p>
          </div>
          <div class="modal-footer">
            <button @click="showDeleteModal = false" class="btn btn-secondary">Cancel</button>
            <button @click="deleteDocument" class="btn btn-danger" :disabled="deleting">
              <LoadingSpinner v-if="deleting" size="sm" />
              <span v-else>Delete</span>
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, onMounted, inject } from 'vue'
import { useRouter } from 'vue-router'
import api from '../api/axios'
import LoadingSpinner from '../components/LoadingSpinner.vue'

const router = useRouter()
const toast = inject('toast')

const documents = ref([])
const loading = ref(true)
const searchQuery = ref('')
const showDeleteModal = ref(false)
const documentToDelete = ref(null)
const deleting = ref(false)

let searchTimeout = null

const fetchDocuments = async (search = '') => {
  loading.value = true
  try {
    const params = search ? { search } : {}
    const response = await api.get('/documents/', { params })
    documents.value = response.data.data.results || response.data.data
  } catch (error) {
    toast.show('Failed to load documents', 'error')
  } finally {
    loading.value = false
  }
}

const debouncedSearch = () => {
  clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => {
    fetchDocuments(searchQuery.value)
  }, 300)
}

const formatDate = (dateString) => {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })
}

const createDocument = () => {
  router.push('/documents/new')
}

const openDocument = (id) => {
  router.push(`/documents/${id}`)
}

const confirmDelete = (doc) => {
  documentToDelete.value = doc
  showDeleteModal.value = true
}

const deleteDocument = async () => {
  if (!documentToDelete.value) return
  
  deleting.value = true
  try {
    await api.delete(`/documents/${documentToDelete.value.id}/`)
    documents.value = documents.value.filter(d => d.id !== documentToDelete.value.id)
    toast.show('Document deleted', 'success')
    showDeleteModal.value = false
  } catch (error) {
    toast.show('Failed to delete document', 'error')
  } finally {
    deleting.value = false
  }
}

onMounted(() => {
  fetchDocuments()
})
</script>

<style scoped>
.document-list-page {
  padding: 2rem 0;
}

.search-bar {
  margin-bottom: 2rem;
}

.search-bar input {
  max-width: 400px;
  padding-left: 1rem;
  background: white;
  box-shadow: var(--shadow-sm);
}

.document-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1.5rem;
}

.document-card {
  cursor: pointer;
  transition: all var(--transition-normal);
  position: relative;
}

.document-card:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-lg);
}

.doc-title {
  font-size: 1.125rem;
  margin-bottom: 0.5rem;
  color: var(--gray-800);
}

.doc-meta {
  display: flex;
  gap: 1rem;
  font-size: 0.875rem;
  color: var(--gray-500);
}

.doc-versions {
  background: var(--primary-100);
  color: var(--primary-700);
  padding: 0.125rem 0.5rem;
  border-radius: var(--radius-full);
  font-size: 0.75rem;
  font-weight: 500;
}

.card-actions {
  position: absolute;
  top: 0.75rem;
  right: 0.75rem;
  opacity: 0;
  transition: opacity var(--transition-fast);
}

.document-card:hover .card-actions {
  opacity: 1;
}

.btn-icon {
  width: 32px;
  height: 32px;
  border-radius: var(--radius-md);
  border: none;
  background: var(--gray-100);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all var(--transition-fast);
}

.btn-icon.danger:hover {
  background: var(--error-500);
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
  max-width: 400px;
  box-shadow: var(--shadow-xl);
  animation: fadeIn 0.2s ease;
}

.modal-header {
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
