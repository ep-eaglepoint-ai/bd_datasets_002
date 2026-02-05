import { render, screen } from '@testing-library/react'
import Home from '@/app/page'
import { useDatasetStore } from '@/store/dataset-store'

// Mock the store
jest.mock('@/store/dataset-store')
const mockUseDatasetStore = useDatasetStore as jest.MockedFunction<typeof useDatasetStore>

const mockDatasets = [
  {
    id: 'dataset-1',
    name: 'Test Dataset',
    originalFileName: 'test.csv',
    size: 1024,
    uploadedAt: new Date('2023-01-01'),
    versions: [{ id: 'v1', rowCount: 100 }],
  },
]

describe('App Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should render the main app layout', () => {
    mockUseDatasetStore.mockReturnValue({
      savedDatasets: [],
      currentDataset: null,
      isLoading: false,
      error: null,
      loadSavedDatasets: jest.fn(),
    } as any)

    render(<Home />)

    expect(screen.getByText('Dataset Explorer')).toBeInTheDocument()
  })

  it('should show empty state when no datasets exist', () => {
    mockUseDatasetStore.mockReturnValue({
      savedDatasets: [],
      currentDataset: null,
      isLoading: false,
      error: null,
      loadSavedDatasets: jest.fn(),
    } as any)

    render(<Home />)

    expect(screen.getByText('No datasets found')).toBeInTheDocument()
    expect(screen.getByText('Get started by uploading your first CSV file')).toBeInTheDocument()
  })

  it('should show loading state', () => {
    mockUseDatasetStore.mockReturnValue({
      savedDatasets: [],
      currentDataset: null,
      isLoading: true,
      error: null,
      loadSavedDatasets: jest.fn(),
    } as any)

    render(<Home />)

    const spinnerElement = screen.getAllByRole('generic').find(el => el.classList.contains('animate-spin'))
    expect(spinnerElement).toBeInTheDocument()
  })

  it('should show error message when there is an error', () => {
    const errorMessage = 'Failed to load datasets'
    mockUseDatasetStore.mockReturnValue({
      savedDatasets: [],
      currentDataset: null,
      isLoading: false,
      error: errorMessage,
      loadSavedDatasets: jest.fn(),
    } as any)

    render(<Home />)

    expect(screen.getByText('Error')).toBeInTheDocument()
    expect(screen.getByText(errorMessage)).toBeInTheDocument()
  })

  it('should show dataset list when datasets exist', () => {
    mockUseDatasetStore.mockReturnValue({
      savedDatasets: mockDatasets,
      currentDataset: null,
      isLoading: false,
      error: null,
      loadSavedDatasets: jest.fn(),
    } as any)

    render(<Home />)

    expect(screen.getByText('Your Datasets')).toBeInTheDocument()
    expect(screen.getByText('Test Dataset')).toBeInTheDocument()
  })
})