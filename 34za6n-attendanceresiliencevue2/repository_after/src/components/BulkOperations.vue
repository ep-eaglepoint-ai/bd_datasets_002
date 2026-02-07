<template>
  <v-row class="mt-4">
    <v-col cols="12">
      <v-card>
        <v-card-title>
          Bulk Operations
          <v-spacer></v-spacer>
          <v-chip
            v-if="bulkOperations.status === 'loading'"
            color="primary"
            text-color="white"
            small
          >
            <v-progress-circular
              indeterminate
              size="16"
              width="2"
              class="mr-2"
            ></v-progress-circular>
            Processing...
          </v-chip>
        </v-card-title>
        
        <v-card-text>
          <v-row>
            <!-- Quick actions -->
            <v-col cols="12" md="6">
              <v-subheader>Quick Actions</v-subheader>
              <div class="d-flex flex-wrap gap-2">
                <v-btn
                  color="success"
                  :disabled="bulkOperations.status === 'loading'"
                  @click="markAllPresent"
                >
                  <v-icon left>mdi-check-all</v-icon>
                  Mark All Present
                </v-btn>
                
                <v-btn
                  color="warning"
                  :disabled="bulkOperations.status === 'loading'"
                  @click="markAbsentAsLate"
                >
                  <v-icon left>mdi-clock-alert</v-icon>
                  Absent → Late
                </v-btn>
                
                <v-btn
                  color="primary"
                  outlined
                  :disabled="bulkOperations.status === 'loading'"
                  @click="simulateNetworkIssue"
                >
                  <v-icon left>mdi-wifi-off</v-icon>
                  Test Network Failure
                </v-btn>
              </div>
            </v-col>
            
            <!-- Custom bulk operation -->
            <v-col cols="12" md="6">
              <v-subheader>Custom Bulk Update</v-subheader>
              <div class="d-flex align-center gap-2">
                <v-select
                  v-model="selectedEmployees"
                  :items="employeeOptions"
                  item-text="name"
                  item-value="id"
                  multiple
                  chips
                  deletable-chips
                  label="Select Employees"
                  dense
                  outlined
                  class="flex-grow-1"
                ></v-select>
                
                <v-select
                  v-model="bulkStatus"
                  :items="statusOptions"
                  label="Status"
                  dense
                  outlined
                  style="min-width: 120px;"
                ></v-select>
                
                <v-btn
                  color="primary"
                  :disabled="!canPerformBulkUpdate || bulkOperations.status === 'loading'"
                  @click="performCustomBulkUpdate"
                >
                  Update
                </v-btn>
              </div>
            </v-col>
          </v-row>
          
          <!-- Bulk operation status -->
          <v-row v-if="bulkOperations.status === 'error'" class="mt-2">
            <v-col cols="12">
              <v-alert
                type="error"
                dismissible
                @input="clearBulkError"
              >
                <div class="d-flex align-center">
                  <div class="flex-grow-1">
                    <strong>Bulk Operation Failed</strong>
                    <div>{{ bulkOperations.lastErrorMessage }}</div>
                  </div>
                  <v-btn
                    color="white"
                    text
                    small
                    @click="retryLastBulkOperation"
                  >
                    Retry
                  </v-btn>
                </div>
              </v-alert>
            </v-col>
          </v-row>
          
          <!-- Success feedback -->
          <v-row v-if="bulkOperations.status === 'success'" class="mt-2">
            <v-col cols="12">
              <v-alert
                type="success"
                dismissible
                @input="clearBulkSuccess"
              >
                Bulk operation completed successfully!
              </v-alert>
            </v-col>
          </v-row>
        </v-card-text>
      </v-card>
    </v-col>
  </v-row>
</template>

<script>
import { mapGetters, mapActions } from 'vuex'
import mockApi from '@/services/mockApi'

export default {
  name: 'BulkOperations',
  
  data() {
    return {
      selectedEmployees: [],
      bulkStatus: 'present',
      lastBulkOperation: null,
      
      statusOptions: [
        { text: 'Present', value: 'present' },
        { text: 'Absent', value: 'absent' },
        { text: 'Late', value: 'late' }
      ]
    }
  },
  
  computed: {
    ...mapGetters('attendance', [
      'allRecords',
      'bulkOperations'
    ]),
    
    employeeOptions() {
      return this.allRecords.map(record => ({
        id: record.id,
        name: `${record.employeeName} (${record.employeeId})`
      }))
    },
    
    canPerformBulkUpdate() {
      return this.selectedEmployees.length > 0 && this.bulkStatus
    }
  },
  
  methods: {
    ...mapActions('attendance', [
      'bulkUpdateAttendance',
      'addNotification'
    ]),
    
    async markAllPresent() {
      const updates = this.allRecords
        .filter(record => record.status !== 'present')
        .map(record => ({
          id: record.id,
          status: 'present'
        }))
      
      if (updates.length === 0) {
        this.addNotification({
          type: 'info',
          message: 'All employees are already marked as present',
          timeout: 3000
        })
        return
      }
      
      this.lastBulkOperation = { type: 'markAllPresent', updates }
      await this.bulkUpdateAttendance(updates)
    },
    
    async markAbsentAsLate() {
      const updates = this.allRecords
        .filter(record => record.status === 'absent')
        .map(record => ({
          id: record.id,
          status: 'late'
        }))
      
      if (updates.length === 0) {
        this.addNotification({
          type: 'info',
          message: 'No absent employees to mark as late',
          timeout: 3000
        })
        return
      }
      
      this.lastBulkOperation = { type: 'markAbsentAsLate', updates }
      await this.bulkUpdateAttendance(updates)
    },
    
    async performCustomBulkUpdate() {
      const updates = this.selectedEmployees.map(employeeId => ({
        id: employeeId,
        status: this.bulkStatus
      }))
      
      this.lastBulkOperation = { type: 'custom', updates }
      await this.bulkUpdateAttendance(updates)
      
      // Clear selection after successful operation
      if (this.bulkOperations.status === 'success') {
        this.selectedEmployees = []
      }
    },
    
    async simulateNetworkIssue() {
      // Temporarily increase failure rate to simulate network issues
      const originalFailureRate = mockApi.failureRate
      mockApi.setFailureRate(0.8) // 80% failure rate
      
      this.addNotification({
        type: 'info',
        message: 'Simulating network issues (80% failure rate)',
        timeout: 3000
      })
      
      // Perform a bulk operation that will likely fail
      await this.markAllPresent()
      
      // Reset failure rate after a delay
      setTimeout(() => {
        mockApi.setFailureRate(originalFailureRate)
        this.addNotification({
          type: 'info',
          message: 'Network simulation ended - normal failure rate restored',
          timeout: 3000
        })
      }, 5000)
    },
    
    async retryLastBulkOperation() {
      if (this.lastBulkOperation) {
        await this.bulkUpdateAttendance(this.lastBulkOperation.updates)
      }
    },
    
    clearBulkError() {
      // The error will be cleared when the next operation starts
    },
    
    clearBulkSuccess() {
      // The success status will be cleared when the next operation starts
    }
  }
}
</script>

<style scoped>
.gap-2 > * {
  margin-right: 8px;
  margin-bottom: 8px;
}

.gap-2 > *:last-child {
  margin-right: 0;
}
</style>