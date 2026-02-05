import { render, screen } from '@testing-library/react'
import { DatasetTable } from '@/components/DatasetTable'
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
}

const mockFilteredData = [
  { name: 'John Doe', age: 25 },
  { name: 'Jane Smith', age: 30 },
]

describe('DatasetTable Component', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should show no data message when no dataset loaded', () => {
    mockUseDatasetStore.mockReturnValue({
      currentDataset: null,
      filteredData: [],
      isLoading: false,
    } as any)

    render(<DatasetTable />)

    expect(screen.getByText('Upload a CSV file to get started')).toBeInTheDocument()
  })

  it('should show no data message when dataset loaded but no data', () => {
    mockUseDatasetStore.mockReturnValue({
      currentDataset: mockDataset,
      filteredData: [],
      isLoading: false,
    } as any)

    render(<DatasetTable />)

    expect(screen.getByText('Try adjusting your filters')).toBeInTheDocument()
  })

  it('should render table headers when data available', () => {
    mockUseDatasetStore.mockReturnValue({
      currentDataset: mockDataset,
      filteredData: mockFilteredData,
      isLoading: false,
    } as any)

    render(<DatasetTable />)

    expect(screen.getByText('name')).toBeInTheDocument()
    expect(screen.getByText('age')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Search across all columns...')).toBeInTheDocument()
  })

  it('should render table data when available', () => {
    mockUseDatasetStore.mockReturnValue({
      currentDataset: mockDataset,
      filteredData: mockFilteredData,
      isLoading: false,
    } as any)

    render(<DatasetTable />)

    expect(screen.getByText('Showing 2 of 2 rows')).toBeInTheDocument()
    expect(screen.getByText('2 columns')).toBeInTheDocument()
  })

  it('should show loading state', () => {
    mockUseDatasetStore.mockReturnValue({
      currentDataset: mockDataset,
      filteredData: mockFilteredData,
      isLoading: true,
    } as any)

    render(<DatasetTable />)

    const spinnerElement = screen.getAllByRole('generic').find(el => el.classList.contains('animate-spin'))
    expect(spinnerElement).toBeInTheDocument()
  })
})