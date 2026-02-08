'use client'

import { useState } from 'react'
import { useStorageStore } from '@/store/storageStore'
import { simulateOperation } from '@/utils/simulateOperation'

const OPS = ['insert', 'update', 'delete', 'vacuum', 'compact'] as const

export default function StorageSimulationPanel() {
  const { currentSnapshot, addSnapshot } = useStorageStore()
  const [op, setOp] = useState<typeof OPS[number]>('insert')

  if (!currentSnapshot) {
    return (
      <div className="p-6 text-center text-gray-500">
        <div className="text-lg font-medium">No snapshot loaded</div>
        <div className="text-sm">Import a snapshot to simulate storage operations</div>
      </div>
    )
  }

  const handleSimulate = () => {
    const next = simulateOperation(currentSnapshot, op)
    addSnapshot(next)
  }

  return (
    <div className="p-6 space-y-4">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">Storage Operation Simulation</h3>
        <div className="text-sm text-gray-600">Simulate operations on the current snapshot</div>
      </div>

      <div className="flex items-center space-x-3">
        <select
          value={op}
          onChange={(e) => setOp(e.target.value as typeof OPS[number])}
          className="px-3 py-2 border border-gray-300 rounded-md"
        >
          {OPS.map(o => (
            <option key={o} value={o}>{o}</option>
          ))}
        </select>
        <button
          onClick={handleSimulate}
          className="px-3 py-2 bg-blue-600 text-white rounded-md"
        >
          Simulate
        </button>
      </div>

      <div className="text-xs text-gray-500">
        Simulation creates a new snapshot with updated page data and metrics.
      </div>
    </div>
  )
}
