import { render, screen, fireEvent } from '@testing-library/react'
import { Header } from '@/components/Header'
import { useDatasetStore } from '@/store/dataset-store'

// Mock the store
jest.mock('@/store/dataset-store')
const mockUseDatasetStore = useDatasetStore as jest.MockedFunction<typeof useDatasetStore>

const mockDataset = {
  id: 'test-dataset',
  name: 'Test Dataset',
  originalFileName: 'test.csv',
  size: 2048,
  uploadedAt: new Date('2023-01-01'),
}

const mockFilteredData = [
  { name: 'John', age: 25 },
  { name: 'Jane', age: 30 },
]

describe('Header Component', () => {
  const mockUndo = jest.fn()
  const mockRedo = jest.fn()
  const mockCanUndo = jest.fn()
  const mockCanRedo = jest.fn()
  const mockSaveToStorage = jest.fn()
  const mockClearCurrentDataset = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should render basic header without dataset info', () => {
    mockUseDatasetStore.mockReturnValue({
      currentDataset: null,
      filteredData: [],
      undo: mockUndo,
      redo: mockRedo,
      canUndo: mockCanUndo,
      canRedo: mockCanRedo,
      saveToStorage: mockSaveToStorage,
      clearCurrentDataset: mockClearCurrentDataset,
    } as any)

    render(<Header />)

    expect(screen.getByText('Dataset Explorer')).toBeInTheDocument()
    expect(screen.queryByText('Test Dataset')).not.toBeInTheDocument()
  })

  it('should render dataset information when loaded', () => {
    mockUseDatasetStore.mockReturnValue({
      currentDataset: mockDataset,
      filteredData: mockFilteredData,
      undo: mockUndo,
      redo: mockRedo,
      canUndo: mockCanUndo,
      canRedo: mockCanRedo,
      saveToStorage: mockSaveToStorage,
      clearCurrentDataset: mockClearCurrentDataset,
    } as any)

    render(<Header />)

    expect(screen.getByText('Test Dataset')).toBeInTheDocument()
    expect(screen.getByText('test.csv')).toBeInTheDocument()
    expect(screen.getByText('2 rows')).toBeInTheDocument()
  })

  it('should handle back to datasets click', () => {
    mockUseDatasetStore.mockReturnValue({
      currentDataset: mockDataset,
      filteredData: mockFilteredData,
      undo: mockUndo,
      redo: mockRedo,
      canUndo: mockCanUndo,
      canRedo: mockCanRedo,
      saveToStorage: mockSaveToStorage,
      clearCurrentDataset: mockClearCurrentDataset,
    } as any)

    render(<Header />)

    fireEvent.click(screen.getByText('← Back to datasets'))

    expect(mockClearCurrentDataset).toHaveBeenCalled()
  })

  it('should handle undo action', () => {
    mockCanUndo.mockReturnValue(true)
    mockUseDatasetStore.mockReturnValue({
      currentDataset: mockDataset,
      filteredData: mockFilteredData,
      undo: mockUndo,
      redo: mockRedo,
      canUndo: mockCanUndo,
      canRedo: mockCanRedo,
      saveToStorage: mockSaveToStorage,
      clearCurrentDataset: mockClearCurrentDataset,
    } as any)

    render(<Header />)

    fireEvent.click(screen.getByText('Undo'))

    expect(mockUndo).toHaveBeenCalled()
  })

  it('should disable export when no filtered data', () => {
    mockUseDatasetStore.mockReturnValue({
      currentDataset: mockDataset,
      filteredData: [], // No data
      undo: mockUndo,
      redo: mockRedo,
      canUndo: mockCanUndo,
      canRedo: mockCanRedo,
      saveToStorage: mockSaveToStorage,
      clearCurrentDataset: mockClearCurrentDataset,
    } as any)

    render(<Header />)

    const exportButton = screen.getByText('Export CSV')
    expect(exportButton).toBeDisabled()
  })
})