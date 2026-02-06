<template>
  <div v-if="isVisible" class="conversion-progress">
    <div class="progress-header">
      <h3 class="progress-title">
        {{ progress?.stage === 'complete' ? 'Conversion Complete!' : 'Converting to PDF...' }}
      </h3>
      <div class="progress-percentage">
        {{ progressPercentage }}%
      </div>
    </div>
    
    <div class="progress-bar-container">
      <div 
        class="progress-bar"
        :style="{ width: `${progressPercentage}%` }"
        :class="{ 'complete': progress?.stage === 'complete' }"
      ></div>
    </div>
    
    <div class="progress-details">
      <p class="progress-message">
        {{ progress?.message || 'Preparing...' }}
      </p>
      <p class="progress-count">
        {{ progress?.current || 0 }} of {{ progress?.total || 0 }} images
      </p>
    </div>
    
    <div class="progress-stages">
      <div 
        class="stage"
        :class="{ 
          'active': progress?.stage === 'compressing',
          'complete': isStageComplete('compressing')
        }"
      >
        <div class="stage-icon">
          <svg v-if="isStageComplete('compressing')" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="20,6 9,17 4,12"/>
          </svg>
          <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="3"/>
            <path d="M12 1v6m0 6v6m11-7h-6m-6 0H1"/>
          </svg>
        </div>
        <span class="stage-label">Compressing Images</span>
      </div>
      
      <div 
        class="stage"
        :class="{ 
          'active': progress?.stage === 'generating',
          'complete': isStageComplete('generating')
        }"
      >
        <div class="stage-icon">
          <svg v-if="isStageComplete('generating')" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="20,6 9,17 4,12"/>
          </svg>
          <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14,2 14,8 20,8"/>
            <line x1="16" y1="13" x2="8" y2="13"/>
            <line x1="16" y1="17" x2="8" y2="17"/>
            <polyline points="10,9 9,9 8,9"/>
          </svg>
        </div>
        <span class="stage-label">Generating PDF</span>
      </div>
      
      <div 
        class="stage"
        :class="{ 
          'active': progress?.stage === 'complete',
          'complete': progress?.stage === 'complete'
        }"
      >
        <div class="stage-icon">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="7,10 12,15 17,10"/>
            <line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
        </div>
        <span class="stage-label">Download Ready</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { ConversionProgress } from '@/types'

interface Props {
  progress: ConversionProgress | null
  progressPercentage: number
  isGenerating: boolean
}

const props = defineProps<Props>()

const isVisible = computed(() => props.isGenerating || props.progress?.stage === 'complete')

function isStageComplete(stage: ConversionProgress['stage']): boolean {
  if (!props.progress) return false
  
  const stages: ConversionProgress['stage'][] = ['compressing', 'generating', 'complete']
  const currentIndex = stages.indexOf(props.progress.stage)
  const stageIndex = stages.indexOf(stage)
  
  return currentIndex > stageIndex || (currentIndex === stageIndex && props.progressPercentage === 100)
}
</script>

<style scoped>
.conversion-progress {
  background: white;
  border-radius: 0.5rem;
  padding: 1.5rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  border: 1px solid #e5e7eb;
}

.progress-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.progress-title {
  font-size: 1.125rem;
  font-weight: 600;
  color: #1f2937;
  margin: 0;
}

.progress-percentage {
  font-size: 1.5rem;
  font-weight: 700;
  color: #007bff;
}

.progress-bar-container {
  width: 100%;
  height: 0.75rem;
  background-color: #e5e7eb;
  border-radius: 0.375rem;
  overflow: hidden;
  margin-bottom: 1rem;
}

.progress-bar {
  height: 100%;
  background: linear-gradient(90deg, #007bff 0%, #0056b3 100%);
  border-radius: 0.375rem;
  transition: width 0.3s ease;
  position: relative;
}

.progress-bar.complete {
  background: linear-gradient(90deg, #28a745 0%, #20c997 100%);
}

.progress-bar::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(
    90deg,
    transparent 0%,
    rgba(255, 255, 255, 0.3) 50%,
    transparent 100%
  );
  animation: shimmer 2s infinite;
}

@keyframes shimmer {
  0% {
    transform: translateX(-100%);
  }
  100% {
    transform: translateX(100%);
  }
}

.progress-details {
  margin-bottom: 1.5rem;
}

.progress-message {
  font-weight: 500;
  color: #374151;
  margin-bottom: 0.25rem;
  font-size: 0.875rem;
}

.progress-count {
  color: #6b7280;
  font-size: 0.75rem;
  margin: 0;
}

.progress-stages {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
}

.stage {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex: 1;
  padding: 0.75rem;
  border-radius: 0.375rem;
  transition: all 0.3s ease;
  background-color: #f9fafb;
  border: 1px solid #e5e7eb;
}

.stage.active {
  background-color: #eff6ff;
  border-color: #007bff;
  color: #007bff;
}

.stage.complete {
  background-color: #f0f9ff;
  border-color: #28a745;
  color: #28a745;
}

.stage-icon {
  margin-bottom: 0.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
}

.stage.active .stage-icon svg {
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

.stage-label {
  font-size: 0.75rem;
  font-weight: 500;
  text-align: center;
  line-height: 1.2;
}

@media (prefers-color-scheme: dark) {
  .conversion-progress {
    background: #2d3748;
    border-color: #4b5563;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
  }
  
  .progress-title {
    color: #f3f4f6;
  }
  
  .progress-percentage {
    color: #60a5fa;
  }
  
  .progress-bar-container {
    background-color: #374151;
  }
  
  .progress-message {
    color: #d1d5db;
  }
  
  .progress-count {
    color: #9ca3af;
  }
  
  .stage {
    background-color: #374151;
    border-color: #4b5563;
    color: #d1d5db;
  }
  
  .stage.active {
    background-color: #1e3a8a;
    border-color: #3b82f6;
    color: #93c5fd;
  }
  
  .stage.complete {
    background-color: #064e3b;
    border-color: #10b981;
    color: #6ee7b7;
  }
}

@media (max-width: 768px) {
  .conversion-progress {
    padding: 1rem;
  }
  
  .progress-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }
  
  .progress-percentage {
    font-size: 1.25rem;
  }
  
  .progress-stages {
    flex-direction: column;
    gap: 0.5rem;
  }
  
  .stage {
    flex-direction: row;
    justify-content: flex-start;
    text-align: left;
  }
  
  .stage-icon {
    margin-bottom: 0;
    margin-right: 0.75rem;
  }
}
</style>