'use client'

import { useMemo } from 'react'
import { HeapPage } from '@/types/storage'

interface PageLayoutViewProps {
  page: HeapPage | null
}

export default function PageLayoutView({ page }: PageLayoutViewProps) {
  const pageVisualization = useMemo(() => {
    if (!page) return null

    const pageSize = 8192
    const headerSize = 24
    const linePointerSize = 4
    
    const segments = []
    
    segments.push({
      type: 'header',
      offset: 0,
      length: headerSize,
      label: 'Page Header',
      color: 'bg-blue-500'
    })
    
    page.linePointers.forEach((lp, index) => {
      if (lp.offset > 0) {
        segments.push({
          type: 'line-pointer',
          offset: headerSize + (index * linePointerSize),
          length: linePointerSize,
          label: `LP ${index}`,
          color: 'bg-green-500'
        })
        
        segments.push({
          type: 'tuple',
          offset: lp.offset,
          length: lp.length,
          label: `Tuple ${index}`,
          color: page.tuples[index]?.isDead ? 'bg-red-400' : 'bg-purple-500'
        })
      }
    })
    
    if (page.freeSpace.length > 0) {
      segments.push({
        type: 'free-space',
        offset: page.freeSpace.offset,
        length: page.freeSpace.length,
        label: `Free Space (${page.freeSpace.length} bytes)`,
        color: 'bg-gray-300'
      })
    }
    
    segments.sort((a, b) => a.offset - b.offset)
    
    return segments
  }, [page])

  if (!page) {
    return (
      <div className="p-6 text-center text-gray-500">
        <div className="text-lg font-medium">No page selected</div>
        <div className="text-sm">Select a page from the overview to view its layout</div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Page {page.header.pageNumber} Layout
        </h3>
        <div className="text-sm text-gray-600">
          Type: {page.header.pageType.toUpperCase()} | 
          Fill Factor: {page.fillFactor.toFixed(1)}% | 
          Dead Tuples: {(page.deadTupleRatio * 100).toFixed(1)}%
        </div>
      </div>

      <div className="mb-6">
        <div className="text-sm font-medium text-gray-700 mb-2">Page Map (8KB)</div>
        <div className="relative bg-gray-100 rounded-lg p-4" style={{ minHeight: '120px' }}>
          {pageVisualization?.map((segment, index) => {
            const left = (segment.offset / 8192) * 100
            const width = (segment.length / 8192) * 100
            
            return (
              <div
                key={index}
                className={`absolute h-8 ${segment.color} text-xs text-white flex items-center justify-center rounded cursor-pointer hover:opacity-80`}
                style={{
                  left: `${left}%`,
                  width: `${width}%`,
                  minWidth: width < 1 ? '2px' : 'auto'
                }}
                title={`${segment.label}: ${segment.length} bytes at offset ${segment.offset}`}
              >
                {width > 5 && segment.label}
              </div>
            )
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <h4 className="text-md font-medium text-gray-900 mb-3">Page Header</h4>
          <div className="bg-gray-50 rounded-lg p-4 text-sm font-mono">
            <div className="grid grid-cols-2 gap-2">
              <div>Page Number:</div>
              <div className="font-bold">{page.header.pageNumber}</div>
              <div>Page Type:</div>
              <div className="font-bold">{page.header.pageType.toUpperCase()}</div>
              <div>LSN:</div>
              <div className="font-bold">{page.header.lsn}</div>
              <div>Checksum:</div>
              <div className="font-bold">{page.header.checksum}</div>
              <div>Lower:</div>
              <div className="font-bold">{page.header.lower}</div>
              <div>Upper:</div>
              <div className="font-bold">{page.header.upper}</div>
              <div>Special:</div>
              <div className="font-bold">{page.header.special}</div>
              <div>Flags:</div>
              <div className="font-bold">0x{page.header.flags.toString(16)}</div>
            </div>
          </div>
        </div>

        <div>
          <h4 className="text-md font-medium text-gray-900 mb-3">Storage Statistics</h4>
          <div className="bg-gray-50 rounded-lg p-4 text-sm">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Total Tuples:</span>
                <span className="font-bold">{page.tuples.length}</span>
              </div>
              <div className="flex justify-between">
                <span>Live Tuples:</span>
                <span className="font-bold text-green-600">
                  {page.tuples.filter(t => t.isVisible).length}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Dead Tuples:</span>
                <span className="font-bold text-red-600">
                  {page.tuples.filter(t => t.isDead).length}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Free Space:</span>
                <span className="font-bold">{page.freeSpace.length} bytes</span>
              </div>
              <div className="flex justify-between">
                <span>Used Space:</span>
                <span className="font-bold">{8192 - page.freeSpace.length} bytes</span>
              </div>
              <div className="flex justify-between">
                <span>Fragmentation:</span>
                <span className="font-bold">
                  {page.deadTupleRatio > 0.3 ? (
                    <span className="text-red-600">High</span>
                  ) : page.deadTupleRatio > 0.1 ? (
                    <span className="text-yellow-600">Medium</span>
                  ) : (
                    <span className="text-green-600">Low</span>
                  )}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6">
        <h4 className="text-md font-medium text-gray-900 mb-3">Line Pointers & Tuples</h4>
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Index</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Offset</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Length</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Xmin</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Xmax</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Data Size</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {page.linePointers.map((lp, index) => {
                const tuple = page.tuples[index]
                return (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-4 py-2 text-sm font-medium">{index}</td>
                    <td className="px-4 py-2 text-sm font-mono">{lp.offset}</td>
                    <td className="px-4 py-2 text-sm font-mono">{lp.length}</td>
                    <td className="px-4 py-2 text-sm">
                      {tuple ? (
                        <span className={`inline-flex px-2 py-1 text-xs rounded-full ${
                          tuple.isVisible 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {tuple.isVisible ? 'LIVE' : 'DEAD'}
                        </span>
                      ) : (
                        <span className="text-gray-400">EMPTY</span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-sm font-mono">
                      {tuple ? tuple.header.tXmin : '-'}
                    </td>
                    <td className="px-4 py-2 text-sm font-mono">
                      {tuple ? tuple.header.tXmax : '-'}
                    </td>
                    <td className="px-4 py-2 text-sm font-mono">
                      {tuple ? tuple.data.byteLength : '-'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {page.freeSpace.length > 0 && (
        <div className="mt-6">
          <h4 className="text-md font-medium text-gray-900 mb-3">Free Space Analysis</h4>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <div className="font-medium text-blue-900">Free Space Location</div>
                <div className="text-blue-700">Offset: {page.freeSpace.offset}</div>
              </div>
              <div>
                <div className="font-medium text-blue-900">Available Bytes</div>
                <div className="text-blue-700">{page.freeSpace.length} bytes</div>
              </div>
              <div>
                <div className="font-medium text-blue-900">Usable For</div>
                <div className="text-blue-700">
                  {Math.floor(page.freeSpace.length / 100)} average tuples
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
