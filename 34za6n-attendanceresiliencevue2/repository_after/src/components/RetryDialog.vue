<template>
  <v-dialog
    :value="value"
    @input="$emit('input', $event)"
    max-width="600px"
    persistent
  >
    <v-card>
      <v-card-title class="headline">
        <v-icon left color="error">mdi-alert-circle</v-icon>
        Failed Operations
        <v-spacer></v-spacer>
        <v-chip color="error" text-color="white" small>
          {{ retryQueue.length }} failed
        </v-chip>
      </v-card-title>
      
      <v-card-text>
        <div v-if="retryQueue.length === 0" class="text-center py-4">
          <v-icon size="64" color="success">mdi-check-circle</v-icon>
          <div class="mt-2 text-h6">All operations completed successfully!</div>
        </div>
        
        <div v-else>
          <p class="mb-4">
            The following operations failed and can be retried:
          </p>
          
          <v-list>
            <v-list-item
              v-for="operation in retryQueue"
              :key="operation.id"
              class="px-0"
            >
              <v-list-item-avatar>
                <v-icon color="error">mdi-alert-circle</v-icon>
              </v-list-item-avatar>
              
              <v-list-item-content>
                <v-list-item-title>
                  {{ operation.description }}
                </v-list-item-title>
                <v-list-item-subtitle>
                  Failed {{ getTimeAgo(operation.timestamp) }}
                </v-list-item-subtitle>
              </v-list-item-content>
              
              <v-list-item-action>
                <v-btn
                  color="primary"
                  small
                  outlined
                  @click="$emit('retry', operation)"
                >
                  <v-icon left small>mdi-refresh</v-icon>
                  Retry
                </v-btn>
              </v-list-item-action>
            </v-list-item>
          </v-list>
        </div>
      </v-card-text>
      
      <v-card-actions>
        <v-btn
          v-if="retryQueue.length > 0"
          color="primary"
          @click="retryAll"
        >
          <v-icon left>mdi-refresh-circle</v-icon>
          Retry All
        </v-btn>
        
        <v-btn
          v-if="retryQueue.length > 0"
          color="error"
          text
          @click="$emit('clear')"
        >
          <v-icon left>mdi-delete</v-icon>
          Clear All
        </v-btn>
        
        <v-spacer></v-spacer>
        
        <v-btn
          color="grey darken-1"
          text
          @click="$emit('input', false)"
        >
          Close
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script>
export default {
  name: 'RetryDialog',
  
  props: {
    value: {
      type: Boolean,
      default: false
    },
    retryQueue: {
      type: Array,
      default: () => []
    }
  },
  
  methods: {
    getTimeAgo(timestamp) {
      const now = Date.now()
      const diff = now - timestamp
      const seconds = Math.floor(diff / 1000)
      const minutes = Math.floor(seconds / 60)
      const hours = Math.floor(minutes / 60)
      
      if (hours > 0) {
        return `${hours} hour${hours > 1 ? 's' : ''} ago`
      } else if (minutes > 0) {
        return `${minutes} minute${minutes > 1 ? 's' : ''} ago`
      } else {
        return `${seconds} second${seconds > 1 ? 's' : ''} ago`
      }
    },
    
    async retryAll() {
      // Retry all operations in sequence
      for (const operation of this.retryQueue) {
        await new Promise(resolve => {
          this.$emit('retry', operation)
          // Small delay between retries to avoid overwhelming the system
          setTimeout(resolve, 100)
        })
      }
    }
  }
}
</script>

<style scoped>
.v-list-item {
  border-bottom: 1px solid rgba(0, 0, 0, 0.12);
}

.v-list-item:last-child {
  border-bottom: none;
}
</style>