'use client'

import { useState } from 'react'
import FileImport from '@/components/FileImport'
import StorageVisualization from '@/components/StorageVisualization'
import MetricsPanel from '@/components/MetricsPanel'
import { useStorageStore } from '@/store/storageStore'

export default function Home() {
  const [isFileLoaded, setIsFileLoaded] = useState(false)
  const { currentSnapshot, snapshots } = useStorageStore()

  const handleFileLoad = (success: boolean) => {
    setIsFileLoaded(success)
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <header className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Database Storage Explorer
          </h1>
          <p className="text-lg text-gray-600">
            Analyze physical storage internals from database dumps
          </p>
        </header>

        {!isFileLoaded ? (
          <div className="max-w-2xl mx-auto">
            <FileImport onFileLoad={handleFileLoad} />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <div className="lg:col-span-3">
              <StorageVisualization />
            </div>
            <div className="lg:col-span-1">
              <MetricsPanel />
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
