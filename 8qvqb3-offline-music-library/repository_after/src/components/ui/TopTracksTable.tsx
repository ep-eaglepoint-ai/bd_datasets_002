'use client'

import { TrackMetadata } from '@/lib/types/music'
import { formatDuration, formatPlayCount, formatRating, formatRelativeDate } from '@/lib/utils/format'

interface TopTracksTableProps {
  tracks: TrackMetadata[]
  metric: 'playCount' | 'rating' | 'lastPlayed'
}

export function TopTracksTable({ tracks, metric }: TopTracksTableProps) {
  const formatMetricValue = (track: TrackMetadata) => {
    switch (metric) {
      case 'playCount':
        return formatPlayCount(track.playCount)
      case 'rating':
        return formatRating(track.rating)
      case 'lastPlayed':
        return track.lastPlayed ? formatRelativeDate(track.lastPlayed) : 'Never'
      default:
        return ''
    }
  }

  if (tracks.length === 0) {
    return (
      <div className="text-center py-8 text-gray-400">
        No tracks available
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {tracks.slice(0, 10).map((track, index) => (
        <div key={track.id} className="flex items-center gap-3 p-2 hover:bg-gray-700 rounded-lg transition-colors">
          <div className="w-6 text-center text-gray-400 text-sm font-medium">
            {index + 1}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-white text-sm font-medium truncate">
              {track.title}
            </div>
            <div className="text-gray-400 text-xs truncate">
              {track.artist}
            </div>
          </div>
          <div className="text-gray-400 text-xs">
            {formatMetricValue(track)}
          </div>
        </div>
      ))}
    </div>
  )
}