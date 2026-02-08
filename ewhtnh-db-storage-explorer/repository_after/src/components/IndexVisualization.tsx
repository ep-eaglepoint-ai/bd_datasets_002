'use client'

import { useMemo } from 'react'
import { StorageSnapshot, IndexPage } from '@/types/storage'

interface IndexVisualizationProps {
  snapshot: StorageSnapshot
}

export default function IndexVisualization({ snapshot }: IndexVisualizationProps) {
  const indexAnalysis = useMemo(() => {
    if (snapshot.indexPages.length === 0) return null

    const totalPages = snapshot.indexPages.length
    const leafPages = snapshot.indexPages.filter(p => p.node.isLeaf).length
    const internalPages = totalPages - leafPages
    const maxLevel = Math.max(...snapshot.indexPages.map(p => p.node.level))
    const averageUtilization = snapshot.indexPages.reduce((sum, p) => sum + p.utilization, 0) / totalPages
    const averageKeysPerPage = snapshot.indexPages.reduce((sum, p) => sum + p.node.keys.length, 0) / totalPages

    return {
      totalPages,
      leafPages,
      internalPages,
      maxLevel,
      averageUtilization,
      averageKeysPerPage,
      treeHeight: maxLevel + 1,
      totalKeys: snapshot.indexPages.reduce((sum, p) => sum + p.node.keys.length, 0)
    }
  }, [snapshot.indexPages])

  const treeStructure = useMemo(() => {
    if (!indexAnalysis) return null

    const levels = []
    for (let level = indexAnalysis.maxLevel; level >= 0; level--) {
      const pagesAtLevel = snapshot.indexPages.filter(p => p.node.level === level)
      levels.push({
        level,
        pages: pagesAtLevel,
        count: pagesAtLevel.length
      })
    }

    return levels
  }, [snapshot.indexPages, indexAnalysis])

  if (!indexAnalysis) {
    return (
      <div className="p-6 text-center text-gray-500">
        <div className="text-lg font-medium">No index pages found</div>
        <div className="text-sm">This snapshot contains no index data to visualize</div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Index Structure Analysis
        </h3>
        <div className="text-sm text-gray-600">
          {indexAnalysis.totalPages} index pages | Tree height: {indexAnalysis.treeHeight} | 
          Total keys: {indexAnalysis.totalKeys}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div>
          <h4 className="text-md font-medium text-gray-900 mb-3">Index Statistics</h4>
          <div className="bg-gray-50 rounded-lg p-4 text-sm space-y-2">
            <div className="flex justify-between">
              <span>Tree Height:</span>
              <span className="font-bold">{indexAnalysis.treeHeight}</span>
            </div>
            <div className="flex justify-between">
              <span>Total Pages:</span>
              <span className="font-bold">{indexAnalysis.totalPages}</span>
            </div>
            <div className="flex justify-between">
              <span>Leaf Pages:</span>
              <span className="font-bold">{indexAnalysis.leafPages}</span>
            </div>
            <div className="flex justify-between">
              <span>Internal Pages:</span>
              <span className="font-bold">{indexAnalysis.internalPages}</span>
            </div>
            <div className="flex justify-between">
              <span>Average Utilization:</span>
              <span className="font-bold">{indexAnalysis.averageUtilization.toFixed(1)}%</span>
            </div>
            <div className="flex justify-between">
              <span>Average Keys/Page:</span>
              <span className="font-bold">{indexAnalysis.averageKeysPerPage.toFixed(1)}</span>
            </div>
          </div>
        </div>

        <div>
          <h4 className="text-md font-medium text-gray-900 mb-3">Efficiency Metrics</h4>
          <div className="bg-gray-50 rounded-lg p-4 text-sm space-y-2">
            <div className="flex justify-between">
              <span>Fanout (Avg):</span>
              <span className="font-bold">
                {indexAnalysis.internalPages > 0 
                  ? (indexAnalysis.totalPages - 1) / indexAnalysis.internalPages
                  : 'N/A'
                }
              </span>
            </div>
            <div className="flex justify-between">
              <span>Branching Factor:</span>
              <span className="font-bold">
                {treeStructure && treeStructure.length > 1
                  ? (treeStructure[treeStructure.length - 2].count / treeStructure[treeStructure.length - 1].count).toFixed(2)
                  : 'N/A'
                }
              </span>
            </div>
            <div className="flex justify-between">
              <span>Lookup Cost:</span>
              <span className="font-bold">{indexAnalysis.treeHeight} I/Os</span>
            </div>
            <div className="flex justify-between">
              <span>Index Bloat:</span>
              <span className="font-bold text-red-600">
                {Math.max(0, 100 - indexAnalysis.averageUtilization).toFixed(1)}%
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="mb-6">
        <h4 className="text-md font-medium text-gray-900 mb-3">Tree Structure Visualization</h4>
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="space-y-4">
            {treeStructure?.map((level, index) => (
              <div key={level.level} className="flex items-center space-x-4">
                <div className="text-sm font-medium text-gray-700 w-20">
                  Level {level.level}:
                </div>
                <div className="flex-1">
                  <div className="flex space-x-2">
                    {level.pages.map((page, pageIndex) => (
                      <div
                        key={page.header.pageNumber}
                        className={`px-3 py-2 rounded text-xs font-mono cursor-pointer hover:opacity-80 ${
                          page.node.isLeaf 
                            ? 'bg-green-100 text-green-800 border border-green-200' 
                            : 'bg-blue-100 text-blue-800 border border-blue-200'
                        }`}
                        title={`Page ${page.header.pageNumber}: ${page.node.keys.length} keys, ${page.utilization.toFixed(1)}% full`}
                      >
                        {page.header.pageNumber}
                        <div className="text-xs opacity-75">
                          {page.node.keys.length} keys
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="text-sm text-gray-600 w-16 text-right">
                  {level.count} pages
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mb-6">
        <h4 className="text-md font-medium text-gray-900 mb-3">Index Pages Details</h4>
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Page</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Level</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Keys</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Pointers</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Utilization</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Key Range</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {snapshot.indexPages.map((page) => (
                <tr key={page.header.pageNumber} className="hover:bg-gray-50">
                  <td className="px-4 py-2 text-sm font-medium">{page.header.pageNumber}</td>
                  <td className="px-4 py-2 text-sm">
                    <span className={`inline-flex px-2 py-1 text-xs rounded-full ${
                      page.node.isLeaf 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-blue-100 text-blue-800'
                    }`}>
                      {page.node.isLeaf ? 'LEAF' : 'INTERNAL'}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-sm font-mono">{page.node.level}</td>
                  <td className="px-4 py-2 text-sm font-mono">{page.node.keys.length}</td>
                  <td className="px-4 py-2 text-sm font-mono">{page.node.childPointers.length}</td>
                  <td className="px-4 py-2 text-sm">
                    <div className="flex items-center">
                      <div className="flex-1 bg-gray-200 rounded-full h-2 mr-2">
                        <div 
                          className={`h-2 rounded-full ${
                            page.utilization > 80 ? 'bg-green-500' :
                            page.utilization > 60 ? 'bg-yellow-500' : 'bg-red-500'
                          }`}
                          style={{ width: `${page.utilization}%` }}
                        ></div>
                      </div>
                      <span className="text-xs font-mono">{page.utilization.toFixed(1)}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-2 text-sm font-mono text-xs">
                    {page.keyRanges.length > 0 ? (
                      <div>
                        <div>Min: {page.keyRanges[0]?.min || 'N/A'}</div>
                        <div>Max: {page.keyRanges[page.keyRanges.length - 1]?.max || 'N/A'}</div>
                      </div>
                    ) : (
                      'N/A'
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <h4 className="text-md font-medium text-gray-900 mb-3">Key Distribution Analysis</h4>
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <div className="font-medium text-gray-900">Keys per Page Distribution</div>
              <div className="mt-2">
                {getKeyDistribution(snapshot.indexPages).map((bucket, index) => (
                  <div key={index} className="flex justify-between py-1">
                    <span className="text-gray-600">{bucket.range}:</span>
                    <span className="font-mono">{bucket.count} pages</span>
                  </div>
                ))}
              </div>
            </div>
            
            <div>
              <div className="font-medium text-gray-900">Utilization Distribution</div>
              <div className="mt-2">
                {getUtilizationDistribution(snapshot.indexPages).map((bucket, index) => (
                  <div key={index} className="flex justify-between py-1">
                    <span className="text-gray-600">{bucket.range}:</span>
                    <span className="font-mono">{bucket.count} pages</span>
                  </div>
                ))}
              </div>
            </div>
            
            <div>
              <div className="font-medium text-gray-900">Page Balance</div>
              <div className="mt-2 space-y-1">
                <div className="flex justify-between">
                  <span className="text-gray-600">Well Balanced:</span>
                  <span className="font-mono text-green-600">
                    {getWellBalancedPages(snapshot.indexPages)}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Needs Rebuild:</span>
                  <span className="font-mono text-red-600">
                    {getPagesNeedingRebuild(snapshot.indexPages)}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function getKeyDistribution(pages: IndexPage[]) {
  const distribution = [
    { range: '0-10 keys', count: 0 },
    { range: '11-50 keys', count: 0 },
    { range: '51-100 keys', count: 0 },
    { range: '101-200 keys', count: 0 },
    { range: '200+ keys', count: 0 }
  ]

  pages.forEach(page => {
    const keyCount = page.node.keys.length
    if (keyCount <= 10) distribution[0].count++
    else if (keyCount <= 50) distribution[1].count++
    else if (keyCount <= 100) distribution[2].count++
    else if (keyCount <= 200) distribution[3].count++
    else distribution[4].count++
  })

  return distribution
}

function getUtilizationDistribution(pages: IndexPage[]) {
  const distribution = [
    { range: '0-25%', count: 0 },
    { range: '26-50%', count: 0 },
    { range: '51-75%', count: 0 },
    { range: '76-90%', count: 0 },
    { range: '91-100%', count: 0 }
  ]

  pages.forEach(page => {
    const util = page.utilization
    if (util <= 25) distribution[0].count++
    else if (util <= 50) distribution[1].count++
    else if (util <= 75) distribution[2].count++
    else if (util <= 90) distribution[3].count++
    else distribution[4].count++
  })

  return distribution
}

function getWellBalancedPages(pages: IndexPage[]) {
  if (pages.length === 0) return 0
  
  const keyCounts = pages.map(p => p.node.keys.length)
  const avgKeys = keyCounts.reduce((sum, count) => sum + count, 0) / keyCounts.length
  const threshold = avgKeys * 0.3
  
  const wellBalanced = keyCounts.filter(count => Math.abs(count - avgKeys) <= threshold).length
  return Math.round((wellBalanced / pages.length) * 100)
}

function getPagesNeedingRebuild(pages: IndexPage[]) {
  if (pages.length === 0) return 0
  
  const needingRebuild = pages.filter(page => page.utilization < 50 || page.utilization > 95).length
  return Math.round((needingRebuild / pages.length) * 100)
}
