'use client'

import { useMemo, useState } from 'react'
import { useStorageStore } from '@/store/storageStore'
import { compareSnapshots } from '@/utils/compareSnapshots'

export default function SnapshotComparison() {
  const { snapshots, addComparison } = useStorageStore()
  const [leftId, setLeftId] = useState<string | null>(snapshots[0]?.id || null)
  const [rightId, setRightId] = useState<string | null>(snapshots[1]?.id || null)

  const comparison = useMemo(() => {
    if (!leftId || !rightId) return null
    const left = snapshots.find(s => s.id === leftId)
    const right = snapshots.find(s => s.id === rightId)
    if (!left || !right) return null
    return compareSnapshots(left, right)
  }, [leftId, rightId, snapshots])

  if (snapshots.length < 2) {
    return (
      <div className="p-6 text-center text-gray-500">
        <div className="text-lg font-medium">No comparison available</div>
        <div className="text-sm">Import at least two snapshots to compare changes over time</div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">Snapshot Comparison</h3>
        <div className="text-sm text-gray-600">Compare storage metrics across snapshots</div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <select
          value={leftId || ''}
          onChange={(e) => setLeftId(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-md"
        >
          {snapshots.map(s => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
        <select
          value={rightId || ''}
          onChange={(e) => setRightId(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-md"
        >
          {snapshots.map(s => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
      </div>

      {comparison && (
        <div className="space-y-4">
          <div className="bg-gray-50 rounded-lg p-4 text-sm">
            <div className="flex justify-between">
              <span>Fragmentation Trend:</span>
              <span className="font-medium">{comparison.fragmentationTrend.toUpperCase()}</span>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Metric</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Delta</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {Object.entries(comparison.metricChanges).map(([key, value]) => (
                  <tr key={key}>
                    <td className="px-4 py-2 text-sm">{key}</td>
                    <td className="px-4 py-2 text-sm font-mono">
                      {value > 0 ? '+' : ''}{Number(value).toFixed(3)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="text-sm font-medium text-blue-900 mb-2">Recommendations</h4>
            <ul className="text-sm text-blue-700 space-y-1">
              {comparison.recommendations.map((rec, idx) => (
                <li key={idx}>{rec}</li>
              ))}
            </ul>
            <button
              onClick={() => addComparison(comparison)}
              className="mt-3 px-3 py-1 text-xs rounded-md bg-blue-600 text-white"
            >
              Save Comparison
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
