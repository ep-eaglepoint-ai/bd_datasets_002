<template>
  <v-card class="mb-4">
    <v-card-title>
      <v-icon left>mdi-filter</v-icon>
      Filters
      <v-spacer></v-spacer>
      <v-btn
        v-if="hasActiveFilters"
        text
        small
        color="primary"
        @click="clearAllFilters"
      >
        <v-icon left small>mdi-filter-remove</v-icon>
        Clear All
      </v-btn>
    </v-card-title>
    
    <v-card-text>
      <v-row>
        <!-- Department Filter -->
        <v-col cols="12" md="3">
          <v-select
            v-model="selectedDepartment"
            :items="departmentOptions"
            label="Department"
            clearable
            outlined
            dense
            @change="updateDepartmentFilter"
          >
            <template v-slot:prepend-inner>
              <v-icon>mdi-office-building</v-icon>
            </template>
          </v-select>
        </v-col>
        
        <!-- Status Filter -->
        <v-col cols="12" md="3">
          <v-select
            v-model="selectedStatus"
            :items="statusOptions"
            label="Status"
            clearable
            outlined
            dense
            @change="updateStatusFilter"
          >
            <template v-slot:prepend-inner>
              <v-icon>mdi-account-check</v-icon>
            </template>
          </v-select>
        </v-col>
        
        <!-- Date Range Filter -->
        <v-col cols="12" md="6">
          <v-row>
            <v-col cols="6">
              <v-text-field
                v-model="startDate"
                label="Start Date"
                type="date"
                outlined
                dense
                @change="updateDateRangeFilter"
              >
                <template v-slot:prepend-inner>
                  <v-icon>mdi-calendar-start</v-icon>
                </template>
              </v-text-field>
            </v-col>
            <v-col cols="6">
              <v-text-field
                v-model="endDate"
                label="End Date"
                type="date"
                outlined
                dense
                @change="updateDateRangeFilter"
              >
                <template v-slot:prepend-inner>
                  <v-icon>mdi-calendar-end</v-icon>
                </template>
              </v-text-field>
            </v-col>
          </v-row>
        </v-col>
      </v-row>
      
      <!-- Active Filters Display -->
      <v-row v-if="hasActiveFilters" class="mt-2">
        <v-col cols="12">
          <v-subheader class="pl-0">Active Filters:</v-subheader>
          <div class="d-flex flex-wrap gap-2">
            <v-chip
              v-if="selectedDepartment"
              small
              close
              color="primary"
              @click:close="clearDepartmentFilter"
            >
              <v-icon left small>mdi-office-building</v-icon>
              {{ selectedDepartment }}
            </v-chip>
            
            <v-chip
              v-if="selectedStatus"
              small
              close
              :color="getStatusColor(selectedStatus)"
              @click:close="clearStatusFilter"
            >
              <v-icon left small>{{ getStatusIcon(selectedStatus) }}</v-icon>
              {{ selectedStatus.replace('_', ' ').toUpperCase() }}
            </v-chip>
            
            <v-chip
              v-if="startDate || endDate"
              small
              close
              color="info"
              @click:close="clearDateRangeFilter"
            >
              <v-icon left small>mdi-calendar-range</v-icon>
              {{ formatDateRange }}
            </v-chip>
          </div>
        </v-col>
      </v-row>
    </v-card-text>
  </v-card>
</template>

<script>
import { mapGetters, mapActions } from 'vuex'

export default {
  name: 'FilterPanel',
  
  data() {
    return {
      selectedDepartment: null,
      selectedStatus: null,
      startDate: null,
      endDate: null,
      
      statusOptions: [
        { text: 'Present', value: 'present' },
        { text: 'Absent', value: 'absent' },
        { text: 'Late', value: 'late' },
        { text: 'Active', value: 'active' },
        { text: 'On Break', value: 'on_break' },
        { text: 'Clocked Out', value: 'clocked_out' }
      ]
    }
  },
  
  computed: {
    ...mapGetters('attendance', [
      'departments',
      'currentFilters'
    ]),
    
    departmentOptions() {
      return this.departments.map(dept => ({
        text: dept,
        value: dept
      }))
    },
    
    hasActiveFilters() {
      return this.selectedDepartment || 
             this.selectedStatus || 
             this.startDate || 
             this.endDate
    },
    
    formatDateRange() {
      if (this.startDate && this.endDate) {
        return `${this.startDate} to ${this.endDate}`
      } else if (this.startDate) {
        return `From ${this.startDate}`
      } else if (this.endDate) {
        return `Until ${this.endDate}`
      }
      return ''
    }
  },
  
  watch: {
    currentFilters: {
      handler(newFilters) {
        this.selectedDepartment = newFilters.department
        this.selectedStatus = newFilters.status
        this.startDate = newFilters.dateRange.start
        this.endDate = newFilters.dateRange.end
      },
      immediate: true,
      deep: true
    }
  },
  
  methods: {
    ...mapActions('attendance', [
      'setDepartmentFilter',
      'setStatusFilter', 
      'setDateRangeFilter',
      'clearFilters'
    ]),
    
    updateDepartmentFilter() {
      this.setDepartmentFilter(this.selectedDepartment)
    },
    
    updateStatusFilter() {
      this.setStatusFilter(this.selectedStatus)
    },
    
    updateDateRangeFilter() {
      this.setDateRangeFilter({
        start: this.startDate,
        end: this.endDate
      })
    },
    
    clearDepartmentFilter() {
      this.selectedDepartment = null
      this.updateDepartmentFilter()
    },
    
    clearStatusFilter() {
      this.selectedStatus = null
      this.updateStatusFilter()
    },
    
    clearDateRangeFilter() {
      this.startDate = null
      this.endDate = null
      this.updateDateRangeFilter()
    },
    
    clearAllFilters() {
      this.clearFilters()
    },
    
    getStatusColor(status) {
      const colors = {
        present: 'success',
        absent: 'error',
        late: 'warning',
        active: 'primary',
        on_break: 'info',
        clocked_out: 'grey'
      }
      return colors[status] || 'grey'
    },
    
    getStatusIcon(status) {
      const icons = {
        present: 'mdi-check-circle',
        absent: 'mdi-close-circle',
        late: 'mdi-clock-alert',
        active: 'mdi-account-clock',
        on_break: 'mdi-coffee',
        clocked_out: 'mdi-logout'
      }
      return icons[status] || 'mdi-help-circle'
    }
  }
}
</script>

<style scoped>
.gap-2 > * {
  margin-right: 8px;
  margin-bottom: 4px;
}
</style>