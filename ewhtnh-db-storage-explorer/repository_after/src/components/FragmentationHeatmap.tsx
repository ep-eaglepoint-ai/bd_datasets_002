'use client'

import { useMemo } from 'react'
import { scaleLinear, interpolateRdYlGn } from 'd3'
import AutoSizer from 'react-virtualized-auto-sizer'
import { FixedSizeList as List } from 'react-window'
import { StorageSnapshot, HeatmapData } from '@/types/storage'

interface FragmentationHeatmapProps {
  snapshot: StorageSnapshot
}

export default function FragmentationHeatmap({ snapshot }: FragmentationHeatmapProps) {
  const pageHeatmaps = useMemo(() => snapshot.pageHeatmaps || [], [snapshot.pageHeatmaps])
  const heatmapData = useMemo(() => {
    const pages = snapshot.heatmapData || []
    
    if (pages.length === 0) {
      return {
        pages: [],
        maxDensity: 0,
        minDensity: 0,
        maxFragmentation: 0,
        minFragmentation: 0,
        totalPages: 0
      }
    }
    
    const maxDensity = Math.max(...pages.map(p => p.density))
    const minDensity = Math.min(...pages.map(p => p.density))
    const maxFragmentation = Math.max(...pages.map(p => p.fragmentation))
    const minFragmentation = Math.min(...pages.map(p => p.fragmentation))
    
    return {
      pages,
      maxDensity,
      minDensity,
      maxFragmentation,
      minFragmentation,
      totalPages: pages.length
    }
  }, [snapshot.heatmapData])

  const densityScale = useMemo(() => {
    return scaleLinear()
      .domain([heatmapData.minDensity, heatmapData.maxDensity || heatmapData.minDensity + 1])
      .range([0, 1])
      .clamp(true)
  }, [heatmapData.minDensity, heatmapData.maxDensity])

  const fragScale = useMemo(() => {
    return scaleLinear()
      .domain([heatmapData.minFragmentation, heatmapData.maxFragmentation || heatmapData.minFragmentation + 0.01])
      .range([0, 1])
      .clamp(true)
  }, [heatmapData.minFragmentation, heatmapData.maxFragmentation])

  const getColorForDensity = (density: number) => {
    return interpolateRdYlGn(densityScale(density))
  }

  const getColorForFragmentation = (fragmentation: number) => {
    return interpolateRdYlGn(1 - fragScale(fragmentation))
  }

  const accessScale = useMemo(() => {
    const max = pageHeatmaps.length > 0 ? Math.max(...pageHeatmaps.map(p => p.accessFrequency)) : 1
    return scaleLinear().domain([0, max || 1]).range([0, 1]).clamp(true)
  }, [pageHeatmaps])

  const modificationScale = useMemo(() => {
    const max = pageHeatmaps.length > 0 ? Math.max(...pageHeatmaps.map(p => p.modificationDensity)) : 1
    return scaleLinear().domain([0, max || 1]).range([0, 1]).clamp(true)
  }, [pageHeatmaps])

  const churnScale = useMemo(() => {
    const max = pageHeatmaps.length > 0 ? Math.max(...pageHeatmaps.map(p => p.storageChurn)) : 1
    return scaleLinear().domain([0, max || 1]).range([0, 1]).clamp(true)
  }, [pageHeatmaps])

  if (!heatmapData.pages || heatmapData.pages.length === 0) {
    return (
      <div className="p-6 text-center text-gray-500">
        <div className="text-lg font-medium">No heatmap data available</div>
        <div className="text-sm">This snapshot contains no page density information</div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Fragmentation Heatmap
        </h3>
        <div className="text-sm text-gray-600">
          {heatmapData.totalPages} pages | Density range: {heatmapData.minDensity.toFixed(1)}% - {heatmapData.maxDensity.toFixed(1)}%
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div>
          <h4 className="text-md font-medium text-gray-900 mb-3">Page Density Heatmap</h4>
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="mb-3 flex items-center space-x-4 text-xs">
              <div className="flex items-center">
                <div className="w-4 h-4 bg-green-600 mr-1"></div>
                <span>High (&gt;80%)</span>
              </div>
              <div className="flex items-center">
                <div className="w-4 h-4 bg-yellow-500 mr-1"></div>
                <span>Medium (40-80%)</span>
              </div>
              <div className="flex items-center">
                <div className="w-4 h-4 bg-red-500 mr-1"></div>
                <span>Low (&lt;40%)</span>
              </div>
            </div>
            <div className="grid grid-cols-20 gap-1">
              {heatmapData.pages.map((page, index) => (
                <div
                  key={index}
                  className="aspect-square cursor-pointer hover:opacity-80 rounded-sm"
                  style={{ backgroundColor: getColorForDensity(page.density) }}
                  title={`Page ${page.pageNumber}: ${page.density.toFixed(1)}% density, ${page.fragmentation.toFixed(1)}% fragmentation`}
                ></div>
              ))}
            </div>
          </div>
        </div>

        <div>
          <h4 className="text-md font-medium text-gray-900 mb-3">Fragmentation Heatmap</h4>
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="mb-3 flex items-center space-x-4 text-xs">
              <div className="flex items-center">
                <div className="w-4 h-4 bg-green-500 mr-1"></div>
                <span>Low (&lt;5%)</span>
              </div>
              <div className="flex items-center">
                <div className="w-4 h-4 bg-yellow-500 mr-1"></div>
                <span>Medium (5-20%)</span>
              </div>
              <div className="flex items-center">
                <div className="w-4 h-4 bg-red-600 mr-1"></div>
                <span>High (&gt;30%)</span>
              </div>
            </div>
            <div className="grid grid-cols-20 gap-1">
              {heatmapData.pages.map((page, index) => (
                <div
                  key={index}
                  className="aspect-square cursor-pointer hover:opacity-80 rounded-sm"
                  style={{ backgroundColor: getColorForFragmentation(page.fragmentation) }}
                  title={`Page ${page.pageNumber}: ${page.fragmentation.toFixed(1)}% fragmentation, ${page.density.toFixed(1)}% density`}
                ></div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div>
          <h4 className="text-md font-medium text-gray-900 mb-3">Density Distribution</h4>
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="space-y-2">
              {getDensityDistribution(heatmapData.pages).map((bucket, index) => (
                <div key={index} className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 w-24">{bucket.range}:</span>
                  <div className="flex-1 mx-2">
                    <div className="bg-gray-200 rounded-full h-4">
                      <div 
                        className="bg-blue-500 h-4 rounded-full"
                        style={{ width: `${bucket.percentage}%` }}
                      ></div>
                    </div>
                  </div>
                  <span className="text-sm font-mono w-12 text-right">{bucket.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div>
          <h4 className="text-md font-medium text-gray-900 mb-3">Fragmentation Distribution</h4>
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="space-y-2">
              {getFragmentationDistribution(heatmapData.pages).map((bucket, index) => (
                <div key={index} className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 w-24">{bucket.range}:</span>
                  <div className="flex-1 mx-2">
                    <div className="bg-gray-200 rounded-full h-4">
                      <div 
                        className="bg-red-500 h-4 rounded-full"
                        style={{ width: `${bucket.percentage}%` }}
                      ></div>
                    </div>
                  </div>
                  <span className="text-sm font-mono w-12 text-right">{bucket.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div>
          <h4 className="text-md font-medium text-gray-900 mb-3">Summary Statistics</h4>
          <div className="bg-gray-50 rounded-lg p-4 text-sm space-y-2">
            <div className="flex justify-between">
              <span>Average Density:</span>
              <span className="font-bold">
                {(heatmapData.pages.reduce((sum, p) => sum + p.density, 0) / heatmapData.pages.length).toFixed(1)}%
              </span>
            </div>
            <div className="flex justify-between">
              <span>Average Fragmentation:</span>
              <span className="font-bold">
                {(heatmapData.pages.reduce((sum, p) => sum + p.fragmentation, 0) / heatmapData.pages.length).toFixed(1)}%
              </span>
            </div>
            <div className="flex justify-between">
              <span>Critical Pages:</span>
              <span className="font-bold text-red-600">
                {heatmapData.pages.filter(p => p.fragmentation > 0.3 || p.density < 40).length}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Optimal Pages:</span>
              <span className="font-bold text-green-600">
                {heatmapData.pages.filter(p => p.fragmentation < 0.1 && p.density > 70).length}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div>
        <h4 className="text-md font-medium text-gray-900 mb-3">Page Details</h4>
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden max-h-96">
          <div style={{ height: 360 }}>
            <AutoSizer>
              {({ height, width }) => (
                <List
                  height={height}
                  itemCount={heatmapData.pages.length}
                  itemSize={48}
                  width={width}
                  itemKey={(index) => heatmapData.pages[index].pageNumber}
                >
                  {({ index, style }) => {
                    const page = heatmapData.pages[index]
                    return (
                      <div style={style} className="flex items-center px-4 border-b border-gray-100 hover:bg-gray-50">
                        <div className="w-16 font-medium">{page.pageNumber}</div>
                        <div className="flex-1 pr-4">
                          <div className="flex items-center">
                            <div className="flex-1 bg-gray-200 rounded-full h-2 mr-2">
                              <div
                                className={`h-2 rounded-full ${
                                  page.density > 80 ? 'bg-green-500' : page.density > 60 ? 'bg-yellow-500' : 'bg-red-500'
                                }`}
                                style={{ width: `${page.density}%` }}
                              ></div>
                            </div>
                            <div className="text-xs font-mono w-14 text-right">{page.density.toFixed(1)}%</div>
                          </div>
                          <div className="mt-1 flex items-center">
                            <div className="flex-1 bg-gray-200 rounded-full h-2 mr-2">
                              <div
                                className={`h-2 rounded-full ${
                                  page.fragmentation > 0.3 ? 'bg-red-500' : page.fragmentation > 0.1 ? 'bg-yellow-500' : 'bg-green-500'
                                }`}
                                style={{ width: `${page.fragmentation * 100}%` }}
                              ></div>
                            </div>
                            <div className="text-xs font-mono w-14 text-right">{(page.fragmentation * 100).toFixed(1)}%</div>
                          </div>
                        </div>
                        <div className="w-40 text-sm">
                          <div className={`inline-flex px-2 py-1 text-xs rounded-full ${
                            getPageStatus(page) === 'HEALTHY' ? 'bg-green-100 text-green-800' :
                            getPageStatus(page) === 'WARNING' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {getPageStatus(page)}
                          </div>
                        </div>
                        <div className="w-56 text-xs text-gray-600">{getRecommendation(page)}</div>
                      </div>
                    )
                  }}
                </List>
              )}
            </AutoSizer>
          </div>
        </div>
      </div>

      {pageHeatmaps.length > 0 && (
        <div className="mt-6">
          <h4 className="text-md font-medium text-gray-900 mb-3">Page-level Activity Heatmaps</h4>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div>
              <h5 className="text-sm font-medium text-gray-900 mb-2">Access Frequency</h5>
              <div className="grid grid-cols-20 gap-1 bg-gray-50 rounded-lg p-4">
                {pageHeatmaps.map((page) => (
                  <div
                    key={`access-${page.pageNumber}`}
                    className="aspect-square rounded-sm"
                    style={{ backgroundColor: interpolateRdYlGn(accessScale(page.accessFrequency)) }}
                    title={`Page ${page.pageNumber}: ${page.accessFrequency.toFixed(1)} access freq`}
                  ></div>
                ))}
              </div>
            </div>
            <div>
              <h5 className="text-sm font-medium text-gray-900 mb-2">Modification Density</h5>
              <div className="grid grid-cols-20 gap-1 bg-gray-50 rounded-lg p-4">
                {pageHeatmaps.map((page) => (
                  <div
                    key={`mod-${page.pageNumber}`}
                    className="aspect-square rounded-sm"
                    style={{ backgroundColor: interpolateRdYlGn(1 - modificationScale(page.modificationDensity)) }}
                    title={`Page ${page.pageNumber}: ${page.modificationDensity.toFixed(1)}% modified`}
                  ></div>
                ))}
              </div>
            </div>
            <div>
              <h5 className="text-sm font-medium text-gray-900 mb-2">Storage Churn</h5>
              <div className="grid grid-cols-20 gap-1 bg-gray-50 rounded-lg p-4">
                {pageHeatmaps.map((page) => (
                  <div
                    key={`churn-${page.pageNumber}`}
                    className="aspect-square rounded-sm"
                    style={{ backgroundColor: interpolateRdYlGn(1 - churnScale(page.storageChurn)) }}
                    title={`Page ${page.pageNumber}: ${page.storageChurn.toFixed(1)}% churn`}
                  ></div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function getDensityDistribution(pages: HeatmapData[]) {
  const distribution = [
    { range: '0-20%', count: 0, percentage: 0 },
    { range: '20-40%', count: 0, percentage: 0 },
    { range: '40-60%', count: 0, percentage: 0 },
    { range: '60-80%', count: 0, percentage: 0 },
    { range: '80-100%', count: 0, percentage: 0 }
  ]

  pages.forEach(page => {
    const density = page.density
    if (density <= 20) distribution[0].count++
    else if (density <= 40) distribution[1].count++
    else if (density <= 60) distribution[2].count++
    else if (density <= 80) distribution[3].count++
    else distribution[4].count++
  })

  distribution.forEach(bucket => {
    bucket.percentage = (bucket.count / pages.length) * 100
  })

  return distribution
}

function getFragmentationDistribution(pages: HeatmapData[]) {
  const distribution = [
    { range: '0-5%', count: 0, percentage: 0 },
    { range: '5-10%', count: 0, percentage: 0 },
    { range: '10-20%', count: 0, percentage: 0 },
    { range: '20-30%', count: 0, percentage: 0 },
    { range: '30%+', count: 0, percentage: 0 }
  ]

  pages.forEach(page => {
    const frag = page.fragmentation * 100
    if (frag <= 5) distribution[0].count++
    else if (frag <= 10) distribution[1].count++
    else if (frag <= 20) distribution[2].count++
    else if (frag <= 30) distribution[3].count++
    else distribution[4].count++
  })

  distribution.forEach(bucket => {
    bucket.percentage = (bucket.count / pages.length) * 100
  })

  return distribution
}

function getPageStatus(page: HeatmapData): string {
  if (page.fragmentation > 0.3 || page.density < 40) return 'CRITICAL'
  if (page.fragmentation > 0.1 || page.density < 60) return 'WARNING'
  return 'HEALTHY'
}

function getRecommendation(page: HeatmapData): string {
  if (page.fragmentation > 0.3) return 'Immediate VACUUM FULL needed'
  if (page.fragmentation > 0.1) return 'Schedule VACUUM soon'
  if (page.density < 40) return 'Consider table rewrite'
  if (page.density < 60) return 'Monitor closely'
  return 'No action needed'
}
