'use client'

import { useState } from 'react'
import { DuplicateGroup, TrackMetadata } from '@/lib/types/music'
import { duplicateDetectionService } from '@/lib/services/duplicate-detection-service'
import { formatFileSize, formatBitrate, formatSimilarity } from '@/lib/utils/format'
import { Check, X, AlertTriangle } from 'lucide-react'

interface DuplicateGroupCardProps {
  group: DuplicateGroup
  tracks: TrackMetadata[]
  onResolve: (preferredTrackId: string) => void
}

export function DuplicateGroupCard({ group, tracks, onResolve }: DuplicateGroupCardProps) {
  const [selectedTrackId, setSelectedTrackId] = useState<string | null>(null)
  
  // Safety checks
  if (!group || !tracks || tracks.length === 0) {
    return null
  }
  
  const recommendation = duplicateDetectionService.getRecommendedAction(group, tracks)

  const handleResolve = () => {
    const trackId = selectedTrackId || recommendation.recommendedTrackId
    if (trackId) {
      onResolve(trackId)
    }
  }

  if (group.resolved) {
    const preferredTrack = tracks.find(t => t.id === group.preferredTrackId)
    return (
      <div className="bg-gray-800 rounded-lg p-6 border border-green-700">
        <div className="flex items-center gap-2 mb-4">
          <Check className="w-5 h-5 text-green-400" />
          <h3 className="text-white font-medium">Resolved Duplicate Group</h3>
          <span className="text-xs bg-green-900 text-green-300 px-2 py-1 rounded">
            {formatSimilarity(group.similarityScore)} similar
          </span>
        </div>
        
        {preferredTrack && (
          <div className="text-gray-300">
            <p className="font-medium">{preferredTrack.title}</p>
            <p className="text-sm text-gray-400">{preferredTrack.artist} - {preferredTrack.album}</p>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="bg-gray-800 rounded-lg p-6 border border-yellow-700">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-yellow-400" />
          <h3 className="text-white font-medium">Duplicate Group</h3>
          <span className="text-xs bg-yellow-900 text-yellow-300 px-2 py-1 rounded">
            {formatSimilarity(group.similarityScore)} similar
          </span>
          <span className="text-xs bg-gray-700 text-gray-300 px-2 py-1 rounded">
            {group.duplicateType}
          </span>
        </div>
        
        <button
          onClick={handleResolve}
          disabled={!selectedTrackId && !recommendation.recommendedTrackId}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 rounded-lg text-white text-sm font-medium transition-colors"
        >
          Resolve
        </button>
      </div>

      {/* Recommendation */}
      {recommendation.recommendedTrackId && (
        <div className="mb-4 p-3 bg-blue-900/20 border border-blue-700 rounded-lg">
          <p className="text-blue-300 text-sm">
            <strong>Recommendation:</strong> {recommendation.reason}
          </p>
        </div>
      )}

      {/* Track List */}
      <div className="space-y-3">
        {tracks.map((track) => (
          <div
            key={track.id}
            className={`p-3 border rounded-lg cursor-pointer transition-colors ${
              selectedTrackId === track.id
                ? 'border-blue-500 bg-blue-900/20'
                : recommendation.recommendedTrackId === track.id
                ? 'border-green-500 bg-green-900/20'
                : 'border-gray-600 hover:border-gray-500'
            }`}
            onClick={() => setSelectedTrackId(track.id)}
          >
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <input
                    type="radio"
                    name={`duplicate-${group.id}`}
                    checked={selectedTrackId === track.id}
                    onChange={() => setSelectedTrackId(track.id)}
                    className="text-blue-600 focus:ring-blue-500"
                  />
                  <div>
                    <p className="text-white font-medium">{track.title}</p>
                    <p className="text-gray-400 text-sm">{track.artist} - {track.album}</p>
                  </div>
                </div>
              </div>
              
              <div className="text-right text-sm text-gray-400">
                <div>{formatFileSize(track.fileSize)}</div>
                <div>{formatBitrate(track.bitrate)}</div>
                <div>{track.playCount} plays</div>
              </div>
            </div>
            
            {recommendation.recommendedTrackId === track.id && (
              <div className="mt-2 text-xs text-green-400">
                ✓ Recommended
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}