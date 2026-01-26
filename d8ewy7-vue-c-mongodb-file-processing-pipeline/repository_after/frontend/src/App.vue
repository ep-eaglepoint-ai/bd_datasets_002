<script setup>
import { ref } from "vue";
import FileUpload from "./components/FileUpload.vue";
import ResultsTable from "./components/ResultsTable.vue";

const currentBatchId = ref(null);

const onUploadComplete = (batchId) => {
  currentBatchId.value = batchId;
};
</script>

<template>
  <div class="container">
    <h1>Logistics CSV Pipeline</h1>
    <div class="card">
      <FileUpload @upload-complete="onUploadComplete" />
    </div>

    <div v-if="currentBatchId" class="card">
      <ResultsTable :batch-id="currentBatchId" />
    </div>
  </div>
</template>

<style>
.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
  font-family: "Inter", sans-serif;
}
.card {
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  padding: 1.5rem;
  margin-bottom: 2rem;
}
h1 {
  text-align: center;
  color: #333;
  margin-bottom: 2rem;
}
</style>
