/**
 * Mock API service that simulates network conditions with configurable delays and failure rates
 */
class MockApiService {
  constructor(options = {}) {
    this.baseDelay = options.baseDelay || 500
    this.failureRate = options.failureRate || 0.2
    this.networkJitter = options.networkJitter || 200
    
    // Mock server state
    this.serverState = {
      attendanceRecords: [
        { id: 1, employeeId: 'EMP001', employeeName: 'John Doe', date: '2026-01-23', status: 'present', checkInTime: '09:00' },
        { id: 2, employeeId: 'EMP002', employeeName: 'Jane Smith', date: '2026-01-23', status: 'absent', checkInTime: null },
        { id: 3, employeeId: 'EMP003', employeeName: 'Bob Johnson', date: '2026-01-23', status: 'present', checkInTime: '09:15' },
        { id: 4, employeeId: 'EMP004', employeeName: 'Alice Brown', date: '2026-01-23', status: 'late', checkInTime: '09:30' },
        { id: 5, employeeId: 'EMP005', employeeName: 'Charlie Wilson', date: '2026-01-23', status: 'present', checkInTime: '08:45' }
      ]
    }
  }

  /**
   * Simulate network delay with jitter
   */
  _simulateNetworkDelay() {
    const jitter = Math.random() * this.networkJitter
    return this.baseDelay + jitter
  }

  /**
   * Simulate network failure based on failure rate
   */
  _shouldSimulateFailure() {
    return Math.random() < this.failureRate
  }

  /**
   * Create a promise that resolves or rejects based on network simulation
   */
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

  /**
   * Fetch all attendance records
   */
  fetchAttendanceRecords() {
    return this._createNetworkPromise(
      () => ({ data: [...this.serverState.attendanceRecords] }),
      'Failed to fetch attendance records'
    )
  }

  /**
   * Toggle attendance status for a specific record
   */
  toggleAttendance(recordId, newStatus) {
    return this._createNetworkPromise(
      () => {
        const record = this.serverState.attendanceRecords.find(r => r.id === recordId)
        if (!record) {
          throw new Error('Record not found')
        }
        
        // Update server state
        record.status = newStatus
        if (newStatus === 'present' && !record.checkInTime) {
          record.checkInTime = new Date().toLocaleTimeString('en-US', { 
            hour12: false, 
            hour: '2-digit', 
            minute: '2-digit' 
          })
        } else if (newStatus === 'absent') {
          record.checkInTime = null
        }
        
        return { data: { ...record } }
      },
      'Failed to update attendance status'
    )
  }

  /**
   * Bulk update multiple attendance records
   */
  bulkUpdateAttendance(updates) {
    return this._createNetworkPromise(
      () => {
        const updatedRecords = []
        
        updates.forEach(update => {
          const record = this.serverState.attendanceRecords.find(r => r.id === update.id)
          if (record) {
            record.status = update.status
            if (update.status === 'present' && !record.checkInTime) {
              record.checkInTime = new Date().toLocaleTimeString('en-US', { 
                hour12: false, 
                hour: '2-digit', 
                minute: '2-digit' 
              })
            } else if (update.status === 'absent') {
              record.checkInTime = null
            }
            updatedRecords.push({ ...record })
          }
        })
        
        return { data: updatedRecords }
      },
      'Failed to bulk update attendance records'
    )
  }

  /**
   * Get current server state (for testing purposes)
   */
  getServerState() {
    return { ...this.serverState }
  }

  /**
   * Reset server state to initial values
   */
  resetServerState() {
    this.serverState.attendanceRecords = [
      { id: 1, employeeId: 'EMP001', employeeName: 'John Doe', date: '2026-01-23', status: 'present', checkInTime: '09:00' },
      { id: 2, employeeId: 'EMP002', employeeName: 'Jane Smith', date: '2026-01-23', status: 'absent', checkInTime: null },
      { id: 3, employeeId: 'EMP003', employeeName: 'Bob Johnson', date: '2026-01-23', status: 'present', checkInTime: '09:15' },
      { id: 4, employeeId: 'EMP004', employeeName: 'Alice Brown', date: '2026-01-23', status: 'late', checkInTime: '09:30' },
      { id: 5, employeeId: 'EMP005', employeeName: 'Charlie Wilson', date: '2026-01-23', status: 'present', checkInTime: '08:45' }
    ]
  }

  /**
   * Configure failure rate for testing
   */
  setFailureRate(rate) {
    this.failureRate = Math.max(0, Math.min(1, rate))
  }

  /**
   * Configure base delay for testing
   */
  setBaseDelay(delay) {
    this.baseDelay = Math.max(0, delay)
  }
}

// Export singleton instance
export default new MockApiService()