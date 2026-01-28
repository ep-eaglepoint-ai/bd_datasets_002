import { storageManager } from '@/lib/storage'
import { Dataset } from '@/types/dataset'

// Polyfill for structuredClone in test environment
if (typeof structuredClone === 'undefined') {
  global.structuredClone = (obj: any) => JSON.parse(JSON.stringify(obj))
}

// Mock dataset for testing
const createMockDataset = (id: string = 'test-id'): Dataset => ({
  id,
  name: 'Test Dataset',
  originalFileName: 'test.csv',
  size: 1024,
  uploadedAt: new Date('2023-01-01'),
  encoding: 'utf-8',
  delimiter: ',',
  hasHeader: true,
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
          nullable: false,
          unique: false,
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

describe('Storage Manager', () => {
  beforeEach(async () => {
    // Clear storage before each test
    try {
      await storageManager.clearAll()
    } catch (error) {
      // Ignore errors during cleanup
    }
  })

  it('should save a dataset successfully', async () => {
    const dataset = createMockDataset()

    await expect(storageManager.saveDataset(dataset)).resolves.not.toThrow()
  })

  it('should return null for non-existent dataset', async () => {
    const result = await storageManager.loadDataset('non-existent-id')

    expect(result).toBeNull()
  })

  it('should return empty array when no datasets exist', async () => {
    const datasets = await storageManager.listDatasets()

    expect(datasets).toEqual([])
  })

  it('should handle deletion of non-existent dataset', async () => {
    await expect(storageManager.deleteDataset('non-existent'))
      .resolves.not.toThrow()
  })

  it('should return storage usage information', async () => {
    const usage = await storageManager.getStorageUsage()

    expect(usage).toHaveProperty('used')
    expect(usage).toHaveProperty('quota')
    expect(typeof usage.used).toBe('number')
    expect(typeof usage.quota).toBe('number')
  })
})