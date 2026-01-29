<template>
  <div class="results-container">
    <div class="header-actions">
      <h2>Processed Records</h2>
      <div class="controls">
        <input
          type="text"
          v-model="search"
          placeholder="Search..."
          class="search-input"
          @input="onSearch"
        />
        <button @click="exportData('json')" :disabled="!batchId">JSON</button>
        <button @click="exportData('csv')" :disabled="!batchId">CSV</button>
      </div>
      <div v-if="loading" class="spinner"></div>
    </div>

    <div class="table-wrapper" v-if="!loading && records.length > 0">
      <table>
        <thead>
          <tr>
            <th @click="sortBy('tracking_number')">Tracking #</th>
            <th @click="sortBy('origin')">Origin</th>
            <th @click="sortBy('destination')">Destination</th>
            <th @click="sortBy('weight_kg')">Weight (kg)</th>
            <th @click="sortBy('status')">Status</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in records" :key="row._id?.$oid || Math.random()">
            <td class="font-mono">{{ row.tracking_number }}</td>
            <td>{{ row.origin }}</td>
            <td>{{ row.destination }}</td>
            <td class="text-right">
              {{
                typeof row.weight_kg === "number"
                  ? row.weight_kg.toFixed(2)
                  : row.weight_kg
              }}
            </td>
            <td>
              <span :class="['badge', getStatusClass(row.status)]">
                {{ row.status }}
              </span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-else-if="!loading" class="empty-state">No records found.</div>

    <div class="pagination" v-if="records.length > 0">
      <button @click="page--" :disabled="page <= 1">Previous</button>
      <span>Page {{ page }}</span>
      <button @click="page++">Next</button>
    </div>
  </div>
</template>

<script setup>
// ... existing imports ...
import { ref, onMounted, watch } from "vue";

const props = defineProps(["batchId"]);
const records = ref([]);
const page = ref(1);
const limit = 50;
const loading = ref(false);
const search = ref("");
const sortField = ref("");
let searchTimeout;

const onSearch = () => {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    page.value = 1;
    fetchData();
  }, 300);
};

const sortBy = (field) => {
  sortField.value = field;
  fetchData();
};

const exportData = (format) => {
  if (!props.batchId) return;
  window.location.href = `/api/export?batch_id=${props.batchId}&format=${format}`;
};

const fetchData = async () => {
  if (!props.batchId) return;
  loading.value = true;
  try {
    const skip = (page.value - 1) * limit;
    const res = await fetch(
      `/api/records?batch_id=${props.batchId}&skip=${skip}&limit=${limit}&search=${encodeURIComponent(search.value)}&sort_by=${sortField.value}`,
    );
    if (res.ok) {
      records.value = await res.json();
    }
  } catch (e) {
    console.error(e);
  } finally {
    loading.value = false;
  }
};

const getStatusClass = (status) => {
  if (!status) return "gray";
  const s = status.toUpperCase();
  if (s === "DELIVERED") return "green";
  if (s === "IN_TRANSIT") return "blue";
  if (s === "PENDING") return "yellow";
  if (s === "EXCEPTION" || s === "RETURNED") return "red";
  return "gray";
};

watch(() => props.batchId, fetchData);
watch(page, fetchData);
onMounted(fetchData);
</script>

<style scoped>
.results-container {
  margin-top: 2rem;
  background: white;
  border-radius: 12px;
  box-shadow:
    0 4px 6px -1px rgba(0, 0, 0, 0.1),
    0 2px 4px -1px rgba(0, 0, 0, 0.06);
  padding: 1.5rem;
  font-family: "Inter", sans-serif;
}

.header-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
  gap: 1rem;
}

.controls {
  display: flex;
  gap: 0.5rem;
}

.search-input {
  padding: 0.5rem;
  border: 1px solid #d1d5db;
  border-radius: 6px;
}

h2 {
  font-size: 1.25rem;
  font-weight: 600;
  color: #1f2937;
  margin: 0;
}

.table-wrapper {
  overflow-x: auto;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
}

table {
  width: 100%;
  border-collapse: collapse;
  min-width: 600px;
}

th {
  background-color: #f9fafb;
  color: #6b7280;
  font-weight: 600;
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding: 0.75rem 1.5rem;
  text-align: left;
  border-bottom: 1px solid #e5e7eb;
  cursor: pointer;
}

th:hover {
  background-color: #f3f4f6;
}

td {
  padding: 1rem 1.5rem;
  color: #111827;
  font-size: 0.875rem;
  border-bottom: 1px solid #e5e7eb;
}

tr:last-child td {
  border-bottom: none;
}

tr:hover {
  background-color: #f9fafb;
}

.font-mono {
  font-family: "Roboto Mono", monospace;
  color: #111827;
}

.text-right {
  text-align: right;
}

/* Badges */
.badge {
  display: inline-flex;
  align-items: center;
  padding: 0.125rem 0.625rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 500;
  text-transform: capitalize;
}

.badge.green {
  background-color: #dcfce7;
  color: #166534;
}
.badge.blue {
  background-color: #dbeafe;
  color: #1e40af;
}
.badge.yellow {
  background-color: #fef9c3;
  color: #854d0e;
}
.badge.red {
  background-color: #fee2e2;
  color: #991b1b;
}
.badge.gray {
  background-color: #f3f4f6;
  color: #374151;
}

.pagination {
  margin-top: 1.5rem;
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 1rem;
}

button {
  background-color: white;
  border: 1px solid #d1d5db;
  color: #374151;
  padding: 0.5rem 1rem;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

button:hover:not(:disabled) {
  background-color: #f3f4f6;
  border-color: #9ca3af;
}

button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.empty-state {
  text-align: center;
  padding: 3rem;
  color: #6b7280;
}

.spinner {
  border: 2px solid #f3f3f3;
  border-top: 2px solid #3498db;
  border-radius: 50%;
  width: 20px;
  height: 20px;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}
</style>
