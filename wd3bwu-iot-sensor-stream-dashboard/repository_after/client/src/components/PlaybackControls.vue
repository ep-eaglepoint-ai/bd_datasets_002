<template>
  <div class="playback-controls">
    <!-- Mode Selection -->
    <div v-if="!store.isPlaybackMode" class="mode-select">
      <button class="btn btn-primary" @click="showTimePicker = true">
        Open Historical Playback
      </button>
    </div>

    <!-- Playback UI -->
    <div v-else class="playback-ui">
      <div class="playback-info">
        <span class="badg">PLAYBACK MODE</span>
        <span class="time-display">{{ formattedCurrentTime }}</span>
      </div>

      <div class="controls-row">
        <button class="btn btn-icon" @click="store.togglePlayback">
          {{ store.isPlaying ? '⏸' : '▶' }}
        </button>
        
        <input 
          type="range" 
          min="0" 
          max="100" 
          step="0.1" 
          :value="store.playbackProgress"
          @input="onScrub"
          class="scrubber"
        />
        
        <select v-model.number="store.playbackSpeed" class="speed-select">
          <option value="1">1x</option>
          <option value="2">2x</option>
          <option value="5">5x</option>
          <option value="10">10x</option>
        </select>

        <button class="btn btn-secondary" @click="store.exitPlaybackMode">
          Exit
        </button>
      </div>
    </div>

    <!-- Time Selection Modal -->
    <div v-if="showTimePicker" class="modal-overlay">
      <div class="modal">
        <h3>Select 10-Minute Window</h3>
        
        <div class="form-group">
          <label>Start Time (ISO)</label>
          <input type="datetime-local" v-model="startTimeInput" />
        </div>

        <div class="modal-actions">
          <button class="btn" @click="showTimePicker = false">Cancel</button>
          <button class="btn btn-primary" @click="startPlayback" :disabled="!startTimeInput">
            Load Data
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { useSensorStore } from '../stores/sensorStore';

const store = useSensorStore();
const showTimePicker = ref(false);
const startTimeInput = ref('');

// Helper to format timestamps
const formattedCurrentTime = computed(() => {
  return new Date(store.playbackTime).toLocaleTimeString();
});

const onScrub = (e) => {
  const percent = parseFloat(e.target.value);
  const duration = store.playbackEndTime - store.playbackStartTime;
  const time = store.playbackStartTime + (duration * (percent / 100));
  store.seekTo(time);
};

const startPlayback = async () => {
  if (!startTimeInput.value) return;
  
  const start = new Date(startTimeInput.value).getTime();
  const end = start + 10 * 60 * 1000; // 10 minutes
  
  if (isNaN(start)) {
    alert('Invalid date');
    return;
  }
  
  try {
    await store.enterPlaybackMode(start, end);
    showTimePicker.value = false;
  } catch (err) {
    alert('Failed to load data: ' + err.message);
  }
};
</script>

<style scoped>
.playback-controls {
  padding: 1rem;
  background: #f8f9fa;
  border-bottom: 1px solid #dee2e6;
}

.mode-select {
  display: flex;
  justify-content: center;
}

.playback-ui {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.playback-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-family: monospace;
}

.badg {
  background: #ffc107;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 0.8rem;
  font-weight: bold;
}

.controls-row {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.scrubber {
  flex: 1;
}

.modal-overlay {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal {
  background: white;
  padding: 2rem;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.2);
}

.form-group {
  margin: 1rem 0;
}

.btn {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  background: #e9ecef;
}

.btn-primary {
  background: #007bff;
  color: white;
}

.btn-secondary {
  background: #6c757d;
  color: white;
}

.btn-icon {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
}
</style>
