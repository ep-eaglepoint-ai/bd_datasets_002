import { render, screen } from '@testing-library/react'
import { VisualizationPanel } from '@/components/VisualizationPanel'
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
        { id: 'col-1', name: 'category', type: 'string' },
        { id: 'col-2', name: 'value', type: 'number' },
        { id: 'col-3', name: 'active', type: 'boolean' },
        { id: 'col-4', name: 'date', type: 'date' },
      ],
    },
  ],
}

const mockFilteredData = [
  { category: 'A', value: 10, active: true, date: new Date('2023-01-01') },
  { category: 'B', value: 20, active: false, date: new Date('2023-01-02') },
  { category: 'C', value: 30, active: true, date: new Date('2023-01-03') },
]

describe('VisualizationPanel Component', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should show no dataset message when no dataset loaded', () => {
    mockUseDatasetStore.mockReturnValue({
      currentDataset: null,
      filteredData: [],
    } as any)

    render(<VisualizationPanel />)

    expect(screen.getByText('No dataset loaded')).toBeInTheDocument()
  })

  it('should render visualization panel header when dataset loaded', () => {
    mockUseDatasetStore.mockReturnValue({
      currentDataset: mockDataset,
      filteredData: mockFilteredData,
    } as any)

    render(<VisualizationPanel />)

    expect(screen.getByText('Visualizations')).toBeInTheDocument()
    expect(screen.getByText('Chart Type')).toBeInTheDocument()
  })

  it('should show chart type buttons', () => {
    mockUseDatasetStore.mockReturnValue({
      currentDataset: mockDataset,
      filteredData: mockFilteredData,
    } as any)

    render(<VisualizationPanel />)

    expect(screen.getByText('Bar')).toBeInTheDocument()
    expect(screen.getByText('Line')).toBeInTheDocument()
    expect(screen.getByText('Pie')).toBeInTheDocument()
    expect(screen.getByText('Scatter')).toBeInTheDocument()
  })

  it('should show axis selection dropdowns', () => {
    mockUseDatasetStore.mockReturnValue({
      currentDataset: mockDataset,
      filteredData: mockFilteredData,
    } as any)

    render(<VisualizationPanel />)

    expect(screen.getByText('X-Axis')).toBeInTheDocument()
    expect(screen.getByText('Y-Axis')).toBeInTheDocument()
  })

  it('should show default chart placeholder', () => {
    mockUseDatasetStore.mockReturnValue({
      currentDataset: mockDataset,
      filteredData: mockFilteredData,
    } as any)

    render(<VisualizationPanel />)

    expect(screen.getByText('Select columns to generate chart')).toBeInTheDocument()
  })
})