'use client'

import { useMemo } from 'react'
import { StorageSnapshot } from '@/types/storage'

interface FreeSpaceMapViewProps {
  snapshot: StorageSnapshot
}

export default function FreeSpaceMapView({ snapshot }: FreeSpaceMapViewProps) {
  const freeSpace = snapshot.freeSpaceMap

  const stats = useMemo(() => {
    const pages = freeSpace.pages || []
    const totalPages = pages.length
    const fullPages = pages.filter(p => p.isFull).length
    const deadTuplePages = pages.filter(p => p.hasDeadTuples).length
    const avgFree = totalPages > 0 ? freeSpace.totalFreeSpace / totalPages : 0
    return { totalPages, fullPages, deadTuplePages, avgFree }
  }, [freeSpace])

  if (!freeSpace || freeSpace.pages.length === 0) {
    return (
      <div className="p-6 text-center text-gray-500">
        <div className="text-lg font-medium">No free space map data</div>
        <div className="text-sm">This snapshot contains no free space metadata</div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">Free Space Map</h3>
        <div className="text-sm text-gray-600">
          {stats.totalPages} pages | Total free space: {freeSpace.totalFreeSpace} bytes
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gray-50 rounded-lg p-4 text-sm">
          <div className="text-gray-600">Avg Free/Page</div>
          <div className="text-lg font-semibold">{stats.avgFree.toFixed(1)} bytes</div>
        </div>
        <div className="bg-gray-50 rounded-lg p-4 text-sm">
          <div className="text-gray-600">Nearly Full Pages</div>
          <div className="text-lg font-semibold">{stats.fullPages}</div>
        </div>
        <div className="bg-gray-50 rounded-lg p-4 text-sm">
          <div className="text-gray-600">Dead Tuple Pages</div>
          <div className="text-lg font-semibold">{stats.deadTuplePages}</div>
        </div>
        <div className="bg-gray-50 rounded-lg p-4 text-sm">
          <div className="text-gray-600">Fragmentation Index</div>
          <div className="text-lg font-semibold">{freeSpace.fragmentationIndex.toFixed(2)}</div>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Page</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Free Bytes</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Dead Tuples</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {freeSpace.pages.map((page) => (
              <tr key={page.pageNumber} className="hover:bg-gray-50">
                <td className="px-4 py-2 text-sm font-mono">{page.pageNumber}</td>
                <td className="px-4 py-2 text-sm font-mono">{page.freeBytes}</td>
                <td className="px-4 py-2 text-sm">
                  <span className={`inline-flex px-2 py-1 text-xs rounded-full ${
                    page.isFull ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                  }`}>
                    {page.isFull ? 'FULL' : 'AVAILABLE'}
                  </span>
                </td>
                <td className="px-4 py-2 text-sm">
                  {page.hasDeadTuples ? (
                    <span className="text-red-600 font-medium">Yes</span>
                  ) : (
                    <span className="text-gray-500">No</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
