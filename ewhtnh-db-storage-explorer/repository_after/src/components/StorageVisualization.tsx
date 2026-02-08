'use client'

import { useState, useEffect, useMemo } from 'react'
import { useStorageStore } from '@/store/storageStore'
import PageLayoutView from './PageLayoutView'
import TupleInspector from './TupleInspector'
import IndexVisualization from './IndexVisualization'
import FragmentationHeatmap from './FragmentationHeatmap'
import BinaryInspector from './BinaryInspector'
import FreeSpaceMapView from './FreeSpaceMapView'
import SnapshotComparison from './SnapshotComparison'
import StorageSimulationPanel from './StorageSimulationPanel'
import { StorageSnapshot } from '@/types/storage'

type ViewMode = 'overview' | 'page-layout' | 'tuple-inspector' | 'index-visualization' | 'fragmentation' | 'binary-inspector' | 'free-space' | 'comparison' | 'simulation'

export default function StorageVisualization() {
  const { currentSnapshot, selectedPage, selectedTuple, setSelectedPage, setSelectedTuple } = useStorageStore()
  const [viewMode, setViewMode] = useState<ViewMode>('overview')
  const [searchTerm, setSearchTerm] = useState('')

  const filteredHeapPages = useMemo(() => {
    if (!currentSnapshot || !searchTerm) return currentSnapshot?.heapPages || []
    
    return currentSnapshot.heapPages.filter(page => 
      page.header.pageNumber.toString().includes(searchTerm) ||
      page.tuples.some(tuple => 
        Object.keys(tuple.values).some(key => 
          tuple.values[key]?.toString().toLowerCase().includes(searchTerm.toLowerCase())
        )
      )
    )
  }, [currentSnapshot, searchTerm])

  const selectedPageData = useMemo(() => {
    if (!currentSnapshot || selectedPage === null) return null
    return currentSnapshot.heapPages.find(p => p.header.pageNumber === selectedPage) || null
  }, [currentSnapshot, selectedPage])

  const selectedTupleData = useMemo(() => {
    if (!selectedPageData || selectedTuple === null) return null
    return selectedPageData.tuples[selectedTuple] || null
  }, [selectedPageData, selectedTuple])

  useEffect(() => {
    if (currentSnapshot && currentSnapshot.heapPages.length > 0 && selectedPage === null) {
      setSelectedPage(currentSnapshot.heapPages[0].header.pageNumber)
    }
  }, [currentSnapshot, selectedPage, setSelectedPage])

  if (!currentSnapshot) {
    return (
      <div className="bg-white rounded-lg shadow-md p-8">
        <div className="text-center text-gray-500">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No storage snapshot loaded</h3>
          <p className="mt-1 text-sm text-gray-500">Import a database dump to visualize storage internals</p>
        </div>
      </div>
    )
  }

  const renderView = () => {
    switch (viewMode) {
      case 'overview':
        return <OverviewView snapshot={currentSnapshot} onPageSelect={setSelectedPage} filteredHeapPages={filteredHeapPages} />
      case 'page-layout':
        return <PageLayoutView page={selectedPageData} />
      case 'tuple-inspector':
        return <TupleInspector tuple={selectedTupleData} page={selectedPageData} />
      case 'index-visualization':
        return <IndexVisualization snapshot={currentSnapshot} />
      case 'fragmentation':
        return <FragmentationHeatmap snapshot={currentSnapshot} />
      case 'binary-inspector':
        return <BinaryInspector snapshot={currentSnapshot} selectedPage={selectedPageData || undefined} selectedTuple={selectedTupleData || undefined} />
      case 'free-space':
        return <FreeSpaceMapView snapshot={currentSnapshot} />
      case 'comparison':
        return <SnapshotComparison />
      case 'simulation':
        return <StorageSimulationPanel />
      default:
        return <OverviewView snapshot={currentSnapshot} onPageSelect={setSelectedPage} filteredHeapPages={filteredHeapPages} />
    }
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
          <div>
            <h2 className="text-2xl font-semibold text-gray-900">
              {currentSnapshot.databaseName}.{currentSnapshot.tableName}
            </h2>
            <p className="text-sm text-gray-500">
              Loaded {new Date(currentSnapshot.timestamp).toLocaleString()}
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4">
            <input
              type="text"
              placeholder="Search pages or tuples..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            
            <select
              value={viewMode}
              onChange={(e) => setViewMode(e.target.value as ViewMode)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="overview">Overview</option>
              <option value="page-layout">Page Layout</option>
              <option value="tuple-inspector">Tuple Inspector</option>
              <option value="index-visualization">Index Visualization</option>
              <option value="fragmentation">Fragmentation Heatmap</option>
              <option value="binary-inspector">Binary Inspector</option>
              <option value="free-space">Free Space Map</option>
              <option value="comparison">Snapshot Comparison</option>
              <option value="simulation">Simulation</option>
            </select>
          </div>
        </div>
        
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{currentSnapshot.metrics.totalPages}</div>
            <div className="text-sm text-gray-500">Total Pages</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{currentSnapshot.heapPages.length}</div>
            <div className="text-sm text-gray-500">Heap Pages</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">{currentSnapshot.indexPages.length}</div>
            <div className="text-sm text-gray-500">Index Pages</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">{currentSnapshot.corruptedPages.length}</div>
            <div className="text-sm text-gray-500">Corrupted</div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md">
        {renderView()}
      </div>
    </div>
  )
}

interface OverviewViewProps {
  snapshot: StorageSnapshot
  onPageSelect: (pageNumber: number) => void
  filteredHeapPages?: StorageSnapshot['heapPages']
}

function OverviewView({ snapshot, onPageSelect, filteredHeapPages }: OverviewViewProps) {
  const [selectedPageType, setSelectedPageType] = useState<'all' | 'heap' | 'index'>('all')

  const filteredPages = selectedPageType === 'all' 
    ? [...(filteredHeapPages || snapshot.heapPages), ...snapshot.indexPages]
    : selectedPageType === 'heap' 
    ? (filteredHeapPages || snapshot.heapPages)
    : snapshot.indexPages

  return (
    <div className="p-6">
      <div className="mb-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Storage Overview</h3>
        
        <div className="flex space-x-4 mb-4">
          <button
            onClick={() => setSelectedPageType('all')}
            className={`px-4 py-2 rounded-md ${
              selectedPageType === 'all' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            All Pages ({snapshot.metrics.totalPages})
          </button>
          <button
            onClick={() => setSelectedPageType('heap')}
            className={`px-4 py-2 rounded-md ${
              selectedPageType === 'heap' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Heap ({snapshot.heapPages.length})
          </button>
          <button
            onClick={() => setSelectedPageType('index')}
            className={`px-4 py-2 rounded-md ${
              selectedPageType === 'index' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Index ({snapshot.indexPages.length})
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-96 overflow-y-auto">
        {filteredPages.map((page) => {
          const isHeap = 'tuples' in page
          const fillFactor = isHeap ? page.fillFactor : page.utilization
          const status = isHeap 
            ? (page as any).deadTupleRatio > 0.5 ? 'warning' : 'healthy'
            : 'healthy'

          return (
            <div
              key={page.header.pageNumber}
              onClick={() => onPageSelect(page.header.pageNumber)}
              className="border border-gray-200 rounded-lg p-4 cursor-pointer hover:border-blue-400 hover:shadow-md transition-all"
            >
              <div className="flex justify-between items-start mb-2">
                <div>
                  <div className="font-medium text-gray-900">
                    Page {page.header.pageNumber}
                  </div>
                  <div className="text-sm text-gray-500">
                    {page.header.pageType.toUpperCase()}
                  </div>
                </div>
                <div className={`px-2 py-1 text-xs rounded-full ${
                  status === 'healthy' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                }`}>
                  {status}
                </div>
              </div>
              
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Fill Factor:</span>
                  <span className="font-medium">{fillFactor.toFixed(1)}%</span>
                </div>
                
                {isHeap && (
                  <>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Tuples:</span>
                      <span className="font-medium">{(page as any).tuples.length}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Dead:</span>
                      <span className="font-medium text-red-600">
                        {((page as any).deadTupleRatio * 100).toFixed(1)}%
                      </span>
                    </div>
                  </>
                )}
                
                {!isHeap && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Keys:</span>
                    <span className="font-medium">{(page as any).node.keys.length}</span>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {snapshot.corruptedPages.length > 0 && (
        <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <h4 className="font-medium text-red-900 mb-2">Corrupted Pages</h4>
          <div className="text-sm text-red-700">
            {snapshot.corruptedPages.join(', ')}
          </div>
        </div>
      )}
    </div>
  )
}
