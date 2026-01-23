<template>
  <v-app>
    <v-app-bar app color="primary" dark>
      <v-toolbar-title>
        <v-icon left>mdi-account-clock</v-icon>
        Enterprise Attendance System
      </v-toolbar-title>
      
      <v-spacer></v-spacer>
      
      <!-- Operations in progress indicator -->
      <v-chip
        v-if="hasOperationsInProgress"
        color="warning"
        text-color="white"
        small
      >
        <v-progress-circular
          indeterminate
          size="16"
          width="2"
          class="mr-2"
        ></v-progress-circular>
        Operations in progress
      </v-chip>
      
      <!-- Retry queue indicator -->
      <v-badge
        v-if="retryQueue.length > 0"
        :content="retryQueue.length"
        color="error"
        overlap
      >
        <v-btn
          icon
          @click="showRetryDialog = true"
          title="Failed operations - click to retry"
        >
          <v-icon>mdi-alert-circle</v-icon>
        </v-btn>
      </v-badge>
    </v-app-bar>

    <v-main>
      <v-container fluid>
        <!-- Loading skeleton for initial load -->
        <template v-if="isLoadingRecords && allRecords.length === 0">
          <v-row>
            <v-col cols="12">
              <v-skeleton-loader
                type="table-heading, table-tbody"
                class="mx-auto"
              ></v-skeleton-loader>
            </v-col>
          </v-row>
        </template>
        
        <!-- Main content -->
        <template v-else>
          <!-- Header with actions -->
          <v-row>
            <v-col cols="12">
              <v-card>
                <v-card-title>
                  Attendance Records
                  <v-spacer></v-spacer>
                  <v-btn
                    color="primary"
                    @click="refreshData"
                    :loading="isLoadingRecords"
                  >
                    <v-icon left>mdi-refresh</v-icon>
                    Refresh
                  </v-btn>
                </v-card-title>
              </v-card>
            </v-col>
          </v-row>
          
          <!-- Attendance records -->
          <AttendanceList />
          
          <!-- Bulk operations -->
          <BulkOperations />
        </template>
      </v-container>
    </v-main>

    <!-- Notifications -->
    <NotificationSystem />
    
    <!-- Retry dialog -->
    <RetryDialog
      v-model="showRetryDialog"
      :retry-queue="retryQueue"
      @retry="handleRetry"
      @clear="clearRetryQueue"
    />
  </v-app>
</template>

<script>
import { mapGetters, mapActions } from 'vuex'
import AttendanceList from '@/components/AttendanceList.vue'
import BulkOperations from '@/components/BulkOperations.vue'
import NotificationSystem from '@/components/NotificationSystem.vue'
import RetryDialog from '@/components/RetryDialog.vue'

export default {
  name: 'App',
  
  components: {
    AttendanceList,
    BulkOperations,
    NotificationSystem,
    RetryDialog
  },
  
  data() {
    return {
      showRetryDialog: false
    }
  },
  
  computed: {
    ...mapGetters('attendance', [
      'allRecords',
      'isLoadingRecords',
      'hasOperationsInProgress',
      'retryQueue'
    ])
  },
  
  methods: {
    ...mapActions('attendance', [
      'fetchAttendanceRecords',
      'retryOperation',
      'clearRetryQueue',
      'cleanupNotifications'
    ]),
    
    async refreshData() {
      await this.fetchAttendanceRecords()
    },
    
    async handleRetry(operation) {
      await this.retryOperation(operation)
      
      // Close dialog if no more operations
      if (this.retryQueue.length === 0) {
        this.showRetryDialog = false
      }
    }
  },
  
  async created() {
    // Load initial data
    await this.fetchAttendanceRecords()
    
    // Set up cleanup interval for notifications
    this.cleanupInterval = setInterval(() => {
      this.cleanupNotifications()
    }, 10000) // Clean up every 10 seconds
  },
  
  beforeDestroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
    }
  }
}
</script>

<style>
.v-application {
  font-family: 'Roboto', sans-serif;
}

.v-chip--small .v-progress-circular {
  margin-right: 4px !important;
}
</style>