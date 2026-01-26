<script setup>
import { ref, onMounted, watch } from "vue";

const props = defineProps(["batchId"]);
const records = ref([]);
const page = ref(1);
const limit = 50;
const total = ref(0);
const loading = ref(false);

const fetchData = async () => {
  if (!props.batchId) return;
  loading.value = true;
  try {
    const skip = (page.value - 1) * limit;
    const res = await fetch(
      `/api/records?batch_id=${props.batchId}&skip=${skip}&limit=${limit}`,
    );
    if (res.ok) {
      records.value = await res.json();
      // Total count? Backend needs to send it.
      // For now, assuming infinite scroll or just getting page
    }
  } catch (e) {
    console.error(e);
  } finally {
    loading.value = false;
  }
};

watch(() => props.batchId, fetchData);
watch(page, fetchData);

onMounted(fetchData);
</script>

<template>
  <div>
    <h2>Processed Records</h2>
    <div v-if="loading">Loading...</div>
    <table v-else>
      <thead>
        <tr>
          <th>Tracking #</th>
          <th>Origin</th>
          <th>Destination</th>
          <th>Weight</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="row in records" :key="row._id?.$oid || Math.random()">
          <td>{{ row.tracking_number }}</td>
          <td>{{ row.origin }}</td>
          <td>{{ row.destination }}</td>
          <td>{{ row.weight_kg }}</td>
          <td>{{ row.status }}</td>
        </tr>
      </tbody>
    </table>
    <div class="pagination">
      <button @click="page--" :disabled="page <= 1">Prev</button>
      <span>Page {{ page }}</span>
      <button @click="page++">Next</button>
    </div>
  </div>
</template>

<style scoped>
table {
  width: 100%;
  border-collapse: collapse;
}
th,
td {
  border: 1px solid #ddd;
  padding: 8px;
  text-align: left;
}
.pagination {
  margin-top: 1rem;
  display: flex;
  gap: 1rem;
  justify-content: center;
}
</style>
