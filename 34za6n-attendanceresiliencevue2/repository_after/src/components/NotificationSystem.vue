<template>
  <div>
    <!-- Snackbars for notifications -->
    <v-snackbar
      v-for="notification in pendingNotifications"
      :key="notification.id"
      v-model="notification.show"
      :color="getNotificationColor(notification.type)"
      :timeout="notification.persistent ? -1 : (notification.timeout || 5000)"
      :top="true"
      :right="true"
      :multi-line="notification.message.length > 50"
      class="notification-snackbar"
      :style="{ 'margin-top': getNotificationOffset(notification) + 'px' }"
    >
      <div class="d-flex align-center">
        <v-icon class="mr-2">{{ getNotificationIcon(notification.type) }}</v-icon>
        <div class="flex-grow-1">
          {{ notification.message }}
        </div>
        
        <!-- Action button -->
        <v-btn
          v-if="notification.action"
          text
          small
          color="white"
          class="ml-2"
          @click="handleNotificationAction(notification)"
        >
          {{ notification.action.text }}
        </v-btn>
        
        <!-- Close button for persistent notifications -->
        <v-btn
          v-if="notification.persistent"
          icon
          small
          color="white"
          @click="dismissNotification(notification.id)"
        >
          <v-icon small>mdi-close</v-icon>
        </v-btn>
      </div>
    </v-snackbar>
    
    <!-- Alert for critical errors -->
    <v-alert
      v-for="notification in criticalNotifications"
      :key="`alert-${notification.id}`"
      :type="notification.type"
      dismissible
      prominent
      class="ma-4"
      @input="dismissNotification(notification.id)"
    >
      <template v-slot:prepend>
        <v-icon large>{{ getNotificationIcon(notification.type) }}</v-icon>
      </template>
      
      <div class="d-flex align-center">
        <div class="flex-grow-1">
          <div class="headline">{{ getNotificationTitle(notification.type) }}</div>
          <div>{{ notification.message }}</div>
        </div>
        
        <v-btn
          v-if="notification.action"
          :color="notification.type"
          outlined
          @click="handleNotificationAction(notification)"
        >
          {{ notification.action.text }}
        </v-btn>
      </div>
    </v-alert>
  </div>
</template>

<script>
import { mapGetters, mapActions } from 'vuex'

export default {
  name: 'NotificationSystem',
  
  data() {
    return {
      visibleNotifications: new Set()
    }
  },
  
  computed: {
    ...mapGetters('attendance', [
      'pendingNotifications'
    ]),
    
    // Separate critical notifications that should be shown as alerts
    criticalNotifications() {
      return this.pendingNotifications.filter(n => 
        n.type === 'error' && n.persistent && n.critical
      )
    },
    
    // Regular notifications shown as snackbars
    regularNotifications() {
      return this.pendingNotifications.filter(n => 
        !(n.type === 'error' && n.persistent && n.critical)
      )
    }
  },
  
  watch: {
    pendingNotifications: {
      handler(newNotifications) {
        // Auto-show new notifications
        newNotifications.forEach(notification => {
          if (!this.visibleNotifications.has(notification.id)) {
            this.$set(notification, 'show', true)
            this.visibleNotifications.add(notification.id)
          }
        })
        
        // Clean up dismissed notifications
        this.visibleNotifications.forEach(id => {
          if (!newNotifications.find(n => n.id === id)) {
            this.visibleNotifications.delete(id)
          }
        })
      },
      immediate: true,
      deep: true
    }
  },
  
  methods: {
    ...mapActions('attendance', [
      'dismissNotification'
    ]),
    
    getNotificationColor(type) {
      const colors = {
        success: 'success',
        error: 'error',
        warning: 'warning',
        info: 'info'
      }
      return colors[type] || 'info'
    },
    
    getNotificationIcon(type) {
      const icons = {
        success: 'mdi-check-circle',
        error: 'mdi-alert-circle',
        warning: 'mdi-alert',
        info: 'mdi-information'
      }
      return icons[type] || 'mdi-information'
    },
    
    getNotificationTitle(type) {
      const titles = {
        success: 'Success',
        error: 'Error',
        warning: 'Warning',
        info: 'Information'
      }
      return titles[type] || 'Notification'
    },
    
    getNotificationOffset(notification) {
      // Calculate vertical offset for stacked notifications
      const index = this.regularNotifications.findIndex(n => n.id === notification.id)
      return index * 80 // 80px spacing between notifications
    },
    
    handleNotificationAction(notification) {
      if (notification.action && notification.action.callback) {
        notification.action.callback()
      }
      
      // Dismiss the notification after action
      this.dismissNotification(notification.id)
    }
  }
}
</script>

<style scoped>
.notification-snackbar {
  position: fixed !important;
  z-index: 9999;
}

/* Ensure notifications stack properly */
.notification-snackbar .v-snack__wrapper {
  margin-bottom: 8px;
}
</style>