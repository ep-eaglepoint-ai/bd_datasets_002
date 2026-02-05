<template>
  <canvas 
    ref="canvasRef" 
    class="sparkline-canvas"
    :width="width"
    :height="height"
  ></canvas>
</template>

<script setup>
/**
 * High-Performance Sparkline Component
 * 
 * Requirement 1: The Vue.js frontend must render 50 concurrent sparklines 
 * updating at 10Hz without dropping below 60fps.
 * 
 * Optimizations:
 * - Canvas-based rendering (no DOM updates)
 * - requestAnimationFrame for paint timing
 * - Minimal reactivity (only props trigger updates)
 */

import { ref, watch, onMounted, onUnmounted } from 'vue';
import { rafThrottle } from '../utils/performanceOptimizations.js';

const props = defineProps({
  data: {
    type: Array,
    default: () => []
  },
  threshold: {
    type: Number,
    default: null
  },
  width: {
    type: Number,
    default: 250
  },
  height: {
    type: Number,
    default: 60
  },
  lineColor: {
    type: String,
    default: '#3b82f6'
  },
  alertColor: {
    type: String,
    default: '#ef4444'
  },
  thresholdColor: {
    type: String,
    default: 'rgba(239, 68, 68, 0.4)'
  },
  isAlert: {
    type: Boolean,
    default: false
  }
});

const canvasRef = ref(null);
let ctx = null;
let rafDraw = null;

// Calculate min/max for scaling
const getRange = (data) => {
  if (!data || data.length === 0) {
    return { min: 0, max: 100 };
  }
  
  let min = Infinity;
  let max = -Infinity;
  
  for (const point of data) {
    const value = typeof point === 'object' ? point.value : point;
    if (value < min) min = value;
    if (value > max) max = value;
  }
  
  // Add padding
  const padding = (max - min) * 0.1 || 10;
  return {
    min: min - padding,
    max: max + padding
  };
};

// Main draw function
const draw = () => {
  if (!ctx || !canvasRef.value) return;
  
  const canvas = canvasRef.value;
  const width = canvas.width;
  const height = canvas.height;
  const data = props.data;
  
  // Clear canvas
  ctx.clearRect(0, 0, width, height);
  
  if (!data || data.length < 2) {
    // Draw placeholder line
    ctx.strokeStyle = '#2d3748';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, height / 2);
    ctx.lineTo(width, height / 2);
    ctx.stroke();
    return;
  }
  
  const { min, max } = getRange(data);
  
  // Draw threshold line if set
  if (props.threshold !== null) {
    const thresholdY = height - ((props.threshold - min) / (max - min)) * height;
    ctx.strokeStyle = props.thresholdColor;
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(0, thresholdY);
    ctx.lineTo(width, thresholdY);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  
  // Draw sparkline
  const stepX = width / (data.length - 1);
  const color = props.isAlert ? props.alertColor : props.lineColor;
  
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.beginPath();
  
  for (let i = 0; i < data.length; i++) {
    const point = data[i];
    const value = typeof point === 'object' ? point.value : point;
    const x = i * stepX;
    const y = height - ((value - min) / (max - min)) * height;
    
    if (i === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  }
  
  ctx.stroke();
  
  // Draw gradient fill
  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, color.replace(')', ', 0.3)').replace('rgb', 'rgba'));
  gradient.addColorStop(1, color.replace(')', ', 0)').replace('rgb', 'rgba'));
  
  ctx.lineTo(width, height);
  ctx.lineTo(0, height);
  ctx.closePath();
  ctx.fillStyle = gradient;
  ctx.fill();
};

// RAF-throttled draw
const throttledDraw = rafThrottle(draw);

// Watch for data changes
watch(() => props.data, () => {
  throttledDraw();
}, { deep: false }); // Shallow watch for performance

watch(() => props.isAlert, () => {
  throttledDraw();
});

onMounted(() => {
  if (canvasRef.value) {
    ctx = canvasRef.value.getContext('2d');
    draw();
  }
});

onUnmounted(() => {
  if (throttledDraw.cancel) {
    throttledDraw.cancel();
  }
});
</script>
