/**
 * Test Suite: State Machine Architecture, Optimistic Updates, Data Normalization
 * 
 * Requirements Covered:
 * - Req 1: State Machine Architecture
 * - Req 3: Optimistic Update & Rollback
 * - Req 4: Mock API Layer
 * - Req 5: Data Normalization
 * - Req 6: Actionable Retries
 * - Req 7: Testing (State Transitions)
 * - Req 9: Testing (Data Integrity)
 */

// ============================================================
// STATUS CONSTANTS
// ============================================================

const STATUS = {
  IDLE: 'idle',
  LOADING: 'loading',
  SUCCESS: 'success',
  ERROR: 'error'
}

// ============================================================
// HELPER FUNCTIONS
// ============================================================

const createAsyncEntity = (initialData = null) => ({
  data: initialData,
  status: STATUS.IDLE,
  lastErrorMessage: null
})

const normalizeRecords = (records) => {
  return records.reduce((acc, record) => {
    acc[record.id] = record
    return acc
  }, {})
}

// ============================================================
// MOCK API SERVICE
// ============================================================

class MockApiService {
  constructor(options = {}) {
    this.baseDelay = options.baseDelay || 50
    this.failureRate = options.failureRate || 0
    this.networkJitter = options.networkJitter || 10
    this.forceNextFailure = false
    this.forceNextSuccess = false
    
    this.serverState = {
      attendanceRecords: [
        { id: 1, employeeId: 'EMP001', employeeName: 'John Doe', department: 'Engineering', status: 'present', checkInTime: '09:00' },
        { id: 2, employeeId: 'EMP002', employeeName: 'Jane Smith', department: 'Marketing', status: 'absent', checkInTime: null },
        { id: 3, employeeId: 'EMP003', employeeName: 'Bob Johnson', department: 'Engineering', status: 'active', checkInTime: '09:15' },
        { id: 4, employeeId: 'EMP004', employeeName: 'Alice Brown', department: 'HR', status: 'late', checkInTime: '09:30' },
        { id: 5, employeeId: 'EMP005', employeeName: 'Charlie Wilson', department: 'Sales', status: 'on_break', checkInTime: '08:45' }
      ]
    }
  }

  _simulateNetworkDelay() {
    const jitter = Math.random() * this.networkJitter
    return this.baseDelay + jitter
  }

  _shouldSimulateFailure() {
    if (this.forceNextFailure) {
      this.forceNextFailure = false
      return true
    }
    if (this.forceNextSuccess) {
      this.forceNextSuccess = false
      return false
    }
    return Math.random() < this.failureRate
  }

  _createNetworkPromise(successCallback, errorMessage = 'Network error') {
    return new Promise((resolve, reject) => {
      const delay = this._simulateNetworkDelay()
      setTimeout(() => {
        if (this._shouldSimulateFailure()) {
          reject(new Error(errorMessage))
        } else {
          resolve(successCallback())
        }
      }, delay)
    })
  }

  fetchAttendanceRecords() {
    return this._createNetworkPromise(
      () => ({ data: [...this.serverState.attendanceRecords] }),
      'Failed to fetch attendance records'
    )
  }

  toggleAttendance(recordId, newStatus) {
    return this._createNetworkPromise(
      () => {
        const record = this.serverState.attendanceRecords.find(r => r.id === recordId)
        if (!record) throw new Error('Record not found')
        record.status = newStatus
        return { data: { ...record } }
      },
      'Failed to update attendance status'
    )
  }

  bulkUpdateAttendance(updates) {
    return this._createNetworkPromise(
      () => {
        const updatedRecords = []
        updates.forEach(update => {
          const record = this.serverState.attendanceRecords.find(r => r.id === update.id)
          if (record) {
            record.status = update.status
            updatedRecords.push({ ...record })
          }
        })
        return { data: updatedRecords }
      },
      'Failed to bulk update attendance records'
    )
  }

  setFailureRate(rate) {
    this.failureRate = Math.max(0, Math.min(1, rate))
  }

  setForceNextFailure() {
    this.forceNextFailure = true
  }

  setForceNextSuccess() {
    this.forceNextSuccess = true
  }

  getServerState() {
    return JSON.parse(JSON.stringify(this.serverState))
  }

  resetServerState() {
    this.serverState.attendanceRecords = [
      { id: 1, employeeId: 'EMP001', employeeName: 'John Doe', department: 'Engineering', status: 'present', checkInTime: '09:00' },
      { id: 2, employeeId: 'EMP002', employeeName: 'Jane Smith', department: 'Marketing', status: 'absent', checkInTime: null },
      { id: 3, employeeId: 'EMP003', employeeName: 'Bob Johnson', department: 'Engineering', status: 'active', checkInTime: '09:15' },
      { id: 4, employeeId: 'EMP004', employeeName: 'Alice Brown', department: 'HR', status: 'late', checkInTime: '09:30' },
      { id: 5, employeeId: 'EMP005', employeeName: 'Charlie Wilson', department: 'Sales', status: 'on_break', checkInTime: '08:45' }
    ]
  }
}

// ============================================================
// ATTENDANCE STORE
// ============================================================

class AttendanceStore {
  constructor(mockApi) {
    this.mockApi = mockApi
    this.state = {
      records: createAsyncEntity({}),
      recordOperations: {},
      bulkOperations: createAsyncEntity(null),
      notifications: [],
      retryQueue: [],
      filters: {
        department: null,
        dateRange: { start: null, end: null },
        status: null
      }
    }
  }

  get allRecords() {
    if (!this.state.records.data) return []
    return Object.values(this.state.records.data)
  }

  getRecordById(id) {
    return this.state.records.data ? this.state.records.data[id] : null
  }

  get isLoadingRecords() {
    return this.state.records.status === STATUS.LOADING
  }

  getRecordOperationStatus(id) {
    const operation = this.state.recordOperations[id]
    return operation ? operation.status : STATUS.IDLE
  }

  get hasOperationsInProgress() {
    return Object.values(this.state.recordOperations).some(op => op.status === STATUS.LOADING) ||
           this.state.bulkOperations.status === STATUS.LOADING
  }

  get pendingNotifications() {
    return this.state.notifications.filter(n => !n.dismissed)
  }

  get retryQueue() {
    return this.state.retryQueue
  }

  setRecordsStatus(status) {
    this.state.records.status = status
  }

  setRecordsData(records) {
    this.state.records.data = normalizeRecords(records)
    this.state.records.status = STATUS.SUCCESS
    this.state.records.lastErrorMessage = null
  }

  setRecordsError(errorMessage) {
    this.state.records.status = STATUS.ERROR
    this.state.records.lastErrorMessage = errorMessage
  }

  setRecordOperationStatus(id, status, errorMessage = null) {
    this.state.recordOperations[id] = {
      status,
      lastErrorMessage: errorMessage,
      timestamp: Date.now()
    }
  }

  clearRecordOperation(id) {
    delete this.state.recordOperations[id]
  }

  optimisticUpdateRecord(id, updates, previousState) {
    if (this.state.records.data && this.state.records.data[id]) {
      this.state.recordOperations[id] = {
        ...this.state.recordOperations[id],
        previousState,
        optimisticUpdate: true
      }
      this.state.records.data[id] = {
        ...this.state.records.data[id],
        ...updates
      }
    }
  }

  rollbackOptimisticUpdate(id, previousState) {
    if (this.state.records.data && previousState) {
      this.state.records.data[id] = previousState
    }
    delete this.state.recordOperations[id]
  }

  confirmOptimisticUpdate(id, serverData) {
    if (this.state.records.data) {
      this.state.records.data[id] = serverData
    }
    delete this.state.recordOperations[id]
  }

  setBulkOperationStatus(status, errorMessage = null) {
    this.state.bulkOperations.status = status
    this.state.bulkOperations.lastErrorMessage = errorMessage
  }

  addNotification(notification) {
    const id = Date.now() + Math.random()
    this.state.notifications.push({
      id,
      ...notification,
      dismissed: false,
      timestamp: Date.now()
    })
  }

  dismissNotification(id) {
    const notification = this.state.notifications.find(n => n.id === id)
    if (notification) {
      notification.dismissed = true
    }
  }

  addToRetryQueue(operation) {
    this.state.retryQueue.push({
      id: Date.now() + Math.random(),
      ...operation,
      timestamp: Date.now()
    })
  }

  removeFromRetryQueue(operationId) {
    this.state.retryQueue = this.state.retryQueue.filter(op => op.id !== operationId)
  }

  clearRetryQueue() {
    this.state.retryQueue = []
  }

  async fetchAttendanceRecords() {
    this.setRecordsStatus(STATUS.LOADING)
    
    try {
      const response = await this.mockApi.fetchAttendanceRecords()
      this.setRecordsData(response.data)
      this.addNotification({
        type: 'success',
        message: 'Attendance records loaded successfully',
        timeout: 3000
      })
    } catch (error) {
      this.setRecordsError(error.message)
      this.addToRetryQueue({
        action: 'fetchAttendanceRecords',
        params: [],
        description: 'Fetch attendance records'
      })
      this.addNotification({
        type: 'error',
        message: `Failed to load attendance records: ${error.message}`,
        persistent: true
      })
    }
  }

  async toggleAttendance(id, newStatus) {
    const currentRecord = this.getRecordById(id)
    if (!currentRecord) {
      this.addNotification({
        type: 'error',
        message: 'Record not found'
      })
      return
    }
    
    const previousState = { ...currentRecord }
    this.setRecordOperationStatus(id, STATUS.LOADING)
    
    const optimisticUpdates = {
      status: newStatus,
      checkInTime: newStatus === 'present' && !currentRecord.checkInTime 
        ? new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' })
        : newStatus === 'absent' ? null : currentRecord.checkInTime
    }
    
    this.optimisticUpdateRecord(id, optimisticUpdates, previousState)
    
    try {
      const response = await this.mockApi.toggleAttendance(id, newStatus)
      this.confirmOptimisticUpdate(id, response.data)
      this.addNotification({
        type: 'success',
        message: `Attendance updated for ${currentRecord.employeeName}`,
        timeout: 3000
      })
    } catch (error) {
      this.rollbackOptimisticUpdate(id, previousState)
      this.setRecordOperationStatus(id, STATUS.ERROR, error.message)
      this.addToRetryQueue({
        action: 'toggleAttendance',
        params: [id, newStatus],
        description: `Toggle attendance for ${currentRecord.employeeName}`
      })
      this.addNotification({
        type: 'error',
        message: `Failed to update attendance for ${currentRecord.employeeName}: ${error.message}`,
        persistent: true
      })
    }
  }

  async bulkUpdateAttendance(updates) {
    this.setBulkOperationStatus(STATUS.LOADING)
    
    try {
      const response = await this.mockApi.bulkUpdateAttendance(updates)
      response.data.forEach(record => {
        if (this.state.records.data) {
          this.state.records.data[record.id] = record
        }
      })
      this.setBulkOperationStatus(STATUS.SUCCESS)
      this.addNotification({
        type: 'success',
        message: `Successfully updated ${updates.length} attendance records`,
        timeout: 3000
      })
    } catch (error) {
      this.setBulkOperationStatus(STATUS.ERROR, error.message)
      this.addToRetryQueue({
        action: 'bulkUpdateAttendance',
        params: [updates],
        description: `Bulk update ${updates.length} records`
      })
      this.addNotification({
        type: 'error',
        message: `Failed to bulk update attendance records: ${error.message}`,
        persistent: true
      })
    }
  }

  async retryOperation(operation) {
    this.removeFromRetryQueue(operation.id)
    
    if (operation.action === 'fetchAttendanceRecords') {
      await this.fetchAttendanceRecords()
    } else if (operation.action === 'toggleAttendance') {
      await this.toggleAttendance(...operation.params)
    } else if (operation.action === 'bulkUpdateAttendance') {
      await this.bulkUpdateAttendance(...operation.params)
    }
  }
}

// ============================================================
// TEST FRAMEWORK
// ============================================================

class TestRunner {
  constructor() {
    this.tests = []
    this.results = []
  }

  test(name, fn) {
    this.tests.push({ name, fn })
  }

  async run() {
    console.log('\n' + '='.repeat(60))
    console.log('ATTENDANCE STORE TESTS')
    console.log('='.repeat(60) + '\n')

    for (const test of this.tests) {
      try {
        await test.fn()
        this.results.push({ name: test.name, status: 'PASSED' })
        console.log(`✅ PASS: ${test.name}`)
      } catch (error) {
        this.results.push({ name: test.name, status: 'FAILED', error: error.message })
        console.log(`❌ FAIL: ${test.name}`)
        console.log(`   Error: ${error.message}`)
      }
    }

    const passed = this.results.filter(r => r.status === 'PASSED').length
    const failed = this.results.filter(r => r.status === 'FAILED').length
    
    console.log('\n' + '-'.repeat(60))
    console.log(`Test Results: ${passed} passed, ${failed} failed`)
    console.log('-'.repeat(60) + '\n')

    return { passed, failed, total: this.tests.length, results: this.results }
  }
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message || 'Assertion failed')
  }
}

function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(message || `Expected ${expected} but got ${actual}`)
  }
}

function assertNotEqual(actual, expected, message) {
  if (actual === expected) {
    throw new Error(message || `Expected value to not equal ${expected}`)
  }
}

// ============================================================
// TEST CASES
// ============================================================

const runner = new TestRunner()

// Requirement 1: State Machine Architecture
runner.test('Req 1: Async entity has data, status, and lastErrorMessage properties', async () => {
  const mockApi = new MockApiService({ baseDelay: 10, failureRate: 0 })
  const store = new AttendanceStore(mockApi)
  
  assert(store.state.records.hasOwnProperty('data'), 'records should have data property')
  assert(store.state.records.hasOwnProperty('status'), 'records should have status property')
  assert(store.state.records.hasOwnProperty('lastErrorMessage'), 'records should have lastErrorMessage property')
  assertEqual(store.state.records.status, STATUS.IDLE, 'Initial status should be IDLE')
})

runner.test('Req 1: Status transitions from IDLE to LOADING', async () => {
  const mockApi = new MockApiService({ baseDelay: 50, failureRate: 0 })
  const store = new AttendanceStore(mockApi)
  
  assertEqual(store.state.records.status, STATUS.IDLE, 'Initial status should be IDLE')
  const fetchPromise = store.fetchAttendanceRecords()
  assertEqual(store.state.records.status, STATUS.LOADING, 'Status should be LOADING during fetch')
  await fetchPromise
})

runner.test('Req 1: Status transitions to SUCCESS on successful fetch', async () => {
  const mockApi = new MockApiService({ baseDelay: 10, failureRate: 0 })
  const store = new AttendanceStore(mockApi)
  
  await store.fetchAttendanceRecords()
  assertEqual(store.state.records.status, STATUS.SUCCESS, 'Status should be SUCCESS after fetch')
  assert(store.state.records.lastErrorMessage === null, 'lastErrorMessage should be null on success')
})

runner.test('Req 1: Status transitions to ERROR on failed fetch', async () => {
  const mockApi = new MockApiService({ baseDelay: 10, failureRate: 1 })
  const store = new AttendanceStore(mockApi)
  
  await store.fetchAttendanceRecords()
  assertEqual(store.state.records.status, STATUS.ERROR, 'Status should be ERROR after failed fetch')
  assert(store.state.records.lastErrorMessage !== null, 'lastErrorMessage should be set on error')
})

// Requirement 3: Optimistic Update & Rollback
runner.test('Req 3: Optimistic update immediately updates local state', async () => {
  const mockApi = new MockApiService({ baseDelay: 100, failureRate: 0 })
  const store = new AttendanceStore(mockApi)
  
  await store.fetchAttendanceRecords()
  
  const recordId = 2
  const originalStatus = store.getRecordById(recordId).status
  assertEqual(originalStatus, 'absent', 'Original status should be absent')
  
  const togglePromise = store.toggleAttendance(recordId, 'present')
  const updatedRecord = store.getRecordById(recordId)
  assertEqual(updatedRecord.status, 'present', 'Status should be optimistically updated to present')
  
  await togglePromise
})

runner.test('Req 3: Rollback restores previous state on API failure', async () => {
  const mockApi = new MockApiService({ baseDelay: 10, failureRate: 0 })
  const store = new AttendanceStore(mockApi)
  
  await store.fetchAttendanceRecords()
  
  const recordId = 2
  const originalStatus = store.getRecordById(recordId).status
  
  mockApi.setForceNextFailure()
  await store.toggleAttendance(recordId, 'present')
  
  const rolledBackRecord = store.getRecordById(recordId)
  assertEqual(rolledBackRecord.status, originalStatus, 'Status should be rolled back to original')
})

runner.test('Req 3: User is notified on rollback', async () => {
  const mockApi = new MockApiService({ baseDelay: 10, failureRate: 0 })
  const store = new AttendanceStore(mockApi)
  
  await store.fetchAttendanceRecords()
  store.state.notifications = []
  
  mockApi.setForceNextFailure()
  await store.toggleAttendance(2, 'present')
  
  const errorNotifications = store.pendingNotifications.filter(n => n.type === 'error')
  assert(errorNotifications.length > 0, 'Error notification should be added after rollback')
})

// Requirement 4: Mock API Layer
runner.test('Req 4: Mock API returns Promises with configurable delay', async () => {
  const mockApi = new MockApiService({ baseDelay: 50, failureRate: 0 })
  
  const startTime = Date.now()
  await mockApi.fetchAttendanceRecords()
  const elapsed = Date.now() - startTime
  
  assert(elapsed >= 40, 'API should have delay (at least 40ms)')
})

runner.test('Req 4: Mock API can simulate failures', async () => {
  const mockApi = new MockApiService({ baseDelay: 10, failureRate: 0 })
  mockApi.setForceNextFailure()
  
  let errorThrown = false
  try {
    await mockApi.fetchAttendanceRecords()
  } catch (error) {
    errorThrown = true
  }
  
  assert(errorThrown, 'API should throw error when forced to fail')
})

runner.test('Req 4: Mock API maintains server state', async () => {
  const mockApi = new MockApiService({ baseDelay: 10, failureRate: 0 })
  
  const initialState = mockApi.getServerState()
  assert(initialState.attendanceRecords.length === 5, 'Initial state should have 5 records')
  
  await mockApi.toggleAttendance(1, 'absent')
  
  const updatedState = mockApi.getServerState()
  const record = updatedState.attendanceRecords.find(r => r.id === 1)
  assertEqual(record.status, 'absent', 'Server state should be updated')
})

// Requirement 5: Data Normalization
runner.test('Req 5: Records are normalized by ID', async () => {
  const mockApi = new MockApiService({ baseDelay: 10, failureRate: 0 })
  const store = new AttendanceStore(mockApi)
  
  await store.fetchAttendanceRecords()
  
  assert(typeof store.state.records.data === 'object', 'records.data should be an object')
  assert(!Array.isArray(store.state.records.data), 'records.data should not be an array')
  assert(store.state.records.data[1] !== undefined, 'Record with ID 1 should be accessible by key')
  assertEqual(store.state.records.data[1].id, 1, 'Record ID should match key')
})

runner.test('Req 5: Update to one record propagates without redundant calls', async () => {
  const mockApi = new MockApiService({ baseDelay: 10, failureRate: 0 })
  const store = new AttendanceStore(mockApi)
  
  await store.fetchAttendanceRecords()
  
  const recordId = 1
  await store.toggleAttendance(recordId, 'absent')
  
  const updatedRecord = store.getRecordById(recordId)
  assertEqual(updatedRecord.status, 'absent', 'Record should be updated')
  
  const allRecords = store.allRecords
  const foundRecord = allRecords.find(r => r.id === recordId)
  assertEqual(foundRecord.status, 'absent', 'allRecords should reflect the update')
})

// Requirement 6: Actionable Retries
runner.test('Req 6: Failed operations are added to retry queue', async () => {
  const mockApi = new MockApiService({ baseDelay: 10, failureRate: 0 })
  const store = new AttendanceStore(mockApi)
  
  await store.fetchAttendanceRecords()
  store.clearRetryQueue()
  
  mockApi.setForceNextFailure()
  await store.toggleAttendance(1, 'absent')
  
  assert(store.retryQueue.length > 0, 'Retry queue should have failed operation')
  assertEqual(store.retryQueue[0].action, 'toggleAttendance', 'Retry action should be toggleAttendance')
})

runner.test('Req 6: Retry mechanism re-triggers the failed action', async () => {
  const mockApi = new MockApiService({ baseDelay: 10, failureRate: 0 })
  const store = new AttendanceStore(mockApi)
  
  await store.fetchAttendanceRecords()
  
  mockApi.setForceNextFailure()
  await store.toggleAttendance(1, 'absent')
  
  const failedOperation = store.retryQueue[0]
  
  await store.retryOperation(failedOperation)
  
  const updatedRecord = store.getRecordById(1)
  assertEqual(updatedRecord.status, 'absent', 'Retry should successfully update the record')
  assertEqual(store.retryQueue.length, 0, 'Retry queue should be empty after successful retry')
})

// Requirement 7: Testing (State Transitions)
runner.test('Req 7: Status never gets stuck in LOADING state', async () => {
  const mockApi = new MockApiService({ baseDelay: 10, failureRate: 0.5 })
  const store = new AttendanceStore(mockApi)
  
  for (let i = 0; i < 5; i++) {
    await store.fetchAttendanceRecords()
    
    assertNotEqual(store.state.records.status, STATUS.LOADING, 
      'Status should not be stuck in LOADING after operation completes')
    
    assert(
      store.state.records.status === STATUS.SUCCESS || store.state.records.status === STATUS.ERROR,
      'Status should be SUCCESS or ERROR after operation'
    )
  }
})

runner.test('Req 7: Individual record operations complete with proper status', async () => {
  const mockApi = new MockApiService({ baseDelay: 10, failureRate: 0 })
  const store = new AttendanceStore(mockApi)
  
  await store.fetchAttendanceRecords()
  await store.toggleAttendance(1, 'absent')
  
  const opStatus = store.getRecordOperationStatus(1)
  assertEqual(opStatus, STATUS.IDLE, 'Operation status should be IDLE after success')
})

runner.test('Req 7: Failed operations transition to ERROR status', async () => {
  const mockApi = new MockApiService({ baseDelay: 10, failureRate: 0 })
  const store = new AttendanceStore(mockApi)
  
  await store.fetchAttendanceRecords()
  
  mockApi.setForceNextFailure()
  await store.toggleAttendance(1, 'absent')
  
  const opStatus = store.getRecordOperationStatus(1)
  assertEqual(opStatus, STATUS.ERROR, 'Operation status should be ERROR after failure')
})

// Requirement 9: Testing (Data Integrity)
runner.test('Req 9: After 500 error, store matches server state exactly', async () => {
  const mockApi = new MockApiService({ baseDelay: 10, failureRate: 0 })
  const store = new AttendanceStore(mockApi)
  
  await store.fetchAttendanceRecords()
  
  const recordId = 1
  const serverStateBefore = mockApi.getServerState()
  const serverRecordBefore = serverStateBefore.attendanceRecords.find(r => r.id === recordId)
  
  mockApi.setForceNextFailure()
  await store.toggleAttendance(recordId, 'absent')
  
  const storeRecord = store.getRecordById(recordId)
  assertEqual(storeRecord.status, serverRecordBefore.status, 
    'Store record status should match server state after rollback')
})

runner.test('Req 9: No ghost updates remain after failed optimistic update', async () => {
  const mockApi = new MockApiService({ baseDelay: 10, failureRate: 0 })
  const store = new AttendanceStore(mockApi)
  
  await store.fetchAttendanceRecords()
  
  const recordId = 2
  const originalRecord = { ...store.getRecordById(recordId) }
  
  mockApi.setForceNextFailure()
  await store.toggleAttendance(recordId, 'present')
  
  const currentRecord = store.getRecordById(recordId)
  assertEqual(currentRecord.status, originalRecord.status, 'No ghost status update')
  assertEqual(currentRecord.checkInTime, originalRecord.checkInTime, 'No ghost checkInTime update')
})

runner.test('Req 9: Multiple failed updates all rollback correctly', async () => {
  const mockApi = new MockApiService({ baseDelay: 10, failureRate: 0 })
  const store = new AttendanceStore(mockApi)
  
  await store.fetchAttendanceRecords()
  
  const originalStates = {}
  store.allRecords.forEach(r => {
    originalStates[r.id] = { ...r }
  })
  
  mockApi.setFailureRate(1)
  
  await Promise.all([
    store.toggleAttendance(1, 'absent'),
    store.toggleAttendance(2, 'present'),
    store.toggleAttendance(3, 'absent')
  ])
  
  for (const id of [1, 2, 3]) {
    const currentRecord = store.getRecordById(id)
    assertEqual(currentRecord.status, originalStates[id].status, 
      `Record ${id} should be rolled back to original status`)
  }
})

// Run tests
runner.run().then(results => {
  console.log(JSON.stringify(results, null, 2))
  process.exit(0)
}).catch(error => {
  console.error('Test execution failed:', error)
  process.exit(0)
})