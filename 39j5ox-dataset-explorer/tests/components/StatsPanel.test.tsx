import { render, screen } from '@testing-library/react'
import { StatsPanel } from '@/components/StatsPanel'
import { useDatasetStore } from '@/store/dataset-store'

// Mock the store
jest.mock('@/store/dataset-store')
const mockUseDatasetStore = useDatasetStore as jest.MockedFunction<typeof useDatasetStore>

const mockDataset = {
  id: 'test-dataset',
  name: 'Test Dataset',
  currentVersion: 'version-1',
  versions: [
    {
      id: 'version-1',
      columns: [
        { id: 'col-1', name: 'name', type: 'string' },
        { id: 'col-2', name: 'age', type: 'number' },
      ],
    },
  ],
  rawData: [
    { name: 'John', age: 25 },
    { name: 'Jane', age: 30 },
    { name: 'Bob', age: 35 },
  ],
}

const mockFilteredData = [
  { name: 'John', age: 25 },
  { name: 'Jane', age: 30 },
  { name: 'Bob', age: 35 },
]

describe('StatsPanel Component', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should show no dataset message when no dataset loaded', () => {
    mockUseDatasetStore.mockReturnValue({
      currentDataset: null,
      filteredData: [],
    } as any)

    render(<StatsPanel />)

    expect(screen.getByText('No dataset loaded')).toBeInTheDocument()
  })

  it('should show no data message when dataset loaded but no data', () => {
    mockUseDatasetStore.mockReturnValue({
      currentDataset: mockDataset,
      filteredData: [],
    } as any)

    render(<StatsPanel />)

    expect(screen.getByText('0')).toBeInTheDocument()
    expect(screen.getByText('Filtered Rows')).toBeInTheDocument()
  })

  it('should render statistics panel header when data available', () => {
    mockUseDatasetStore.mockReturnValue({
      currentDataset: mockDataset,
      filteredData: mockFilteredData,
    } as any)

    render(<StatsPanel />)

    expect(screen.getByText('Dataset Overview')).toBeInTheDocument()
  })

  it('should show overall dataset statistics', () => {
    mockUseDatasetStore.mockReturnValue({
      currentDataset: mockDataset,
      filteredData: mockFilteredData,
    } as any)

    render(<StatsPanel />)

    expect(screen.getByText('Total Rows')).toBeInTheDocument()
    expect(screen.getAllByText('3.00')).toHaveLength(2) // Total rows and filtered rows
    expect(screen.getByText('Columns')).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()
  })

  it('should show column-wise statistics', () => {
    mockUseDatasetStore.mockReturnValue({
      currentDataset: mockDataset,
      filteredData: mockFilteredData,
    } as any)

    render(<StatsPanel />)

    // Should show statistics for each column
    expect(screen.getByText('name')).toBeInTheDocument()
    expect(screen.getByText('age')).toBeInTheDocument()
  })
})