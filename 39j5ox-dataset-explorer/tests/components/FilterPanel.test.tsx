import { render, screen } from '@testing-library/react'
import { FilterPanel } from '@/components/FilterPanel'
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
      filters: [
        {
          id: 'filter-1',
          columnId: 'name',
          operator: 'contains',
          value: 'John',
          enabled: true,
        },
      ],
    },
  ],
}

describe('FilterPanel Component', () => {
  const mockAddFilter = jest.fn()
  const mockUpdateFilter = jest.fn()
  const mockRemoveFilter = jest.fn()
  const mockClearFilters = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should show no dataset message when no dataset loaded', () => {
    mockUseDatasetStore.mockReturnValue({
      currentDataset: null,
      addFilter: mockAddFilter,
      updateFilter: mockUpdateFilter,
      removeFilter: mockRemoveFilter,
      clearFilters: mockClearFilters,
    } as any)

    render(<FilterPanel />)

    expect(screen.getByText('No dataset loaded')).toBeInTheDocument()
  })

  it('should render filter panel header when dataset loaded', () => {
    mockUseDatasetStore.mockReturnValue({
      currentDataset: mockDataset,
      addFilter: mockAddFilter,
      updateFilter: mockUpdateFilter,
      removeFilter: mockRemoveFilter,
      clearFilters: mockClearFilters,
    } as any)

    render(<FilterPanel />)

    expect(screen.getByText('Filters')).toBeInTheDocument()
    expect(screen.getByText('Add Filter')).toBeInTheDocument()
    expect(screen.getByText('Clear All')).toBeInTheDocument()
  })

  it('should show active filters section', () => {
    mockUseDatasetStore.mockReturnValue({
      currentDataset: mockDataset,
      addFilter: mockAddFilter,
      updateFilter: mockUpdateFilter,
      removeFilter: mockRemoveFilter,
      clearFilters: mockClearFilters,
    } as any)

    render(<FilterPanel />)

    expect(screen.getByText('Active Filters')).toBeInTheDocument()
    expect(screen.getByText('Clear All')).toBeInTheDocument()
  })

  it('should show filter count', () => {
    mockUseDatasetStore.mockReturnValue({
      currentDataset: mockDataset,
      addFilter: mockAddFilter,
      updateFilter: mockUpdateFilter,
      removeFilter: mockRemoveFilter,
      clearFilters: mockClearFilters,
    } as any)

    render(<FilterPanel />)

    expect(screen.getByText('Active Filters')).toBeInTheDocument()
    expect(screen.getByText('Clear All')).toBeInTheDocument()
  })

  it('should show no filters message when no filters exist', () => {
    const datasetWithoutFilters = {
      ...mockDataset,
      versions: [
        {
          ...mockDataset.versions[0],
          filters: [],
        },
      ],
    }

    mockUseDatasetStore.mockReturnValue({
      currentDataset: datasetWithoutFilters,
      addFilter: mockAddFilter,
      updateFilter: mockUpdateFilter,
      removeFilter: mockRemoveFilter,
      clearFilters: mockClearFilters,
    } as any)

    render(<FilterPanel />)

    expect(screen.getByText('No filters applied')).toBeInTheDocument()
  })
})