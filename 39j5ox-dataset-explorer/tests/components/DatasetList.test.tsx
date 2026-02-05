import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { DatasetList } from '@/components/DatasetList'
import { useDatasetStore } from '@/store/dataset-store'

// Mock the store
jest.mock('@/store/dataset-store')
const mockUseDatasetStore = useDatasetStore as jest.MockedFunction<typeof useDatasetStore>

const mockDatasets = [
  {
    id: 'dataset-1',
    name: 'Sales Data',
    originalFileName: 'sales.csv',
    size: 2048,
    uploadedAt: new Date('2023-01-01'),
    processedData: Array.from({ length: 1000 }, (_, i) => ({ id: i })),
    versions: [{ id: 'v1', rowCount: 1000 }],
  },
  {
    id: 'dataset-2',
    name: 'Customer Data',
    originalFileName: 'customers.csv',
    size: 4096,
    uploadedAt: new Date('2023-01-02'),
    processedData: Array.from({ length: 500 }, (_, i) => ({ id: i })),
    versions: [{ id: 'v1', rowCount: 500 }, { id: 'v2', rowCount: 500 }],
  },
]

describe('DatasetList Component', () => {
  const mockOnSelectDataset = jest.fn()
  const mockOnNewDataset = jest.fn()
  const mockLoadSavedDatasets = jest.fn()
  const mockDeleteDataset = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    
    mockUseDatasetStore.mockReturnValue({
      savedDatasets: mockDatasets,
      isLoading: false,
      error: null,
      loadSavedDatasets: mockLoadSavedDatasets,
      deleteDataset: mockDeleteDataset,
    } as any)
  })

  it('should render dataset list correctly', () => {
    render(
      <DatasetList
        onSelectDataset={mockOnSelectDataset}
        onNewDataset={mockOnNewDataset}
      />
    )

    expect(screen.getByText('Your Datasets')).toBeInTheDocument()
    expect(screen.getByText('Upload New Dataset')).toBeInTheDocument()
    expect(screen.getByText('Sales Data')).toBeInTheDocument()
    expect(screen.getByText('Customer Data')).toBeInTheDocument()
  })

  it('should handle dataset selection', () => {
    render(
      <DatasetList
        onSelectDataset={mockOnSelectDataset}
        onNewDataset={mockOnNewDataset}
      />
    )

    const openButtons = screen.getAllByText('Open')
    fireEvent.click(openButtons[0])

    expect(mockOnSelectDataset).toHaveBeenCalledWith('dataset-1')
  })

  it('should handle new dataset creation', () => {
    render(
      <DatasetList
        onSelectDataset={mockOnSelectDataset}
        onNewDataset={mockOnNewDataset}
      />
    )

    fireEvent.click(screen.getByText('Upload New Dataset'))

    expect(mockOnNewDataset).toHaveBeenCalled()
  })

  it('should show empty state when no datasets exist', () => {
    mockUseDatasetStore.mockReturnValue({
      savedDatasets: [],
      isLoading: false,
      error: null,
      loadSavedDatasets: mockLoadSavedDatasets,
      deleteDataset: mockDeleteDataset,
    } as any)

    render(
      <DatasetList
        onSelectDataset={mockOnSelectDataset}
        onNewDataset={mockOnNewDataset}
      />
    )

    expect(screen.getByText('No datasets found')).toBeInTheDocument()
    expect(screen.getByText('Get started by uploading your first CSV file')).toBeInTheDocument()
    expect(screen.getByText('Upload Dataset')).toBeInTheDocument()
  })

  it('should show error state', () => {
    const errorMessage = 'Failed to load datasets'
    mockUseDatasetStore.mockReturnValue({
      savedDatasets: [],
      isLoading: false,
      error: errorMessage,
      loadSavedDatasets: mockLoadSavedDatasets,
      deleteDataset: mockDeleteDataset,
    } as any)

    render(
      <DatasetList
        onSelectDataset={mockOnSelectDataset}
        onNewDataset={mockOnNewDataset}
      />
    )

    expect(screen.getByText('Error')).toBeInTheDocument()
    expect(screen.getByText(errorMessage)).toBeInTheDocument()
  })
})