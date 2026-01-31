import { defineStore } from 'pinia'
import axios from 'axios'

const API_BASE = '/api'

export const useApplianceStore = defineStore('appliance', {
  state: () => ({
    appliances: [],
    loadStatus: {
      current_load: 0,
      max_load: 5000,
      available_capacity: 5000,
      utilization_percent: 0,
      status: 'safe'
    },
    loading: false,
    error: null,
    togglingIds: new Set()
  }),

  getters: {
    currentLoad: (state) => state.loadStatus.current_load,
    maxLoad: (state) => state.loadStatus.max_load,
    availableCapacity: (state) => state.loadStatus.available_capacity,
    utilizationPercent: (state) => state.loadStatus.utilization_percent,
    systemStatus: (state) => state.loadStatus.status,
    isNearLimit: (state) => state.loadStatus.utilization_percent >= 70,
    isCritical: (state) => state.loadStatus.utilization_percent >= 90,
    activeAppliances: (state) => state.appliances.filter(a => a.is_on),
    isToggling: (state) => (id) => state.togglingIds.has(id)
  },

  actions: {
    async fetchAppliances() {
      this.loading = true
      this.error = null
      try {
        const response = await axios.get(`${API_BASE}/appliances`)
        this.appliances = response.data
      } catch (err) {
        this.error = 'Failed to load appliances'
        console.error(err)
      } finally {
        this.loading = false
      }
    },

    async fetchLoadStatus() {
      try {
        const response = await axios.get(`${API_BASE}/load-status`)
        this.loadStatus = response.data
      } catch (err) {
        console.error('Failed to fetch load status:', err)
      }
    },

    async toggleAppliance(id, isOn) {
      if (this.togglingIds.has(id)) return

      this.togglingIds.add(id)
      this.error = null

      try {
        const response = await axios.post(`${API_BASE}/appliances/${id}/toggle`, {
          is_on: isOn
        })

        // Update local state
        const index = this.appliances.findIndex(a => a.id === id)
        if (index !== -1) {
          this.appliances[index] = response.data.appliance
        }

        // Update load status
        this.loadStatus.current_load = response.data.current_total_load
        this.loadStatus.utilization_percent = (response.data.current_total_load / this.loadStatus.max_load) * 100
        this.loadStatus.available_capacity = this.loadStatus.max_load - response.data.current_total_load

        // Update status
        if (this.loadStatus.utilization_percent >= 90) {
          this.loadStatus.status = 'critical'
        } else if (this.loadStatus.utilization_percent >= 70) {
          this.loadStatus.status = 'warning'
        } else {
          this.loadStatus.status = 'safe'
        }

        return { success: true, message: response.data.message }
      } catch (err) {
        const errorDetail = err.response?.data?.detail
        let errorMessage = 'Failed to toggle appliance'

        if (typeof errorDetail === 'object' && errorDetail.message) {
          errorMessage = errorDetail.message
        } else if (typeof errorDetail === 'string') {
          errorMessage = errorDetail
        }

        this.error = errorMessage
        return { success: false, message: errorMessage }
      } finally {
        this.togglingIds.delete(id)
      }
    },

    clearError() {
      this.error = null
    }
  }
})