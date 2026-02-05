import { renderHook, act } from '@testing-library/react'
import { useDatasetStore } from '@/store/dataset-store'
import { Dataset, Filter } from '@/types/dataset'

// Mock the storage manager
jest.mock('@/lib/storage', () => ({
  storageManager: {
    saveDataset: jest.fn().mockResolvedValue(undefined),
    loadDataset: jest.fn().mockResolvedValue(null),
    listDatasets: jest.fn().mockResolvedValue([]),
    deleteDataset: jest.fn().mockResolvedValue(undefined),
  },
}))

const createMockDataset = (): Dataset => ({
  id: 'test-dataset',
  name: 'Test Dataset',
  originalFileName: 'test.csv',
  size: 1024,
  uploadedAt: new Date('2023-01-01'),
  currentVersion: 'version-1',
  versions: [
    {
      id: 'version-1',
      timestamp: new Date('2023-01-01'),
      name: 'Initial',
      columns: [
        {
          id: 'col-1',
          name: 'name',
          type: 'string',
          originalType: 'string',
        },
        {
          id: 'col-2',
          name: 'age',
          type: 'number',
          originalType: 'number',
        },
      ],
      rowCount: 2,
      filters: [],
      transformations: [],
      checksum: 'test-checksum',
    },
  ],
  rawData: [
    { name: 'John', age: '25' },
    { name: 'Jane', age: '30' },
  ],
  processedData: [
    { name: 'John', age: 25 },
    { name: 'Jane', age: 30 },
  ],
})

describe('Dataset Store', () => {
  beforeEach(() => {
    // Reset store state before each test
    const { result } = renderHook(() => useDatasetStore())
    act(() => {
      result.current.clearCurrentDataset()
    })
  })

  it('should have correct initial state', () => {
    const { result } = renderHook(() => useDatasetStore())

    expect(result.current.currentDataset).toBeNull()
    expect(result.current.isLoading).toBe(false)
    expect(result.current.error).toBeNull()
    expect(result.current.filteredData).toEqual([])
    expect(result.current.savedDatasets).toEqual([])
  })

  it('should set current dataset and apply filters', () => {
    const { result } = renderHook(() => useDatasetStore())
    const dataset = createMockDataset()

    act(() => {
      result.current.setCurrentDataset(dataset)
    })

    expect(result.current.currentDataset).toEqual(dataset)
    expect(result.current.filteredData).toEqual(dataset.processedData)
    expect(result.current.error).toBeNull()
  })

  it('should add filter correctly', () => {
    const { result } = renderHook(() => useDatasetStore())
    const dataset = createMockDataset()

    act(() => {
      result.current.setCurrentDataset(dataset)
    })

    const filter: Omit<Filter, 'id'> = {
      columnId: 'name',
      operator: 'equals',
      value: 'John',
      enabled: true,
    }

    act(() => {
      result.current.addFilter(filter)
    })

    const currentVersion = result.current.currentDataset!.versions.find(
      v => v.id === result.current.currentDataset!.currentVersion
    )

    expect(currentVersion!.filters).toHaveLength(1)
    expect(currentVersion!.filters[0]).toMatchObject(filter)
    expect(currentVersion!.filters[0].id).toBeDefined()
  })

  it('should clear all filters', () => {
    const { result } = renderHook(() => useDatasetStore())
    const dataset = createMockDataset()

    act(() => {
      result.current.setCurrentDataset(dataset)
      result.current.addFilter({
        columnId: 'name',
        operator: 'equals',
        value: 'John',
        enabled: true,
      })
    })

    act(() => {
      result.current.clearFilters()
    })

    const currentVersion = result.current.currentDataset!.versions.find(
      v => v.id === result.current.currentDataset!.currentVersion
    )

    expect(currentVersion!.filters).toHaveLength(0)
  })

  it('should clear current dataset and reset state', () => {
    const { result } = renderHook(() => useDatasetStore())
    const dataset = createMockDataset()

    act(() => {
      result.current.setCurrentDataset(dataset)
      result.current.addFilter({
        columnId: 'name',
        operator: 'equals',
        value: 'John',
        enabled: true,
      })
    })

    expect(result.current.currentDataset).not.toBeNull()
    expect(result.current.filteredData.length).toBeGreaterThan(0)

    act(() => {
      result.current.clearCurrentDataset()
    })

    expect(result.current.currentDataset).toBeNull()
    expect(result.current.filteredData).toEqual([])
    expect(result.current.error).toBeNull()
  })
})