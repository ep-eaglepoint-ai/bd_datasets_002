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

// Setup IndexedDB mock - Reset before each test
beforeEach(() => {
  // Reset IndexedDB before each test
  if (typeof indexedDB !== 'undefined' && indexedDB.deleteDatabase) {
    try {
      indexedDB.deleteDatabase('DatasetExplorer')
    } catch (error) {
      // Ignore errors during cleanup
    }
  }
})