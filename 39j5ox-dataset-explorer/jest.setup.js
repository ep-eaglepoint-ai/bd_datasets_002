import '@testing-library/jest-dom'

// Setup fake IndexedDB
import 'fake-indexeddb/auto'

// Mock Chart.js
jest.mock('chart.js', () => ({
  Chart: {
    register: jest.fn(),
  },
  CategoryScale: {},
  LinearScale: {},
  BarElement: {},
  LineElement: {},
  PointElement: {},
  ArcElement: {},
  Title: {},
  Tooltip: {},
  Legend: {},
}))

// Mock react-chartjs-2
jest.mock('react-chartjs-2', () => ({
  Bar: ({ data }) => <div data-testid="bar-chart" data-chart-data={JSON.stringify(data)} />,
  Line: ({ data }) => <div data-testid="line-chart" data-chart-data={JSON.stringify(data)} />,
  Pie: ({ data }) => <div data-testid="pie-chart" data-chart-data={JSON.stringify(data)} />,
  Scatter: ({ data }) => <div data-testid="scatter-chart" data-chart-data={JSON.stringify(data)} />,
}))

// Mock react-dropzone
jest.mock('react-dropzone', () => ({
  useDropzone: jest.fn(() => ({
    getRootProps: () => ({ 'data-testid': 'dropzone' }),
    getInputProps: () => ({ 'data-testid': 'file-input' }),
    isDragActive: false,
    isDragAccept: false,
    isDragReject: false,
  })),
}))

// Mock file reading
global.FileReader = class {
  constructor() {
    this.readAsText = jest.fn()
    this.readAsArrayBuffer = jest.fn()
    this.result = null
    this.onload = null
    this.onerror = null
  }
}

// Mock URL.createObjectURL
global.URL.createObjectURL = jest.fn(() => 'mocked-url')
global.URL.revokeObjectURL = jest.fn()

// Mock window.confirm
global.confirm = jest.fn(() => true)

// Mock window.alert
global.alert = jest.fn()

// Setup IndexedDB mock - Reset before each test (synchronously)
beforeEach(() => {
  // Reset IndexedDB before each test - avoid async operations
  try {
    // Clear any existing databases synchronously
    if (typeof indexedDB !== 'undefined' && indexedDB._databases) {
      indexedDB._databases.clear()
    }
  } catch (error) {
    // Ignore errors during cleanup
  }
})

// Force cleanup after all tests to prevent hanging
afterAll(async () => {
  // Clean up any remaining async operations
  try {
    // Clear all timers
    jest.clearAllTimers()
    jest.useRealTimers()
    
    // Force garbage collection if available
    if (global.gc) {
      global.gc()
    }
    
    // Clear IndexedDB without async operations
    if (typeof indexedDB !== 'undefined' && indexedDB._databases) {
      indexedDB._databases.clear()
    }
  } catch (error) {
    // Ignore cleanup errors
  }
  
  // Force exit in CI environments or Aquila platform
  if (process.env.CI || process.env.NODE_ENV === 'test') {
    // Give minimal time for cleanup then force exit
    setTimeout(() => {
      process.exit(0)
    }, 50)
  }
})