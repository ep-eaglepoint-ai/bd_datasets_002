'use client'

import { LoadingSpinner } from './LoadingSpinner'

export function LoadingScreen() {
  return (
    <div className="h-screen bg-gray-900 flex items-center justify-center">
      <div className="text-center">
        <LoadingSpinner className="w-12 h-12 mx-auto mb-4 text-blue-500" />
        <h2 className="text-xl font-semibold text-white mb-2">Loading Music Library</h2>
        <p className="text-gray-400">Initializing your music collection...</p>
      </div>
    </div>
  )
}