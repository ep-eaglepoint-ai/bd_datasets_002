'use client'

import { useState } from 'react'
import { useMusicStore } from '@/lib/store/music-store'
import { analyticsService } from '@/lib/services/analytics-service'
import { Settings, Download, Trash2, RefreshCw, Database } from 'lucide-react'

export function SettingsView() {
  const { tracks, listeningEvents, refreshStats } = useMusicStore()
  const [isExporting, setIsExporting] = useState(false)

  const handleExportData = async () => {
    setIsExporting(true)
    try {
      const analyticsData = analyticsService.exportAnalyticsData(tracks, listeningEvents)
      
      const dataToExport = {
        exportDate: new Date().toISOString(),
        tracks: tracks.length,
        listeningEvents: listeningEvents.length,
        analytics: analyticsData,
      }
      
      const blob = new Blob([JSON.stringify(dataToExport, null, 2)], {
        type: 'application/json'
      })
      
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `music-library-export-${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } finally {
      setIsExporting(false)
    }
  }

  const handleClearData = async () => {
    if (confirm('Are you sure you want to clear all data? This cannot be undone.')) {
      // TODO: Implement clear data functionality
      console.log('Clear data requested')
    }
  }

  return (
    <div className="flex-1 overflow-auto">
      <div className="p-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white mb-2">Settings</h1>
          <p className="text-gray-400">Manage your music library and application preferences</p>
        </div>

        {/* Settings Sections */}
        <div className="space-y-8">
          {/* Library Management */}
          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Database className="w-5 h-5" />
              Library Management
            </h2>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-white font-medium">Refresh Library Stats</h3>
                  <p className="text-gray-400 text-sm">Recalculate library statistics and analytics</p>
                </div>
                <button
                  onClick={refreshStats}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white font-medium transition-colors"
                >
                  <RefreshCw className="w-4 h-4" />
                  Refresh
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-white font-medium">Export Library Data</h3>
                  <p className="text-gray-400 text-sm">Download your library metadata and analytics</p>
                </div>
                <button
                  onClick={handleExportData}
                  disabled={isExporting}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 rounded-lg text-white font-medium transition-colors"
                >
                  <Download className="w-4 h-4" />
                  {isExporting ? 'Exporting...' : 'Export'}
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-white font-medium">Clear All Data</h3>
                  <p className="text-gray-400 text-sm">Remove all tracks, playlists, and listening history</p>
                </div>
                <button
                  onClick={handleClearData}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-white font-medium transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  Clear Data
                </button>
              </div>
            </div>
          </div>

          {/* Import Settings */}
          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Import Settings</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-white font-medium mb-2">
                  Supported File Formats
                </label>
                <div className="text-gray-400 text-sm">
                  MP3, FLAC, WAV, M4A, AAC, OGG, WMA
                </div>
              </div>

              <div>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    defaultChecked
                    className="rounded border-gray-600 bg-gray-700 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-white">Auto-detect duplicates during import</span>
                </label>
              </div>

              <div>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    defaultChecked
                    className="rounded border-gray-600 bg-gray-700 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-white">Extract metadata from file tags</span>
                </label>
              </div>

              <div>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    className="rounded border-gray-600 bg-gray-700 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-white">Use folder structure for metadata</span>
                </label>
              </div>
            </div>
          </div>

          {/* Performance Settings */}
          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Performance</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-white font-medium mb-2">
                  Virtual List Item Height
                </label>
                <select className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white">
                  <option value="compact">Compact (48px)</option>
                  <option value="normal" selected>Normal (64px)</option>
                  <option value="comfortable">Comfortable (80px)</option>
                </select>
              </div>

              <div>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    defaultChecked
                    className="rounded border-gray-600 bg-gray-700 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-white">Enable virtualized scrolling</span>
                </label>
              </div>

              <div>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    defaultChecked
                    className="rounded border-gray-600 bg-gray-700 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-white">Use Web Workers for background processing</span>
                </label>
              </div>
            </div>
          </div>

          {/* About */}
          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-white mb-4">About</h2>
            
            <div className="space-y-2 text-gray-400">
              <p><strong className="text-white">Music Library Intelligence</strong></p>
              <p>Version 1.0.0</p>
              <p>A fully offline music library management application</p>
              <p>Built with Next.js, TailwindCSS, and Zustand</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}