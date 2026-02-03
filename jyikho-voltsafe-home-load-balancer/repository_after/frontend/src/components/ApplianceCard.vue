<template>
  <div :class="['appliance-card', { 'is-on': appliance.is_on, 'is-toggling': isToggling }]">
    <div class="card-header">
      <div class="appliance-icon">
        {{ getApplianceIcon(appliance.name) }}
      </div>
      <div class="appliance-info">
        <h3 class="appliance-name">{{ appliance.name }}</h3>
        <span class="appliance-wattage">{{ appliance.wattage }}W</span>
      </div>
    </div>

    <div class="card-body">
      <div class="status-indicator">
        <span :class="['status-dot', appliance.is_on ? 'on' : 'off']"></span>
        <span class="status-text">{{ appliance.is_on ? 'Active' : 'Standby' }}</span>
      </div>

      <div v-if="appliance.is_on" class="power-consumption">
        <span class="consumption-label">Drawing</span>
        <span class="consumption-value">{{ appliance.wattage }}W</span>
      </div>
    </div>

    <div class="card-footer">
      <button
        @click="handleToggle"
        :disabled="isToggling"
        :class="['toggle-btn', appliance.is_on ? 'turn-off' : 'turn-on']"
      >
        <span v-if="isToggling" class="spinner"></span>
        <span v-else>
          {{ appliance.is_on ? 'Turn OFF' : 'Turn ON' }}
        </span>
      </button>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  appliance: {
    type: Object,
    required: true
  },
  isToggling: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['toggle'])

const handleToggle = () => {
  if (!props.isToggling) {
    emit('toggle', { 
      id: props.appliance.id, 
      isOn: !props.appliance.is_on 
    })
  }
}

const getApplianceIcon = (name) => {
  const nameLower = name.toLowerCase()
  if (nameLower.includes('heater')) return '🔥'
  if (nameLower.includes('ev') || nameLower.includes('charger')) return '🔌'
  if (nameLower.includes('oven')) return '🍳'
  if (nameLower.includes('water')) return '💧'
  if (nameLower.includes('air') || nameLower.includes('ac')) return '❄️'
  if (nameLower.includes('washer') || nameLower.includes('dryer')) return '👕'
  if (nameLower.includes('fridge') || nameLower.includes('refrigerator')) return '🧊'
  if (nameLower.includes('tv') || nameLower.includes('television')) return '📺'
  if (nameLower.includes('light')) return '💡'
  return '⚡'
}
</script>

<style scoped>
.appliance-card {
  background: linear-gradient(145deg, #1a1a2e, #16213e);
  border-radius: 16px;
  padding: 20px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  transition: all 0.3s ease;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.appliance-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
}

.appliance-card.is-on {
  border-color: rgba(0, 255, 136, 0.3);
  box-shadow: 0 0 20px rgba(0, 255, 136, 0.1);
}

.appliance-card.is-toggling {
  opacity: 0.8;
  pointer-events: none;
}

.card-header {
  display: flex;
  align-items: center;
  gap: 14px;
}

.appliance-icon {
  font-size: 2rem;
  width: 50px;
  height: 50px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
}

.appliance-info {
  flex: 1;
}

.appliance-name {
  font-size: 1.1rem;
  color: #fff;
  margin: 0 0 4px 0;
  font-weight: 600;
}

.appliance-wattage {
  font-size: 0.9rem;
  color: #00d4ff;
  font-weight: 500;
}

.card-body {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 0;
  border-top: 1px solid rgba(255, 255, 255, 0.05);
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.status-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
}

.status-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  transition: all 0.3s ease;
}

.status-dot.on {
  background: #00ff88;
  box-shadow: 0 0 10px #00ff88;
  animation: glow 2s infinite;
}

.status-dot.off {
  background: #555;
}

@keyframes glow {
  0%, 100% { box-shadow: 0 0 10px #00ff88; }
  50% { box-shadow: 0 0 20px #00ff88; }
}

.status-text {
  font-size: 0.9rem;
  color: #888;
}

.power-consumption {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}

.consumption-label {
  font-size: 0.75rem;
  color: #666;
}

.consumption-value {
  font-size: 1rem;
  color: #00ff88;
  font-weight: 600;
}

.card-footer {
  margin-top: auto;
}

.toggle-btn {
  width: 100%;
  padding: 12px 20px;
  border: none;
  border-radius: 10px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.toggle-btn.turn-on {
  background: linear-gradient(135deg, #00d4ff, #00ff88);
  color: #000;
}

.toggle-btn.turn-on:hover:not(:disabled) {
  transform: scale(1.02);
  box-shadow: 0 4px 15px rgba(0, 212, 255, 0.4);
}

.toggle-btn.turn-off {
  background: rgba(255, 100, 100, 0.2);
  color: #ff9999;
  border: 1px solid rgba(255, 100, 100, 0.3);
}

.toggle-btn.turn-off:hover:not(:disabled) {
  background: rgba(255, 100, 100, 0.3);
}

.toggle-btn:disabled {
  cursor: not-allowed;
  opacity: 0.7;
}

.spinner {
  width: 18px;
  height: 18px;
  border: 2px solid transparent;
  border-top-color: currentColor;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>