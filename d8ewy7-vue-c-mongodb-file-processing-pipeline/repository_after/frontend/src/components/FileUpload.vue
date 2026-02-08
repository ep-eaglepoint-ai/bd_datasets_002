<script setup>
import { ref, onUnmounted } from "vue";

const emit = defineEmits(["upload-complete"]);

const isDragging = ref(false);
const file = ref(null);
const status = ref("idle"); // idle, uploading, processing, complete, error
const progress = ref({
  percentage: 0,
  text: "",
  valid: 0,
  invalid: 0,
});
const error = ref(null);
const currentBatchId2 = ref(null);
const showErrors = ref(false);
const errorsList = ref([]);
const loadingErrors = ref(false);
let pollInterval = null;

const toggleErrors = async () => {
  showErrors.value = !showErrors.value;
  if (showErrors.value && errorsList.value.length === 0) {
    loadingErrors.value = true;
    try {
      const batchId = currentBatchId2.value;
      if (!batchId) return;

      const res = await fetch(`/api/errors/${batchId}`);
      if (res.ok) {
        errorsList.value = await res.json();
      } else {
        error.value = "Failed to fetch error details";
      }
    } catch (e) {
      console.error(e);
      error.value = "Error loading details";
    } finally {
      loadingErrors.value = false;
    }
  }
};

const onDragOver = (e) => {
  e.preventDefault();
  isDragging.value = true;
};

const onDragLeave = (e) => {
  e.preventDefault();
  isDragging.value = false;
};

const onDrop = (e) => {
  e.preventDefault();
  isDragging.value = false;
  const droppedFiles = e.dataTransfer.files;
  if (droppedFiles.length > 0) {
    handleFile(droppedFiles[0]);
  }
};

const onFileSelect = (e) => {
  if (e.target.files.length > 0) {
    handleFile(e.target.files[0]);
  }
};

const handleFile = async (selectedFile) => {
  if (selectedFile.type !== "text/csv" && !selectedFile.name.endsWith(".csv")) {
    error.value = "Only CSV files are allowed";
    return;
  }

  file.value = selectedFile;
  status.value = "uploading";
  error.value = null;
  progress.value = {
    percentage: 0,
    text: "Starting upload...",
    valid: 0,
    invalid: 0,
  };

  const formData = new FormData();
  formData.append("file", file.value);

  try {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/upload");

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        const percent = Math.round((e.loaded / e.total) * 100);
        progress.value.percentage = percent;
        progress.value.text = `Uploading: ${percent}%`;
      }
    };

    xhr.onload = () => {
      if (xhr.status === 200) {
        const response = JSON.parse(xhr.responseText);
        const batchId = response.batch_id;
        currentBatchId2.value = batchId;
        startPolling(batchId);
        emit("upload-complete", batchId); // Emit early so table can prepare? Or wait?
        // Wait for final processing
      } else {
        status.value = "error";
        error.value = "Upload failed";
      }
    };

    xhr.onerror = () => {
      status.value = "error";
      error.value = "Network error";
    };

    xhr.send(formData);
  } catch (e) {
    status.value = "error";
    error.value = e.message;
  }
};

const startPolling = (batchId) => {
  status.value = "processing";
  pollInterval = setInterval(async () => {
    try {
      const res = await fetch(`/api/status/${batchId}`);
      if (res.ok) {
        const data = await res.json();
        progress.value.valid = data.valid_rows;
        progress.value.invalid = data.invalid_rows;
        progress.value.text = `Processing: ${data.processed_rows} / ${data.total_rows} rows`;

        // Map backend status enum to string if needed, or check 'current_status'
        if (data.current_status === 4) {
          // STATUS_COMPLETE
          clearInterval(pollInterval);
          status.value = "complete";
          emit("upload-complete", batchId);
        } else if (data.current_status === 5) {
          // STATUS_FAILED
          clearInterval(pollInterval);
          status.value = "error";
          error.value = "Processing failed on server";
        }
      }
    } catch (e) {
      console.error(e);
    }
  }, 500);
};

onUnmounted(() => {
  if (pollInterval) clearInterval(pollInterval);
});
</script>

<template>
  <div
    class="upload-zone"
    :class="{ dragging: isDragging }"
    @dragover="onDragOver"
    @dragleave="onDragLeave"
    @drop="onDrop"
  >
    <div v-if="status === 'idle' || status === 'error'">
      <p>Drag & Drop CSV file here or</p>
      <input type="file" accept=".csv" @change="onFileSelect" />
      <p v-if="error" class="error">{{ error }}</p>
    </div>

    <div v-else>
      <div class="progress-bar">
        <div class="fill" :style="{ width: progress.percentage + '%' }"></div>
      </div>
      <p>{{ progress.text }}</p>
    </div>

    <div
      class="stats"
      v-if="
        progress.valid > 0 ||
        progress.invalid > 0 ||
        status === 'complete' ||
        status === 'processing'
      "
    >
      <span class="success">Valid: {{ progress.valid }}</span>
      <span class="bad">Invalid: {{ progress.invalid }}</span>
    </div>

    <div
      v-if="progress.invalid > 0 && status === 'complete'"
      class="error-details"
    >
      <button @click="toggleErrors" class="error-toggle">
        {{ showErrors ? "Hide" : "Show" }} Validation Errors
      </button>
      <div v-if="showErrors" class="error-list">
        <div v-if="loadingErrors" class="error-item">Loading errors...</div>
        <div v-else-if="errorsList.length === 0" class="error-item">
          No detailed errors found.
        </div>
        <div
          v-else
          v-for="(err, index) in errorsList"
          :key="index"
          class="error-item"
        >
          <strong>Row {{ err.row_number }}:</strong> {{ err.field }} - Expected
          {{ err.expected }} (Got: "{{ err.actual }}")
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.upload-zone {
  border: 2px dashed #ccc;
  border-radius: 8px;
  padding: 3rem;
  text-align: center;
  transition: all 0.2s;
}
.upload-zone.dragging {
  border-color: #4caf50;
  background: #f1f8e9;
}
.progress-bar {
  background: #eee;
  height: 20px;
  border-radius: 10px;
  overflow: hidden;
  margin: 1rem 0;
}
.fill {
  background: #2196f3;
  height: 100%;
  transition: width 0.3s;
}
.error {
  color: red;
}
.success {
  color: green;
  margin-right: 1rem;
}
.bad {
  color: red;
}
.error-details {
  margin-top: 1.5rem;
  border-top: 1px solid #ccc;
  padding-top: 1rem;
  text-align: left;
}
.error-toggle {
  background: none;
  border: none;
  color: #d32f2f;
  text-decoration: underline;
  cursor: pointer;
  padding: 0;
  font-size: 0.9rem;
}
.error-list {
  margin-top: 0.5rem;
  max-height: 200px;
  overflow-y: auto;
  background: #fff;
  border: 1px solid #f8d7da;
  border-radius: 4px;
}
.error-item {
  padding: 0.5rem;
  border-bottom: 1px solid #f1f1f1;
  font-size: 0.85rem;
}
.error-item:last-child {
  border-bottom: none;
}
</style>
