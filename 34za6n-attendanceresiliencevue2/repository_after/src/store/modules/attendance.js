import mockApi from '@/services/mockApi'

// State machine status constants
export const STATUS = {
  IDLE: 'idle',
  LOADING: 'loading',
  SUCCESS: 'success',
  ERROR: 'error'
}

// Helper function to create async entity structure
const createAsyncEntity = (initialData = null) => ({
  data: initialData,
  status: STATUS.IDLE,
  lastErrorMessage: null
})

// Helper function to normalize records by ID
const normalizeRecords = (records) => {
  return records.reduce((acc, record) => {
    acc[record.id] = record
    return acc
  }, {})
}

const state = {
  // Normalized attendance records by ID
  records: createAsyncEntity({}),
  
  // Individual record operations (for optimistic updates)
  recordOperations: {},
  
  // Bulk operations
  bulkOperations: createAsyncEntity(null),
  
  // UI state
  notifications: [],
  
  // Retry queue for failed operations
  retryQueue: []
}

const getters = {
  // Get all records as array
  allRecords: (state) => {
    if (!state.records.data) return []
    return Object.values(state.records.data)
  },
  
  // Get record by ID
  getRecordById: (state) => (id) => {
    return state.records.data ? state.records.data[id] : null
  },
  
  // Get records loading status
  isLoadingRecords: (state) => {
    return state.records.status === STATUS.LOADING
  },
  
  // Get individual record operation status
  getRecordOperationStatus: (state) => (id) => {
    const operation = state.recordOperations[id]
    return operation ? operation.status : STATUS.IDLE
  },
  
  // Check if any operations are in progress
  hasOperationsInProgress: (state) => {
    return Object.values(state.recordOperations).some(op => op.status === STATUS.LOADING) ||
           state.bulkOperations.status === STATUS.LOADING
  },
  
  // Get pending notifications
  pendingNotifications: (state) => {
    return state.notifications.filter(n => !n.dismissed)
  },
  
  // Get retry queue
  retryQueue: (state) => state.retryQueue
}

const mutations = {
  // Records mutations
  SET_RECORDS_STATUS(state, status) {
    state.records.status = status
  },
  
  SET_RECORDS_DATA(state, records) {
    state.records.data = normalizeRecords(records)
    state.records.status = STATUS.SUCCESS
    state.records.lastErrorMessage = null
  },
  
  SET_RECORDS_ERROR(state, errorMessage) {
    state.records.status = STATUS.ERROR
    state.records.lastErrorMessage = errorMessage
  },
  
  // Individual record operation mutations
  SET_RECORD_OPERATION_STATUS(state, { id, status, errorMessage = null }) {
    Vue.set(state.recordOperations, id, {
      status,
      lastErrorMessage: errorMessage,
      timestamp: Date.now()
    })
  },
  
  CLEAR_RECORD_OPERATION(state, id) {
    Vue.delete(state.recordOperations, id)
  },
  
  // Optimistic update mutations
  OPTIMISTIC_UPDATE_RECORD(state, { id, updates, previousState }) {
    if (state.records.data && state.records.data[id]) {
      // Store previous state for rollback
      Vue.set(state.recordOperations, id, {
        ...state.recordOperations[id],
        previousState,
        optimisticUpdate: true
      })
      
      // Apply optimistic update
      Vue.set(state.records.data, id, {
        ...state.records.data[id],
        ...updates
      })
    }
  },
  
  ROLLBACK_OPTIMISTIC_UPDATE(state, { id, previousState }) {
    if (state.records.data && previousState) {
      Vue.set(state.records.data, id, previousState)
    }
    // Clear the operation
    Vue.delete(state.recordOperations, id)
  },
  
  CONFIRM_OPTIMISTIC_UPDATE(state, { id, serverData }) {
    if (state.records.data) {
      Vue.set(state.records.data, id, serverData)
    }
    // Clear the operation
    Vue.delete(state.recordOperations, id)
  },
  
  // Bulk operations mutations
  SET_BULK_OPERATION_STATUS(state, { status, errorMessage = null }) {
    state.bulkOperations.status = status
    state.bulkOperations.lastErrorMessage = errorMessage
  },
  
  // Notification mutations
  ADD_NOTIFICATION(state, notification) {
    const id = Date.now() + Math.random()
    state.notifications.push({
      id,
      ...notification,
      dismissed: false,
      timestamp: Date.now()
    })
  },
  
  DISMISS_NOTIFICATION(state, id) {
    const notification = state.notifications.find(n => n.id === id)
    if (notification) {
      notification.dismissed = true
    }
  },
  
  CLEAR_OLD_NOTIFICATIONS(state) {
    const cutoff = Date.now() - 30000 // 30 seconds
    state.notifications = state.notifications.filter(n => 
      !n.dismissed || n.timestamp > cutoff
    )
  },
  
  // Retry queue mutations
  ADD_TO_RETRY_QUEUE(state, operation) {
    state.retryQueue.push({
      id: Date.now() + Math.random(),
      ...operation,
      timestamp: Date.now()
    })
  },
  
  REMOVE_FROM_RETRY_QUEUE(state, operationId) {
    state.retryQueue = state.retryQueue.filter(op => op.id !== operationId)
  },
  
  CLEAR_RETRY_QUEUE(state) {
    state.retryQueue = []
  }
}

const actions = {
  // Fetch all attendance records
  async fetchAttendanceRecords({ commit, dispatch }) {
    commit('SET_RECORDS_STATUS', STATUS.LOADING)
    
    try {
      const response = await mockApi.fetchAttendanceRecords()
      commit('SET_RECORDS_DATA', response.data)
      
      // Clear any previous error notifications
      dispatch('addNotification', {
        type: 'success',
        message: 'Attendance records loaded successfully',
        timeout: 3000
      })
      
    } catch (error) {
      commit('SET_RECORDS_ERROR', error.message)
      
      // Add to retry queue
      commit('ADD_TO_RETRY_QUEUE', {
        action: 'fetchAttendanceRecords',
        params: [],
        description: 'Fetch attendance records'
      })
      
      dispatch('addNotification', {
        type: 'error',
        message: `Failed to load attendance records: ${error.message}`,
        persistent: true,
        action: {
          text: 'Retry',
          callback: () => dispatch('fetchAttendanceRecords')
        }
      })
    }
  },
  
  // Toggle attendance with optimistic updates and rollback
  async toggleAttendance({ commit, dispatch, getters }, { id, newStatus }) {
    const currentRecord = getters.getRecordById(id)
    if (!currentRecord) {
      dispatch('addNotification', {
        type: 'error',
        message: 'Record not found'
      })
      return
    }
    
    // Store previous state for rollback
    const previousState = { ...currentRecord }
    
    // Set operation status to loading
    commit('SET_RECORD_OPERATION_STATUS', { id, status: STATUS.LOADING })
    
    // Apply optimistic update
    const optimisticUpdates = {
      status: newStatus,
      checkInTime: newStatus === 'present' && !currentRecord.checkInTime 
        ? new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' })
        : newStatus === 'absent' ? null : currentRecord.checkInTime
    }
    
    commit('OPTIMISTIC_UPDATE_RECORD', {
      id,
      updates: optimisticUpdates,
      previousState
    })
    
    try {
      // Make API call
      const response = await mockApi.toggleAttendance(id, newStatus)
      
      // Confirm optimistic update with server data
      commit('CONFIRM_OPTIMISTIC_UPDATE', {
        id,
        serverData: response.data
      })
      
      dispatch('addNotification', {
        type: 'success',
        message: `Attendance updated for ${currentRecord.employeeName}`,
        timeout: 3000
      })
      
    } catch (error) {
      // Rollback optimistic update
      commit('ROLLBACK_OPTIMISTIC_UPDATE', {
        id,
        previousState
      })
      
      commit('SET_RECORD_OPERATION_STATUS', {
        id,
        status: STATUS.ERROR,
        errorMessage: error.message
      })
      
      // Add to retry queue
      commit('ADD_TO_RETRY_QUEUE', {
        action: 'toggleAttendance',
        params: [{ id, newStatus }],
        description: `Toggle attendance for ${currentRecord.employeeName}`
      })
      
      dispatch('addNotification', {
        type: 'error',
        message: `Failed to update attendance for ${currentRecord.employeeName}: ${error.message}`,
        persistent: true,
        action: {
          text: 'Retry',
          callback: () => dispatch('toggleAttendance', { id, newStatus })
        }
      })
    }
  },
  
  // Bulk update attendance records
  async bulkUpdateAttendance({ commit, dispatch }, updates) {
    commit('SET_BULK_OPERATION_STATUS', { status: STATUS.LOADING })
    
    try {
      const response = await mockApi.bulkUpdateAttendance(updates)
      
      // Update individual records
      response.data.forEach(record => {
        commit('SET_RECORDS_DATA', [record])
      })
      
      commit('SET_BULK_OPERATION_STATUS', { status: STATUS.SUCCESS })
      
      dispatch('addNotification', {
        type: 'success',
        message: `Successfully updated ${updates.length} attendance records`,
        timeout: 3000
      })
      
    } catch (error) {
      commit('SET_BULK_OPERATION_STATUS', {
        status: STATUS.ERROR,
        errorMessage: error.message
      })
      
      // Add to retry queue
      commit('ADD_TO_RETRY_QUEUE', {
        action: 'bulkUpdateAttendance',
        params: [updates],
        description: `Bulk update ${updates.length} records`
      })
      
      dispatch('addNotification', {
        type: 'error',
        message: `Failed to bulk update attendance records: ${error.message}`,
        persistent: true,
        action: {
          text: 'Retry',
          callback: () => dispatch('bulkUpdateAttendance', updates)
        }
      })
    }
  },
  
  // Retry a failed operation
  async retryOperation({ dispatch, commit }, operation) {
    commit('REMOVE_FROM_RETRY_QUEUE', operation.id)
    
    // Dispatch the original action with its parameters
    if (operation.action && operation.params) {
      await dispatch(operation.action, ...operation.params)
    }
  },
  
  // Clear all retry operations
  clearRetryQueue({ commit }) {
    commit('CLEAR_RETRY_QUEUE')
  },
  
  // Add notification
  addNotification({ commit }, notification) {
    commit('ADD_NOTIFICATION', notification)
    
    // Auto-dismiss non-persistent notifications
    if (!notification.persistent && notification.timeout) {
      setTimeout(() => {
        commit('DISMISS_NOTIFICATION', notification.id)
      }, notification.timeout)
    }
  },
  
  // Dismiss notification
  dismissNotification({ commit }, id) {
    commit('DISMISS_NOTIFICATION', id)
  },
  
  // Clean up old notifications
  cleanupNotifications({ commit }) {
    commit('CLEAR_OLD_NOTIFICATIONS')
  },
  
  // Clear record operation status
  clearRecordOperation({ commit }, id) {
    commit('CLEAR_RECORD_OPERATION', id)
  }
}

export default {
  namespaced: true,
  state,
  getters,
  mutations,
  actions
}