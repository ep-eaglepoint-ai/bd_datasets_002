'use client'

import { useState, useEffect } from 'react'
import { useMusicStore } from '@/lib/store/music-store'
import { duplicateDetectionService } from '@/lib/services/duplicate-detection-service'
import { DuplicateGroupCard } from '@/components/ui/DuplicateGroupCard'
import { EmptyState } from '@/components/ui/EmptyState'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { Copy, Search, RefreshCw } from 'lucide-react'

export function DuplicatesView() {
  const { 
    tracks, 
    duplicateGroups, 
    detectDuplicates, 
    resolveDuplicateGroup 
  } = useMusicStore()
  
  const [isScanning, setIsScanning] = useState(false)
  const [filter, setFilter] = useState<'all' | 'unresolved' | 'resolved'>('unresolved')

  const filteredGroups = duplicateGroups.filter(group => {
    if (!group) return false
    if (filter === 'unresolved') return !group.resolved
    if (filter === 'resolved') return group.resolved
    return true
  })

  const handleScanForDuplicates = async () => {
    setIsScanning(true)
    try {
      await detectDuplicates()
    } finally {
      setIsScanning(false)
    }
  }

  const handleResolveGroup = async (groupId: string, preferredTrackId: string) => {
    await resolveDuplicateGroup(groupId, preferredTrackId)
  }

  if (tracks.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <EmptyState
          icon={Copy}
          title="No music to scan"
          description="Import music files first to detect duplicates"
        />
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-white">Duplicate Detection</h1>
            <p className="text-gray-400">
              {duplicateGroups.length} duplicate groups found
            </p>
          </div>
          
          <button
            onClick={handleScanForDuplicates}
            disabled={isScanning}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 rounded-lg text-white font-medium transition-colors"
          >
            {isScanning ? (
              <LoadingSpinner className="w-4 h-4" />
            ) : (
              <Search className="w-4 h-4" />
            )}
            {isScanning ? 'Scanning...' : 'Scan for Duplicates'}
          </button>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-1 bg-gray-800 rounded-lg p-1">
          {[
            { key: 'unresolved', label: 'Unresolved', count: duplicateGroups.filter(g => g && !g.resolved).length },
            { key: 'resolved', label: 'Resolved', count: duplicateGroups.filter(g => g && g.resolved).length },
            { key: 'all', label: 'All', count: duplicateGroups.length },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key as any)}
              className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                filter === tab.key
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-300 hover:text-white hover:bg-gray-700'
              }`}
            >
              {tab.label} ({tab.count})
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {isScanning ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <LoadingSpinner className="w-8 h-8 mx-auto mb-4" />
              <p className="text-gray-400">Scanning for duplicates...</p>
            </div>
          </div>
        ) : filteredGroups.length === 0 ? (
          <div className="flex-1 flex items-center justify-center">
            <EmptyState
              icon={Copy}
              title={
                filter === 'unresolved' 
                  ? "No unresolved duplicates" 
                  : filter === 'resolved'
                  ? "No resolved duplicates"
                  : "No duplicates found"
              }
              description={
                duplicateGroups.length === 0
                  ? "Your library looks clean! No duplicate tracks detected."
                  : "Switch tabs to see other duplicate groups."
              }
              actionLabel={duplicateGroups.length === 0 ? "Scan Again" : undefined}
              onAction={duplicateGroups.length === 0 ? handleScanForDuplicates : undefined}
            />
          </div>
        ) : (
          <div className="p-6 space-y-6">
            {filteredGroups.map((group) => {
              if (!group || !group.trackIds) return null
              
              const groupTracks = tracks.filter(t => t && group.trackIds.includes(t.id))
              if (groupTracks.length === 0) return null
              
              return (
                <DuplicateGroupCard
                  key={group.id}
                  group={group}
                  tracks={groupTracks}
                  onResolve={(preferredTrackId) => handleResolveGroup(group.id, preferredTrackId)}
                />
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}