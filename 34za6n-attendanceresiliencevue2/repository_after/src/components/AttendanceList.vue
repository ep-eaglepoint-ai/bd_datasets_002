<template>
  <v-row>
    <v-col cols="12">
      <v-card>
        <v-card-title>
          Daily Attendance - {{ currentDate }}
        </v-card-title>
        
        <v-data-table
          :headers="headers"
          :items="allRecords"
          :loading="isLoadingRecords"
          class="elevation-1"
          item-key="id"
        >
          <!-- Employee name column -->
          <template v-slot:item.employeeName="{ item }">
            <div class="d-flex align-center">
              <v-avatar size="32" class="mr-3">
                <v-icon>mdi-account</v-icon>
              </v-avatar>
              <div>
                <div class="font-weight-medium">{{ item.employeeName }}</div>
                <div class="text-caption text--secondary">{{ item.employeeId }}</div>
                <div class="text-caption text--secondary">{{ item.department }}</div>
              </div>
            </div>
          </template>
          
          <!-- Status column with loading indicators -->
          <template v-slot:item.status="{ item }">
            <div class="d-flex align-center">
              <!-- Loading indicator for individual record operations -->
              <v-progress-circular
                v-if="getRecordOperationStatus(item.id) === 'loading'"
                indeterminate
                size="20"
                width="2"
                color="primary"
                class="mr-2"
              ></v-progress-circular>
              
              <!-- Status chip -->
              <v-chip
                :color="getStatusColor(item.status)"
                :text-color="getStatusTextColor(item.status)"
                small
                :class="{ 'opacity-60': getRecordOperationStatus(item.id) === 'loading' }"
              >
                <v-icon left small>{{ getStatusIcon(item.status) }}</v-icon>
                {{ item.status.toUpperCase() }}
              </v-chip>
              
              <!-- Error indicator -->
              <v-tooltip bottom v-if="getRecordOperationStatus(item.id) === 'error'">
                <template v-slot:activator="{ on, attrs }">
                  <v-icon
                    color="error"
                    small
                    class="ml-2"
                    v-bind="attrs"
                    v-on="on"
                  >
                    mdi-alert-circle
                  </v-icon>
                </template>
                <span>Operation failed - check retry queue</span>
              </v-tooltip>
            </div>
          </template>
          
          <!-- Check-in time column -->
          <template v-slot:item.checkInTime="{ item }">
            <span v-if="item.checkInTime" class="font-weight-medium">
              {{ item.checkInTime }}
            </span>
            <span v-else class="text--disabled">
              --:--
            </span>
          </template>
          
          <!-- Check-out time column -->
          <template v-slot:item.checkOutTime="{ item }">
            <span v-if="item.checkOutTime" class="font-weight-medium">
              {{ item.checkOutTime }}
            </span>
            <span v-else class="text--disabled">
              --:--
            </span>
          </template>
          
          <!-- Hours worked column -->
          <template v-slot:item.hoursWorked="{ item }">
            <div v-if="getTotalHours(item.id) > 0">
              <div class="font-weight-medium">
                {{ getTotalHours(item.id).toFixed(1) }}h
              </div>
              <div v-if="getOvertimeHours(item.id) > 0" class="text-caption text--warning">
                +{{ getOvertimeHours(item.id).toFixed(1) }}h OT
              </div>
            </div>
            <span v-else class="text--disabled">--</span>
          </template>
          
          <!-- Actions column -->
          <template v-slot:item.actions="{ item }">
            <div class="d-flex gap-2 flex-wrap">
              <!-- Clock In/Out buttons -->
              <v-btn
                v-if="item.status !== 'active' && item.status !== 'clocked_out'"
                small
                color="primary"
                :disabled="getRecordOperationStatus(item.id) === 'loading'"
                @click="clockIn(item.id)"
              >
                <v-icon small left>mdi-login</v-icon>
                Clock In
              </v-btn>
              
              <v-btn
                v-if="item.status === 'active'"
                small
                color="warning"
                :disabled="getRecordOperationStatus(item.id) === 'loading'"
                @click="clockOut(item.id)"
              >
                <v-icon small left>mdi-logout</v-icon>
                Clock Out
              </v-btn>
              
              <!-- Status toggle buttons -->
              <v-btn
                v-if="item.status !== 'present'"
                small
                color="success"
                :disabled="getRecordOperationStatus(item.id) === 'loading'"
                @click="toggleAttendance(item.id, 'present')"
              >
                <v-icon small left>mdi-check</v-icon>
                Present
              </v-btn>
              
              <v-btn
                v-if="item.status !== 'absent'"
                small
                color="error"
                :disabled="getRecordOperationStatus(item.id) === 'loading'"
                @click="toggleAttendance(item.id, 'absent')"
              >
                <v-icon small left>mdi-close</v-icon>
                Absent
              </v-btn>
              
              <v-btn
                v-if="item.status !== 'on_break'"
                small
                color="info"
                :disabled="getRecordOperationStatus(item.id) === 'loading'"
                @click="toggleAttendance(item.id, 'on_break')"
              >
                <v-icon small left>mdi-coffee</v-icon>
                Break
              </v-btn>
              
              <!-- Retry button for failed operations -->
              <v-btn
                v-if="getRecordOperationStatus(item.id) === 'error'"
                small
                color="primary"
                outlined
                @click="retryLastOperation(item.id)"
              >
                <v-icon small left>mdi-refresh</v-icon>
                Retry
              </v-btn>
            </div>
          </template>
          
          <!-- Loading overlay -->
          <template v-slot:loading>
            <v-skeleton-loader
              type="table-row@5"
            ></v-skeleton-loader>
          </template>
        </v-data-table>
      </v-card>
    </v-col>
  </v-row>
</template>

<script>
import { mapGetters, mapActions } from 'vuex'

export default {
  name: 'AttendanceList',
  
  data() {
    return {
      headers: [
        {
          text: 'Employee',
          value: 'employeeName',
          sortable: true,
          width: '250px'
        },
        {
          text: 'Status',
          value: 'status',
          sortable: true,
          width: '150px'
        },
        {
          text: 'Check-in Time',
          value: 'checkInTime',
          sortable: true,
          width: '120px'
        },
        {
          text: 'Check-out Time',
          value: 'checkOutTime',
          sortable: true,
          width: '120px'
        },
        {
          text: 'Hours Worked',
          value: 'hoursWorked',
          sortable: false,
          width: '120px'
        },
        {
          text: 'Actions',
          value: 'actions',
          sortable: false,
          width: '400px'
        }
      ]
    }
  },
  
  computed: {
    ...mapGetters('attendance', [
      'allRecords',
      'isLoadingRecords',
      'getRecordOperationStatus',
      'getTotalHours',
      'getOvertimeHours'
    ]),
    
    currentDate() {
      return new Date().toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    }
  },
  
  methods: {
    ...mapActions('attendance', [
      'toggleAttendance',
      'clearRecordOperation',
      'clockIn',
      'clockOut'
    ]),
    
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
    
    getStatusTextColor(status) {
      return 'white'
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
    },
    
    async retryLastOperation(recordId) {
      // Clear the error status and retry the last known operation
      // In a real app, you'd store the last operation details
      this.clearRecordOperation(recordId)
      
      // For demo purposes, we'll just toggle to present
      // In production, you'd store the intended operation
      await this.toggleAttendance(recordId, 'present')
    }
  }
}
</script>

<style scoped>
.opacity-60 {
  opacity: 0.6;
}

.gap-2 > * {
  margin-right: 8px;
}

.gap-2 > *:last-child {
  margin-right: 0;
}
</style>