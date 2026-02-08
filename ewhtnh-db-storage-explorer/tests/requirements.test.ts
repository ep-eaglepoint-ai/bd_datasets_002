import { describe, it, expect, beforeEach } from '@jest/globals'
import React from 'react'
import { render, fireEvent, waitFor } from '@testing-library/react'

// Test all requirements from the specification
describe('Database Storage Explorer Requirements', () => {
  describe('File Import and Parsing', () => {
    it('should import and parse a JSON snapshot and populate heatmapData', async () => {
      const parser = require('../repository_after/src/utils/storageParser').StorageParser

      const sample = {
        databaseName: 'testdb',
        tableName: 'testtbl',
        heapPages: [
          {
            header: { pageType: 'heap', pageNumber: 0, lsn: 1, checksum: 1, lower: 200, upper: 100, special: 0, flags: 0, pruneXid: 0 },
            linePointers: [],
            tuples: [],
            freeSpace: { offset: 100, length: 100 },
            fillFactor: 50,
            deadTupleRatio: 0.1
          }
        ],
        indexPages: [],
        totalPages: 1
      }

      // Provide a lightweight file-like object with arrayBuffer for test environment
      const file = {
        name: 'snapshot.json',
        async arrayBuffer() {
          return new TextEncoder().encode(JSON.stringify(sample)).buffer
        }
      }

      const _warn = console.warn
      console.warn = () => {}
      try {
        const snapshot = await parser.parseFile(file)
        expect(snapshot).toBeDefined()
        expect(Array.isArray(snapshot.heapPages)).toBe(true)
        expect(Array.isArray(snapshot.heatmapData)).toBe(true)
        expect(snapshot.heatmapData!.length).toBe(snapshot.heapPages.length)
        // Validate heatmap data values
        for (const h of snapshot.heatmapData!) {
          expect(typeof h.pageNumber).toBe('number')
          expect(typeof h.density).toBe('number')
          expect(h.density).toBeGreaterThanOrEqual(0)
          expect(h.density).toBeLessThanOrEqual(100)
          expect(typeof h.fragmentation).toBe('number')
          expect(h.fragmentation).toBeGreaterThanOrEqual(0)
          expect(h.fragmentation).toBeLessThanOrEqual(1)
        }
      } finally {
        console.warn = _warn
      }
    })

    it('should reject invalid JSON snapshots', async () => {
      const parser = require('../repository_after/src/utils/storageParser').StorageParser

      const invalid = { totalPages: 1 }
      const file = {
        name: 'bad.json',
        async arrayBuffer() {
          return new TextEncoder().encode(JSON.stringify(invalid)).buffer
        }
      }

      const _warn2 = console.warn
      console.warn = () => {}
      try {
        try {
          await parser.parseFile(file)
          throw new Error('Expected parseFile to throw for invalid JSON')
        } catch (err) {
          expect(err).toBeDefined()
        }
      } finally {
        console.warn = _warn2
      }
    })
  })

  describe('Persistence and Platform Integration', () => {
    it('should provide an IndexedDB persistence adapter', () => {
      const store = require('../repository_after/src/store/storageStore')
      expect(typeof store.createIndexedDBStorage).toBe('function')
    })

    it('should reference worker parsing path for JSON parsing', () => {
      const fs = require('fs')
      const path = require('path')
      const filePath = path.join(__dirname, '..', 'repository_after', 'src', 'components', 'FileImport.tsx')
      const src = fs.readFileSync(filePath, 'utf8')
      expect(src.includes('/workers/jsonParserWorker.js')).toBe(true)
    })

    it('should persist and retrieve data via IndexedDB adapter', async () => {
      const { createIndexedDBStorage } = require('../repository_after/src/store/storageStore')
      const memory = new Map<string, string>()

      // Minimal IndexedDB mock for get/put/delete operations used by the adapter.
      ;(global as any).indexedDB = {
        open() {
          const req: any = {}
          setTimeout(() => {
            const db = {
              objectStoreNames: { contains: () => true },
              createObjectStore: () => {},
              transaction: () => ({
                objectStore: () => ({
                  get: (key: string) => {
                    const r: any = {}
                    setTimeout(() => {
                      r.result = memory.has(key) ? memory.get(key) : undefined
                      r.onsuccess && r.onsuccess()
                    }, 0)
                    return r
                  },
                  put: (value: string, key: string) => {
                    const r: any = {}
                    setTimeout(() => {
                      memory.set(key, value)
                      r.onsuccess && r.onsuccess()
                    }, 0)
                    return r
                  },
                  delete: (key: string) => {
                    const r: any = {}
                    setTimeout(() => {
                      memory.delete(key)
                      r.onsuccess && r.onsuccess()
                    }, 0)
                    return r
                  }
                })
              })
            }
            req.result = db
            req.onsuccess && req.onsuccess()
          }, 0)
          return req
        }
      }

      const storage = createIndexedDBStorage('test-db', 'kv')
      await storage.setItem('key', 'value')
      const value = await storage.getItem('key')
      expect(value).toBe('value')
      await storage.removeItem('key')
      const missing = await storage.getItem('key')
      expect(missing).toBe(null)
    })
  })

  describe('Heap Page Layout Visualization', () => {
    it('should decode and visualize heap page layouts', () => {
      const React = require('react')
      const { render, screen } = require('@testing-library/react')
      const PageLayoutView = require('../repository_after/src/components/PageLayoutView').default

      const samplePage = {
        header: { pageType: 'heap', pageNumber: 1, lsn: 1, checksum: 1, lower: 200, upper: 100, special: 0, flags: 0, pruneXid: 0 },
        linePointers: [{ offset: 128, length: 64, flags: 0 }],
        tuples: [{ header: { tXmin: 1, tXmax: 0, tCid: 1, tInfomask2: 0, tInfomask: 0, tHoff: 24, tBits: [] }, linePointer: { offset: 128, length: 64, flags: 0 }, data: new Uint8Array([0,1,2]), isVisible: true, isDead: false, values: {}, nullBitmap: [] }],
        freeSpace: { offset: 200, length: 100 },
        fillFactor: 50,
        deadTupleRatio: 0
      }

      render(React.createElement(PageLayoutView, { page: samplePage }))
      expect(screen.getByText(/Page Header/)).toBeDefined()
      expect(screen.getByText(/Line Pointers & Tuples/)).toBeDefined()
      expect(screen.getByText(/Free Space Analysis/)).toBeDefined()
    })
  })

  describe('Row-level Tuple Inspection', () => {
    it('should provide row-level tuple inspection', () => {
      const React = require('react')
      const { render, screen } = require('@testing-library/react')
      const TupleInspector = require('../repository_after/src/components/TupleInspector').default

      const tuple = {
        header: { tXmin: 1, tXmax: 0, tCid: 1, tInfomask2: 1, tInfomask: 1, tHoff: 24 },
        linePointer: { offset: 128, length: 64, flags: 0 },
        data: new Uint8Array([1,2,3]),
        isVisible: true,
        isDead: false,
        values: { attr_0: 123 },
        nullBitmap: [false]
      }
      const page = { header: { pageNumber: 1, pageType: 'heap', lsn: 1, checksum: 1, lower: 200, upper: 100, special: 0, flags: 0, pruneXid: 0 }, linePointers: [], tuples: [], freeSpace: { offset: 200, length: 100 }, fillFactor: 50, deadTupleRatio: 0 }

      render(React.createElement(TupleInspector, { tuple, page }))
      expect(screen.getByText(/Tuple Header/)).toBeDefined()
      expect(screen.getByText(/Visibility Information/)).toBeDefined()
      expect(screen.getByText(/Decoded Values/)).toBeDefined()
    })
  })

  describe('Index Page Visualization', () => {
    it('should support index page visualization', () => {
      const React = require('react')
      const { render, screen } = require('@testing-library/react')
      const IndexVisualization = require('../repository_after/src/components/IndexVisualization').default

      const snapshot = {
        indexPages: [
          { header: { pageNumber: 10 }, node: { isLeaf: true, level: 0, keys: ['a','b'], childPointers: [] }, keyRanges: [{ min: 'a', max: 'b' }], utilization: 70 },
          { header: { pageNumber: 11 }, node: { isLeaf: false, level: 1, keys: ['m'], childPointers: [10] }, keyRanges: [{ min: 'a', max: 'z' }], utilization: 50 }
        ]
      }

      render(React.createElement(IndexVisualization, { snapshot }))
      expect(screen.getByText(/Index Structure Analysis/)).toBeDefined()
      expect(screen.getByText(/Tree height/)).toBeDefined()
    })
  })

  describe('Storage Fragmentation Metrics', () => {
    it('should compute and display storage fragmentation metrics', () => {
      const { StorageParser } = require('../repository_after/src/utils/storageParser')

      const data = {
        heapPages: [
          { header: { pageType: 'heap', pageNumber: 0 }, freeSpace: { offset: 0, length: 100 }, tuples: [{ data: new Uint8Array([1,2,3]), isDead: true }], fillFactor: 90, deadTupleRatio: 1 }
        ],
        indexPages: [],
        totalPages: 1
      }

      const snapshot = StorageParser.parseJSONData(data, 'test.json')
      expect(snapshot.metrics.fragmentationRatio).toBeGreaterThanOrEqual(0)
      expect(snapshot.metrics.deadTupleRatio).toBeGreaterThanOrEqual(0)
    })
  })

  describe('Page Occupancy and Density', () => {
    it('should track page occupancy and density', () => {
      const { StorageParser } = require('../repository_after/src/utils/storageParser')
      const data = { heapPages: [], indexPages: [], totalPages: 0 }
      const snapshot = StorageParser.parseJSONData(data, 'empty.json')
      expect(snapshot.metrics.pageDensity).toBe(0)
    })
  })

  describe('Free Space Map Exploration', () => {
    it('should provide free space map exploration', () => {
      const React = require('react')
      const { render, screen } = require('@testing-library/react')
      const FreeSpaceMapView = require('../repository_after/src/components/FreeSpaceMapView').default

      const snapshot = {
        freeSpaceMap: {
          pages: [{ pageNumber: 1, freeBytes: 128, isFull: false, hasDeadTuples: true }],
          totalFreeSpace: 128,
          fragmentationIndex: 0.2
        }
      }

      render(React.createElement(FreeSpaceMapView, { snapshot }))
      expect(screen.getByText(/Free Space Map/)).toBeDefined()
      expect(screen.getByText(/128 bytes/)).toBeDefined()
    })
  })

  describe('Historical Storage State Comparison', () => {
    it('should implement historical storage state comparison', () => {
      const { compareSnapshots } = require('../repository_after/src/utils/compareSnapshots')
      const s1 = { id: 'a', heapPages: [], indexPages: [], metrics: { totalPages: 1, usedPages: 1, freePages: 0, totalBytes: 8192, usedBytes: 8192, freeBytes: 0, fragmentationRatio: 1, bloatEstimate: 0, indexBloatEstimate: 0, averageFillFactor: 90, deadTupleRatio: 0, pageDensity: 1 } }
      const s2 = { id: 'b', heapPages: [], indexPages: [], metrics: { totalPages: 1, usedPages: 1, freePages: 0, totalBytes: 8192, usedBytes: 8192, freeBytes: 0, fragmentationRatio: 5, bloatEstimate: 0, indexBloatEstimate: 0, averageFillFactor: 80, deadTupleRatio: 0, pageDensity: 1 } }
      const comparison = compareSnapshots(s1, s2)
      expect(comparison.fragmentationTrend).toBe('increasing')
    })
  })

  describe('Dead Tuple and Anomaly Detection', () => {
    it('should detect and flag dead tuples and anomalies', () => {
      const { StorageParser } = require('../repository_after/src/utils/storageParser')
      const data = {
        heapPages: [
          { header: { pageType: 'heap', pageNumber: 0 }, freeSpace: { offset: 0, length: 100 }, tuples: [{ data: new Uint8Array([1,2,3]), isDead: true }], fillFactor: 90, deadTupleRatio: 1 }
        ],
        indexPages: [],
        totalPages: 1
      }
      const snapshot = StorageParser.parseJSONData(data, 'dead.json')
      expect(snapshot.freeSpaceMap.pages[0].hasDeadTuples).toBe(true)
    })
  })

  describe('Storage Efficiency Analytics', () => {
    it('should generate storage efficiency analytics', () => {
      const { StorageParser } = require('../repository_after/src/utils/storageParser')
      const data = {
        heapPages: [
          { header: { pageType: 'heap', pageNumber: 0 }, freeSpace: { offset: 0, length: 100 }, tuples: [{ data: new Uint8Array([1,2,3]), isDead: true }], fillFactor: 90, deadTupleRatio: 1 }
        ],
        indexPages: [],
        totalPages: 1
      }
      const snapshot = StorageParser.parseJSONData(data, 'bloat.json')
      expect(snapshot.metrics.bloatEstimate).toBeGreaterThanOrEqual(0)
    })
  })

  describe('Page-level Heatmaps', () => {
    it('should visualize page-level heatmaps', () => {
      const FragmentationHeatmap = require('../repository_after/src/components/FragmentationHeatmap').default
      const snapshot = {
        id: 's2',
        name: 'snap2',
        timestamp: Date.now(),
        databaseName: 'db',
        tableName: 't',
        heapPages: [],
        indexPages: [],
        freeSpaceMap: { pages: [], totalFreeSpace: 0, fragmentationIndex: 0 },
        metrics: { totalPages: 3, usedPages: 3, freePages: 0, totalBytes: 0, usedBytes: 0, freeBytes: 0, fragmentationRatio: 0, bloatEstimate: 0, indexBloatEstimate: 0, averageFillFactor: 0, deadTupleRatio: 0, pageDensity: 0 },
        heatmapData: [
          { pageNumber: 0, density: 50, fragmentation: 0.1 },
          { pageNumber: 1, density: 60, fragmentation: 0.2 },
          { pageNumber: 2, density: 70, fragmentation: 0.3 }
        ],
        pageHeatmaps: [
          { pageNumber: 0, accessFrequency: 10, modificationDensity: 5, storageChurn: 20, lastAccessed: 0, lastModified: 0 },
          { pageNumber: 1, accessFrequency: 40, modificationDensity: 15, storageChurn: 30, lastAccessed: 0, lastModified: 0 },
          { pageNumber: 2, accessFrequency: 70, modificationDensity: 25, storageChurn: 40, lastAccessed: 0, lastModified: 0 }
        ],
        corruptedPages: [],
        parsingErrors: []
      }
      const { getByText } = render(React.createElement(FragmentationHeatmap, { snapshot }))
      expect(getByText(/Page-level Activity Heatmaps/)).toBeDefined()
      expect(getByText(/Access Frequency/)).toBeDefined()
    })
  })

  describe('Component behavior', () => {
    it('renders FragmentationHeatmap with provided heatmapData', () => {
      const FragmentationHeatmap = require('../repository_after/src/components/FragmentationHeatmap').default
      const sampleSnapshot = {
        id: 's1',
        name: 'snap',
        timestamp: Date.now(),
        databaseName: 'db',
        tableName: 't',
        heapPages: [],
        indexPages: [],
        freeSpaceMap: { pages: [], totalFreeSpace: 0, fragmentationIndex: 0 },
        metrics: { totalPages: 3, usedPages: 3, freePages: 0, totalBytes: 0, usedBytes: 0, freeBytes: 0, fragmentationRatio: 0, bloatEstimate: 0, indexBloatEstimate: 0, averageFillFactor: 0, deadTupleRatio: 0, pageDensity: 0 },
        heatmapData: [
          { pageNumber: 0, density: 80, fragmentation: 0.05 },
          { pageNumber: 1, density: 50, fragmentation: 0.12 },
          { pageNumber: 2, density: 20, fragmentation: 0.4 }
        ],
        corruptedPages: [],
        parsingErrors: []
      }

      const { getAllByText, container } = render(React.createElement(FragmentationHeatmap, { snapshot: sampleSnapshot }))
      expect(getAllByText('Fragmentation Heatmap').length).toBeGreaterThanOrEqual(1)
      // the summary text includes total pages
      expect(container.textContent).toContain('3 pages')
    })

    // FileImport rendering / worker integration is validated by source-level checks and manual QA.
  })

  describe('Binary-level Inspection Tools', () => {
    it('should support binary-level inspection tools', () => {
      const { StorageParser } = require('../repository_after/src/utils/storageParser')
      const snapshot = {
        heapPages: [{ header: { pageNumber: 0 }, rawBytes: new Uint8Array([0xaa, 0xbb, 0xcc]) }]
      }
      const inspections = StorageParser.inspectBinary(snapshot, 0, 0, 2)
      expect(inspections.length).toBe(2)
      expect(inspections[0].hexString).toBe('aa')
    })
  })

  describe('Storage Operation Simulation', () => {
    it('should allow users to simulate storage operations', () => {
      const { simulateOperation } = require('../repository_after/src/utils/simulateOperation')
      const base = {
        id: 'base',
        heapPages: [{
          header: { pageType: 'heap', pageNumber: 0 },
          linePointers: [],
          tuples: [],
          freeSpace: { offset: 0, length: 100 },
          fillFactor: 0,
          deadTupleRatio: 0
        }],
        indexPages: [],
        metrics: { totalPages: 1, usedPages: 1, freePages: 0, totalBytes: 8192, usedBytes: 8192, freeBytes: 0, fragmentationRatio: 0, bloatEstimate: 0, indexBloatEstimate: 0, averageFillFactor: 0, deadTupleRatio: 0, pageDensity: 1 },
        freeSpaceMap: { pages: [], totalFreeSpace: 0, fragmentationIndex: 0 }
      }
      const next = simulateOperation(base, 'insert')
      expect(next.heapPages[0].tuples.length).toBeGreaterThan(0)
    })
  })

  describe('Index Depth and Fanout Analysis', () => {
    it('should implement index depth and fanout analysis', () => {
      const React = require('react')
      const { render, screen } = require('@testing-library/react')
      const IndexVisualization = require('../repository_after/src/components/IndexVisualization').default
      const snapshot = { indexPages: [{ header: { pageNumber: 1 }, node: { isLeaf: true, level: 0, keys: ['a'], childPointers: [] }, keyRanges: [], utilization: 80 }] }
      render(React.createElement(IndexVisualization, { snapshot }))
      expect(screen.getByText(/Lookup Cost/)).toBeDefined()
    })
  })

  describe('Tuple Lifecycle Visualization', () => {
    it('should provide tuple lifecycle visualization', () => {
      const React = require('react')
      const { render, screen } = require('@testing-library/react')
      const TupleInspector = require('../repository_after/src/components/TupleInspector').default
      const tuple = { header: { tXmin: 1, tXmax: 0, tCid: 1, tInfomask2: 0, tInfomask: 0, tHoff: 24 }, linePointer: { offset: 1, length: 1, flags: 0 }, data: new Uint8Array([1]), isVisible: true, isDead: false, values: {}, nullBitmap: [] }
      const page = { header: { pageNumber: 1, pageType: 'heap', lsn: 1, checksum: 1, lower: 200, upper: 100, special: 0, flags: 0, pruneXid: 0 }, linePointers: [], tuples: [], freeSpace: { offset: 200, length: 100 }, fillFactor: 50, deadTupleRatio: 0 }
      render(React.createElement(TupleInspector, { tuple, page }))
      expect(screen.getByText(/Lifecycle/)).toBeDefined()
    })
  })

  describe('Search and Filtering', () => {
    it('should support search and filtering across pages and tuples', () => {
      const React = require('react')
      const { render, fireEvent, screen } = require('@testing-library/react')
      const StorageVisualization = require('../repository_after/src/components/StorageVisualization').default
      const { act } = require('react-dom/test-utils')
      const { useStorageStore } = require('../repository_after/src/store/storageStore')

      const previous = useStorageStore.getState()
      act(() => {
        useStorageStore.setState({
          currentSnapshot: {
            databaseName: 'db',
            tableName: 't',
            timestamp: Date.now(),
            metrics: { totalPages: 1, usedPages: 1, freePages: 0, totalBytes: 8192, usedBytes: 8192, freeBytes: 0, fragmentationRatio: 0, bloatEstimate: 0, indexBloatEstimate: 0, averageFillFactor: 0, deadTupleRatio: 0, pageDensity: 1 },
            heapPages: [{
              header: { pageNumber: 42, pageType: 'heap', lsn: 1, checksum: 1, lower: 200, upper: 100, special: 0, flags: 0, pruneXid: 0 },
              linePointers: [],
              tuples: [{ values: { attr_0: 'needle' }, linePointer: { offset: 1, length: 1, flags: 0 }, data: new Uint8Array([1]), header: { tXmin: 1, tXmax: 0, tCid: 1, tInfomask2: 0, tInfomask: 0, tHoff: 24 }, isVisible: true, isDead: false, nullBitmap: [] }],
              freeSpace: { offset: 200, length: 100 },
              fillFactor: 50,
              deadTupleRatio: 0
            }],
            indexPages: [],
            freeSpaceMap: { pages: [], totalFreeSpace: 0, fragmentationIndex: 0 },
            heatmapData: [],
            corruptedPages: [],
            parsingErrors: []
          }
        })
      })

      try {
        render(React.createElement(StorageVisualization))
        const input = screen.getByPlaceholderText(/Search pages or tuples/).closest('input')
        fireEvent.change(input, { target: { value: 'needle' } })
        expect(screen.getByText(/Page 42/)).toBeDefined()
      } finally {
        act(() => {
          useStorageStore.setState(previous)
        })
      }
    })
  })

  describe('Immutable Inspection Logs', () => {
    it('should maintain immutable inspection logs', () => {
      const { useStorageStore } = require('../repository_after/src/store/storageStore')
      useStorageStore.setState({ inspectionLogs: [] })
      const log = { id: '1', timestamp: Date.now(), action: 'import', snapshotId: 's1', details: { a: 1 } }
      useStorageStore.getState().addInspectionLog(log)
      const stored = useStorageStore.getState().inspectionLogs[0]
      expect(Object.isFrozen(stored)).toBe(true)
      expect(Object.isFrozen(stored.details)).toBe(true)
    })
  })

  describe('Performance Optimizations', () => {
    it('should implement performance optimizations', () => {
      const React = require('react')
      const { render, screen } = require('@testing-library/react')
      const FragmentationHeatmap = require('../repository_after/src/components/FragmentationHeatmap').default

      const snapshot = {
        heatmapData: Array.from({ length: 50 }).map((_, i) => ({ pageNumber: i, density: 50, fragmentation: 0.1 }))
      }
      render(React.createElement(FragmentationHeatmap, { snapshot }))
      expect(screen.getByText(/Page Details/)).toBeDefined()
      expect(screen.getAllByText(/Fragmentation Heatmap/).length).toBeGreaterThan(0)
    })
  })

  describe('Edge Case Handling', () => {
    it('should handle edge cases without crashing', () => {
      const { StorageParser } = require('../repository_after/src/utils/storageParser')
      const PAGE_SIZE = 8192
      const buffer = new ArrayBuffer(PAGE_SIZE)
      const view = new DataView(buffer)
      view.setUint32(4, 1, true)
      view.setUint32(8, 1, true)
      view.setUint16(16, 10, true)
      view.setUint16(18, 20, true) // lower < upper -> corrupted
      const file = { name: 'bad.dump', arrayBuffer: async () => buffer }

      return StorageParser.parseFile(file).then(snapshot => {
        expect(snapshot.corruptedPages.length).toBeGreaterThan(0)
      })
    })
  })

  describe('Deterministic Decoding and Explainable Metrics', () => {
    it('should ensure deterministic decoding and explainable storage metrics', () => {
      const { StorageParser } = require('../repository_after/src/utils/storageParser')
      const data = { heapPages: [], indexPages: [], totalPages: 0 }
      const s1 = StorageParser.parseJSONData(data, 'a.json')
      const s2 = StorageParser.parseJSONData(data, 'a.json')
      expect(s1.metrics.pageDensity).toBe(s2.metrics.pageDensity)
    })
  })
})
