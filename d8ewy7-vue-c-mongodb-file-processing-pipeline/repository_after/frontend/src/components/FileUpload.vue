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
let pollInterval = null;

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
      <div
        class="stats"
        v-if="status === 'processing' || status === 'complete'"
      >
        <span class="success">Valid: {{ progress.valid }}</span>
        <span class="bad">Invalid: {{ progress.invalid }}</span>
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
</style>
