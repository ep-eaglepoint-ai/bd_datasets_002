/**
 * Test suite for Attendance Store Module
 * Tests state machine architecture, optimistic updates, rollback, and data integrity
 */

// Mock Vue and Vuex for Node.js environment
const Vue = {
  set: (obj, key, value) => { obj[key] = value },
  delete: (obj, key) => { delete obj[key] },
  use: () => {}
}

// Mock the attendance module structure
const STATUS = {
  IDLE: 'idle',
  LOADING: 'loading',
  SUCCESS: 'success',
  ERROR: 'error'
}

// Mock API service
class MockApiService {
  constructor() {
    this.shouldFail = false
    this.delay = 100
    this.serverState = {
      attendanceRecords: [
        { id: 1, employeeId: 'EMP001', employeeName: 'John Doe', date: '2026-01-23', status: 'present', checkInTime: '09:00' },
        { id: 2, employeeId: 'EMP002', employeeName: 'Jane Smith', date: '2026-01-23', status: 'absent', checkInTime: null }
      ]
    }
  }

  async fetchAttendanceRecords() {
    await this._delay()
    if (this.shouldFail) {
      throw new Error('Network error')
    }
    return { data: [...this.serverState.attendanceRecords] }
  }

  async toggleAttendance(recordId, newStatus) {
    await this._delay()
    if (this.shouldFail) {
      throw new Error('Failed to update attendance status')
    }
    
    const record = this.serverState.attendanceRecords.find(r => r.id === recordId)
    if (!record) {
      throw new Error('Record not found')
    }
    
    record.status = newStatus
    if (newStatus === 'present' && !record.checkInTime) {
      record.checkInTime = '09:00'
    } else if (newStatus === 'absent') {
      record.checkInTime = null
    }
    
    return { data: { ...record } }
  }

  _delay() {
    return new Promise(resolve => setTimeout(resolve, this.delay))
  }

  setFailureMode(shouldFail) {
    this.shouldFail = shouldFail
  }

  resetServerState() {
    this.serverState.attendanceRecords = [
      { id: 1, employeeId: 'EMP001', employeeName: 'John Doe', date: '2026-01-23', status: 'present', checkInTime: '09:00' },
      { id: 2, employeeId: 'EMP002', employeeName: 'Jane Smith', date: '2026-01-23', status: 'absent', checkInTime: null }
    ]
  }
}

// Mock attendance store module
class AttendanceStore {
  constructor() {
    this.mockApi = new MockApiService()
    this.state = {
      records: {
        data: {},
        status: STATUS.IDLE,
        lastErrorMessage: null
      },
      recordOperations: {},
      bulkOperations: {
        data: null,
        status: STATUS.IDLE,
        lastErrorMessage: null
      },
      notifications: [],
      retryQueue: []
    }
  }

  // Helper function to normalize records by ID
  normalizeRecords(records) {
    return records.reduce((acc, record) => {
      acc[record.id] = record
      return acc
    }, {})
  }

  // Fetch attendance records
  async fetchAttendanceRecords() {
    this.state.records.status = STATUS.LOADING
    
    try {
      const response = await this.mockApi.fetchAttendanceRecords()
      this.state.records.data = this.normalizeRecords(response.data)
      this.state.records.status = STATUS.SUCCESS
      this.state.records.lastErrorMessage = null
      
      this.addNotification({
        type: 'success',
        message: 'Attendance records loaded successfully'
      })
    } catch (error) {
      this.state.records.status = STATUS.ERROR
      this.state.records.lastErrorMessage = error.message
      
      this.state.retryQueue.push({
        id: Date.now(),
        action: 'fetchAttendanceRecords',
        params: [],
        description: 'Fetch attendance records',
        timestamp: Date.now()
      })
      
      this.addNotification({
        type: 'error',
        message: `Failed to load attendance records: ${error.message}`,
        persistent: true,
        action: { text: 'Retry' }
      })
    }
  }

  // Toggle attendance with optimistic updates
  async toggleAttendance(id, newStatus) {
    const currentRecord = this.getRecordById(id)
    if (!currentRecord) {
      this.addNotification({
        type: 'error',
        message: 'Record not found'
      })
      return
    }

    // Store previous state for rollback
    const previousState = { ...currentRecord }
    
    // Set operation status to loading
    this.state.recordOperations[id] = {
      status: STATUS.LOADING,
      previousState,
      optimisticUpdate: true,
      timestamp: Date.now()
    }

    // Apply optimistic update
    const optimisticUpdates = {
      status: newStatus,
      checkInTime: newStatus === 'present' && !currentRecord.checkInTime 
        ? '09:00' 
        : newStatus === 'absent' ? null : currentRecord.checkInTime
    }

    this.state.records.data[id] = {
      ...this.state.records.data[id],
      ...optimisticUpdates
    }

    try {
      // Make API call
      const response = await this.mockApi.toggleAttendance(id, newStatus)
      
      // Confirm optimistic update with server data
      this.state.records.data[id] = response.data
      delete this.state.recordOperations[id]
      
      this.addNotification({
        type: 'success',
        message: `Attendance updated for ${currentRecord.employeeName}`
      })
    } catch (error) {
      // Rollback optimistic update
      this.state.records.data[id] = previousState
      
      this.state.recordOperations[id] = {
        status: STATUS.ERROR,
        lastErrorMessage: error.message,
        timestamp: Date.now()
      }

      this.state.retryQueue.push({
        id: Date.now(),
        action: 'toggleAttendance',
        params: [id, newStatus],
        description: `Toggle attendance for ${currentRecord.employeeName}`,
        timestamp: Date.now()
      })

      this.addNotification({
        type: 'error',
        message: `Failed to update attendance for ${currentRecord.employeeName}: ${error.message}`,
        persistent: true,
        action: { text: 'Retry' }
      })
    }
  }

  // Getters
  getAllRecords() {
    return Object.values(this.state.records.data)
  }

  getRecordById(id) {
    return this.state.records.data[id] || null
  }

  isLoadingRecords() {
    return this.state.records.status === STATUS.LOADING
  }

  getRecordOperationStatus(id) {
    const operation = this.state.recordOperations[id]
    return operation ? operation.status : STATUS.IDLE
  }

  hasOperationsInProgress() {
    return Object.values(this.state.recordOperations).some(op => op.status === STATUS.LOADING) ||
           this.state.bulkOperations.status === STATUS.LOADING
  }

  getPendingNotifications() {
    return this.state.notifications.filter(n => !n.dismissed)
  }

  getRetryQueue() {
    return this.state.retryQueue
  }

  // Helper methods
  addNotification(notification) {
    this.state.notifications.push({
      id: Date.now() + Math.random(),
      ...notification,
      dismissed: false,
      timestamp: Date.now()
    })
  }

  async retryOperation(operation) {
    this.state.retryQueue = this.state.retryQueue.filter(op => op.id !== operation.id)
    
    if (operation.action === 'fetchAttendanceRecords') {
      await this.fetchAttendanceRecords()
    } else if (operation.action === 'toggleAttendance') {
      await this.toggleAttendance(...operation.params)
    }
  }
}

// Test suite
class TestSuite {
  constructor() {
    this.tests = []
    this.passed = 0
    this.failed = 0
  }

  test(name, testFn) {
    this.tests.push({ name, testFn })
  }

  async run() {
    console.log('🧪 Running Attendance Store Tests...\n')
    
    for (const { name, testFn } of this.tests) {
      try {
        await testFn()
        console.log(`✅ ${name}`)
        this.passed++
      } catch (error) {
        console.log(`❌ ${name}`)
        console.log(`   Error: ${error.message}`)
        this.failed++
      }
    }

    console.log(`\n📊 Test Results: ${this.passed} passed, ${this.failed} failed`)
    return { passed: this.passed, failed: this.failed, total: this.tests.length }
  }

  assert(condition, message) {
    if (!condition) {
      throw new Error(message || 'Assertion failed')
    }
  }

  assertEqual(actual, expected, message) {
    if (JSON.stringify(actual) !== JSON.stringify(expected)) {
      throw new Error(message || `Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`)
    }
  }
}

// Test cases
const suite = new TestSuite()

// Test 1: State Machine Architecture
suite.test('should initialize with correct async entity structure', async () => {
  const store = new AttendanceStore()
  
  suite.assertEqual(store.state.records, {
    data: {},
    status: STATUS.IDLE,
    lastErrorMessage: null
  })
  
  suite.assertEqual(store.state.bulkOperations, {
    data: null,
    status: STATUS.IDLE,
    lastErrorMessage: null
  })
})

// Test 2: Status Transitions - Loading to Success
suite.test('should transition status from loading to success on successful fetch', async () => {
  const store = new AttendanceStore()
  
  // Initial state
  suite.assertEqual(store.state.records.status, STATUS.IDLE)
  
  // Start fetch (should be loading immediately)
  const fetchPromise = store.fetchAttendanceRecords()
  suite.assertEqual(store.state.records.status, STATUS.LOADING)
  
  // Wait for completion
  await fetchPromise
  suite.assertEqual(store.state.records.status, STATUS.SUCCESS)
  suite.assertEqual(store.state.records.lastErrorMessage, null)
})

// Test 3: Status Transitions - Loading to Error
suite.test('should transition status from loading to error on failed fetch', async () => {
  const store = new AttendanceStore()
  store.mockApi.setFailureMode(true)
  
  // Initial state
  suite.assertEqual(store.state.records.status, STATUS.IDLE)
  
  // Start fetch
  const fetchPromise = store.fetchAttendanceRecords()
  suite.assertEqual(store.state.records.status, STATUS.LOADING)
  
  // Wait for completion
  await fetchPromise
  suite.assertEqual(store.state.records.status, STATUS.ERROR)
  suite.assert(store.state.records.lastErrorMessage !== null, 'Should have error message')
})

// Test 4: Never Stuck in Loading
suite.test('should never get stuck in loading state', async () => {
  const store = new AttendanceStore()
  
  // Test with successful operation
  await store.fetchAttendanceRecords()
  suite.assert(store.state.records.status !== STATUS.LOADING, 'Should not be loading after success')
  
  // Test with failed operation
  store.mockApi.setFailureMode(true)
  await store.fetchAttendanceRecords()
  suite.assert(store.state.records.status !== STATUS.LOADING, 'Should not be loading after error')
})

// Test 5: Data Normalization
suite.test('should normalize records by ID', async () => {
  const store = new AttendanceStore()
  
  await store.fetchAttendanceRecords()
  
  const normalizedData = store.state.records.data
  suite.assert(normalizedData[1], 'Should have record with ID 1')
  suite.assert(normalizedData[2], 'Should have record with ID 2')
  suite.assertEqual(normalizedData[1].employeeName, 'John Doe')
  suite.assertEqual(normalizedData[2].employeeName, 'Jane Smith')
})

// Test 6: Optimistic Updates
suite.test('should immediately update local state optimistically', async () => {
  const store = new AttendanceStore()
  
  // Setup initial data
  await store.fetchAttendanceRecords()
  
  // Get initial state
  const initialRecord = store.getRecordById(2) // Jane Smith, initially absent
  suite.assertEqual(initialRecord.status, 'absent')
  
  // Set API to delay response
  store.mockApi.delay = 500
  
  // Start toggle operation (don't await)
  const togglePromise = store.toggleAttendance(2, 'present')
  
  // Verify optimistic update happened immediately
  const optimisticRecord = store.getRecordById(2)
  suite.assertEqual(optimisticRecord.status, 'present')
  
  // Wait for API completion
  await togglePromise
})

// Test 7: Rollback on Failure
suite.test('should rollback optimistic update on API failure', async () => {
  const store = new AttendanceStore()
  
  // Setup initial data
  await store.fetchAttendanceRecords()
  
  // Get initial state
  const initialRecord = store.getRecordById(2) // Jane Smith, initially absent
  suite.assertEqual(initialRecord.status, 'absent')
  
  // Set API to fail
  store.mockApi.setFailureMode(true)
  
  // Perform toggle
  await store.toggleAttendance(2, 'present')
  
  // Verify rollback happened
  const rolledBackRecord = store.getRecordById(2)
  suite.assertEqual(rolledBackRecord.status, 'absent') // Back to original state
  suite.assertEqual(rolledBackRecord.checkInTime, null) // Original check-in time
})

// Test 8: Data Integrity After Rollback
suite.test('should match server state exactly after rollback', async () => {
  const store = new AttendanceStore()
  
  // Setup initial data
  await store.fetchAttendanceRecords()
  
  // Get server state
  const serverRecord = { id: 2, employeeId: 'EMP002', employeeName: 'Jane Smith', date: '2026-01-23', status: 'absent', checkInTime: null }
  
  // Set API to fail
  store.mockApi.setFailureMode(true)
  
  // Perform failed toggle
  await store.toggleAttendance(2, 'present')
  
  // Verify final state matches server state exactly
  const finalRecord = store.getRecordById(2)
  suite.assertEqual(finalRecord, serverRecord)
  
  // Verify no ghost updates remain
  const operationStatus = store.getRecordOperationStatus(2)
  suite.assertEqual(operationStatus, STATUS.ERROR) // Should show error, not loading
})

// Test 9: Retry Mechanism
suite.test('should add failed operations to retry queue', async () => {
  const store = new AttendanceStore()
  store.mockApi.setFailureMode(true)
  
  await store.fetchAttendanceRecords()
  
  const retryQueue = store.getRetryQueue()
  suite.assert(retryQueue.length === 1, 'Should have one item in retry queue')
  suite.assertEqual(retryQueue[0].action, 'fetchAttendanceRecords')
  suite.assertEqual(retryQueue[0].description, 'Fetch attendance records')
})

// Test 10: Successful Retry
suite.test('should retry failed operations successfully', async () => {
  const store = new AttendanceStore()
  
  // First call fails
  store.mockApi.setFailureMode(true)
  await store.fetchAttendanceRecords()
  
  // Verify operation is in retry queue
  const retryQueue = store.getRetryQueue()
  suite.assert(retryQueue.length === 1, 'Should have one item in retry queue')
  
  // Second call succeeds
  store.mockApi.setFailureMode(false)
  
  // Retry the operation
  await store.retryOperation(retryQueue[0])
  
  // Verify operation was removed from retry queue
  const updatedRetryQueue = store.getRetryQueue()
  suite.assert(updatedRetryQueue.length === 0, 'Retry queue should be empty')
  
  // Verify operation succeeded
  suite.assertEqual(store.state.records.status, STATUS.SUCCESS)
})

// Test 11: Concurrent Operations
suite.test('should handle multiple concurrent operations', async () => {
  const store = new AttendanceStore()
  
  // Setup initial data
  await store.fetchAttendanceRecords()
  
  // Start multiple concurrent operations
  const toggle1 = store.toggleAttendance(1, 'absent')
  const toggle2 = store.toggleAttendance(2, 'present')
  
  // Verify both operations are in progress
  suite.assertEqual(store.getRecordOperationStatus(1), STATUS.LOADING)
  suite.assertEqual(store.getRecordOperationStatus(2), STATUS.LOADING)
  suite.assert(store.hasOperationsInProgress(), 'Should have operations in progress')
  
  // Wait for completion
  await Promise.all([toggle1, toggle2])
  
  // Verify both operations completed successfully
  suite.assertEqual(store.getRecordById(1).status, 'absent')
  suite.assertEqual(store.getRecordById(2).status, 'present')
  suite.assert(!store.hasOperationsInProgress(), 'Should not have operations in progress')
})

// Test 12: UI Resilience - Notifications
suite.test('should create notifications for operations', async () => {
  const store = new AttendanceStore()
  
  // Successful operation
  await store.fetchAttendanceRecords()
  
  let notifications = store.getPendingNotifications()
  suite.assert(notifications.length === 1, 'Should have one notification')
  suite.assertEqual(notifications[0].type, 'success')
  suite.assert(notifications[0].message.includes('loaded successfully'), 'Should have success message')
  
  // Failed operation
  store.mockApi.setFailureMode(true)
  await store.fetchAttendanceRecords()
  
  notifications = store.getPendingNotifications()
  suite.assert(notifications.length === 2, 'Should have two notifications')
  const errorNotification = notifications.find(n => n.type === 'error')
  suite.assert(errorNotification, 'Should have error notification')
  suite.assert(errorNotification.persistent, 'Error notification should be persistent')
  suite.assert(errorNotification.action, 'Error notification should have retry action')
})

// Export for use in evaluation
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { TestSuite, AttendanceStore, STATUS }
}

// Run tests if this file is executed directly
if (require.main === module) {
  suite.run().then(results => {
    process.exit(results.failed > 0 ? 1 : 0)
  })
}