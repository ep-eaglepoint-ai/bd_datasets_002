'use client'

import { useMemo } from 'react'
import { useStorageStore } from '@/store/storageStore'
import { StorageSnapshot } from '@/types/storage'

export default function MetricsPanel() {
  const { currentSnapshot } = useStorageStore()

  if (!currentSnapshot) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Storage Metrics</h3>
        <div className="text-center text-gray-500">
          <div className="text-sm">No data available</div>
        </div>
      </div>
    )
  }

  const metrics = currentSnapshot.metrics
  const efficiencyGrade = calculateEfficiencyGrade(metrics)
  const recommendations = generateRecommendations(metrics)

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-lg font-medium text-gray-900 mb-4">Storage Metrics</h3>
      
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">Overall Efficiency</span>
          <span className={`px-2 py-1 text-xs rounded-full ${efficiencyGrade.color}`}>
            {efficiencyGrade.grade}
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className={`h-2 rounded-full ${efficiencyGrade.bgColor}`}
            style={{ width: `${efficiencyGrade.score}%` }}
          ></div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="border-b border-gray-200 pb-4">
          <h4 className="text-sm font-medium text-gray-900 mb-3">Storage Utilization</h4>
          <div className="space-y-2">
            <MetricRow
              label="Total Pages"
              value={metrics.totalPages}
              format="number"
            />
            <MetricRow
              label="Used Pages"
              value={metrics.usedPages}
              format="number"
            />
            <MetricRow
              label="Page Density"
              value={metrics.pageDensity}
              format="percentage"
            />
            <MetricRow
              label="Average Fill Factor"
              value={metrics.averageFillFactor}
              format="percentage"
            />
          </div>
        </div>

        <div className="border-b border-gray-200 pb-4">
          <h4 className="text-sm font-medium text-gray-900 mb-3">Fragmentation Analysis</h4>
          <div className="space-y-2">
            <MetricRow
              label="Fragmentation Ratio"
              value={metrics.fragmentationRatio}
              format="percentage"
              threshold={{ good: 10, warning: 25 }}
            />
            <MetricRow
              label="Dead Tuple Ratio"
              value={metrics.deadTupleRatio}
              format="percentage"
              threshold={{ good: 5, warning: 15 }}
            />
            <MetricRow
              label="Free Space"
              value={metrics.freeBytes}
              format="bytes"
            />
          </div>
        </div>

        <div className="border-b border-gray-200 pb-4">
          <h4 className="text-sm font-medium text-gray-900 mb-3">Bloat Estimation</h4>
          <div className="space-y-2">
            <MetricRow
              label="Table Bloat"
              value={metrics.bloatEstimate}
              format="percentage"
              threshold={{ good: 10, warning: 20 }}
            />
            <MetricRow
              label="Index Bloat"
              value={metrics.indexBloatEstimate}
              format="percentage"
              threshold={{ good: 15, warning: 30 }}
            />
            <MetricRow
              label="Wasted Space"
              value={metrics.usedBytes * (metrics.bloatEstimate / 100)}
              format="bytes"
            />
          </div>
        </div>

        <div className="pb-4">
          <h4 className="text-sm font-medium text-gray-900 mb-3">Storage Size</h4>
          <div className="space-y-2">
            <MetricRow
              label="Total Size"
              value={metrics.totalBytes}
              format="bytes"
            />
            <MetricRow
              label="Used Size"
              value={metrics.usedBytes}
              format="bytes"
            />
            <MetricRow
              label="Available Size"
              value={metrics.freeBytes}
              format="bytes"
            />
          </div>
        </div>
      </div>

      {recommendations.length > 0 && (
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h4 className="text-sm font-medium text-blue-900 mb-2">Recommendations</h4>
          <ul className="text-sm text-blue-700 space-y-1">
            {recommendations.map((rec, index) => (
              <li key={index} className="flex items-start">
                <span className="mr-2">•</span>
                <span>{rec}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

interface MetricRowProps {
  label: string
  value: number
  format: 'number' | 'percentage' | 'bytes'
  threshold?: { good: number; warning: number }
}

function MetricRow({ label, value, format, threshold }: MetricRowProps) {
  const formattedValue = useMemo(() => {
    switch (format) {
      case 'number':
        return value.toLocaleString()
      case 'percentage':
        return `${value.toFixed(1)}%`
      case 'bytes':
        if (value >= 1024 * 1024 * 1024) {
          return `${(value / (1024 * 1024 * 1024)).toFixed(2)} GB`
        } else if (value >= 1024 * 1024) {
          return `${(value / (1024 * 1024)).toFixed(2)} MB`
        } else if (value >= 1024) {
          return `${(value / 1024).toFixed(2)} KB`
        } else {
          return `${value} bytes`
        }
      default:
        return value.toString()
    }
  }, [value, format])

  const statusColor = useMemo(() => {
    if (!threshold) return 'text-gray-600'
    
    if (format === 'percentage') {
      if (value <= threshold.good) return 'text-green-600'
      if (value <= threshold.warning) return 'text-yellow-600'
      return 'text-red-600'
    }
    
    return 'text-gray-600'
  }, [value, format, threshold])

  return (
    <div className="flex justify-between items-center">
      <span className="text-sm text-gray-600">{label}:</span>
      <span className={`text-sm font-medium ${statusColor}`}>
        {formattedValue}
      </span>
    </div>
  )
}

function calculateEfficiencyGrade(metrics: any) {
  let score = 100
  
  score -= Math.min(metrics.fragmentationRatio * 2, 30)
  score -= Math.min(metrics.deadTupleRatio * 3, 25)
  score -= Math.min(metrics.bloatEstimate * 1.5, 20)
  score -= Math.min((100 - metrics.averageFillFactor) * 0.5, 15)
  
  score = Math.max(0, Math.min(100, score))
  
  let grade, color, bgColor
  if (score >= 90) {
    grade = 'A+'
    color = 'bg-green-100 text-green-800'
    bgColor = 'bg-green-500'
  } else if (score >= 80) {
    grade = 'A'
    color = 'bg-green-100 text-green-800'
    bgColor = 'bg-green-500'
  } else if (score >= 70) {
    grade = 'B'
    color = 'bg-blue-100 text-blue-800'
    bgColor = 'bg-blue-500'
  } else if (score >= 60) {
    grade = 'C'
    color = 'bg-yellow-100 text-yellow-800'
    bgColor = 'bg-yellow-500'
  } else if (score >= 50) {
    grade = 'D'
    color = 'bg-orange-100 text-orange-800'
    bgColor = 'bg-orange-500'
  } else {
    grade = 'F'
    color = 'bg-red-100 text-red-800'
    bgColor = 'bg-red-500'
  }
  
  return { grade, color, bgColor, score }
}

function generateRecommendations(metrics: any): string[] {
  const recommendations: string[] = []
  
  if (metrics.fragmentationRatio > 25) {
    recommendations.push('High fragmentation detected. Consider running VACUUM FULL or table rewrite.')
  } else if (metrics.fragmentationRatio > 10) {
    recommendations.push('Moderate fragmentation. Regular VACUUM operations recommended.')
  }
  
  if (metrics.deadTupleRatio > 15) {
    recommendations.push('High dead tuple ratio. Schedule more frequent VACUUM operations.')
  } else if (metrics.deadTupleRatio > 5) {
    recommendations.push('Monitor dead tuple ratio. Consider autovacuum tuning.')
  }
  
  if (metrics.bloatEstimate > 20) {
    recommendations.push('Significant table bloat detected. Consider table rewrite or reorganization.')
  } else if (metrics.bloatEstimate > 10) {
    recommendations.push('Moderate table bloat. Monitor and plan maintenance window.')
  }
  
  if (metrics.indexBloatEstimate > 30) {
    recommendations.push('High index bloat. Rebuild indexes to improve performance.')
  } else if (metrics.indexBloatEstimate > 15) {
    recommendations.push('Monitor index bloat. Schedule index rebuild during maintenance.')
  }
  
  if (metrics.averageFillFactor < 70) {
    recommendations.push('Low page fill factor. Review fill factor settings and data patterns.')
  }
  
  if (recommendations.length === 0) {
    recommendations.push('Storage metrics look healthy. Continue monitoring.')
  }
  
  return recommendations
}
