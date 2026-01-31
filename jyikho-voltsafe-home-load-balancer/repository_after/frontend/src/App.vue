<template>
  <div class="app">
    <header class="header">
      <h1>⚡ VoltSafe</h1>
      <p class="subtitle">Home Load Balancer</p>
    </header>

    <main class="main">
      <LoadMeter 
        :current-load="store.currentLoad"
        :max-load="store.maxLoad"
        :status="store.systemStatus"
      />

      <div v-if="store.error" class="error-banner">
        <span>⚠️ {{ store.error }}</span>
        <button @click="store.clearError" class="dismiss-btn">×</button>
      </div>

      <div v-if="store.loading" class="loading">
        Loading appliances...
      </div>

      <div v-else class="appliances-grid">
        <ApplianceCard
          v-for="appliance in store.appliances"
          :key="appliance.id"
          :appliance="appliance"
          :is-toggling="store.isToggling(appliance.id)"
          @toggle="handleToggle"
        />
      </div>
    </main>

    <footer class="footer">
      <p>Safety Limit: {{ store.maxLoad }}W | Available: {{ store.availableCapacity.toFixed(1) }}W</p>
    </footer>
  </div>
</template>

<script setup>
import { onMounted } from 'vue'
import { useApplianceStore } from './stores/applianceStore'
import LoadMeter from './components/LoadMeter.vue'
import ApplianceCard from './components/ApplianceCard.vue'

const store = useApplianceStore()

onMounted(async () => {
  await Promise.all([
    store.fetchAppliances(),
    store.fetchLoadStatus()
  ])
})

const handleToggle = async ({ id, isOn }) => {
  await store.toggleAppliance(id, isOn)
}
</script>

<style scoped>
.app {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.header {
  text-align: center;
  padding: 30px 0;
}

.header h1 {
  font-size: 2.5rem;
  background: linear-gradient(90deg, #00d4ff, #00ff88);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  margin-bottom: 10px;
}

.subtitle {
  color: #888;
  font-size: 1.1rem;
}

.main {
  flex: 1;
}

.error-banner {
  background: rgba(255, 100, 100, 0.2);
  border: 1px solid #ff6464;
  border-radius: 8px;
  padding: 15px 20px;
  margin: 20px 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  color: #ff9999;
}

.dismiss-btn {
  background: none;
  border: none;
  color: #ff9999;
  font-size: 1.5rem;
  cursor: pointer;
}

.loading {
  text-align: center;
  padding: 50px;
  color: #888;
}

.appliances-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 20px;
  margin-top: 30px;
}

.footer {
  text-align: center;
  padding: 30px 0;
  color: #666;
  border-top: 1px solid #333;
  margin-top: 40px;
}
</style>