'use client'

import { TrackMetadata } from '@/lib/types/music'
import { formatDuration, formatRating, formatFileFormat, formatBitrate } from '@/lib/utils/format'
import { Play, Music } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

interface TrackCardProps {
  track: TrackMetadata
  isSelected: boolean
  onSelect: (isSelected: boolean) => void
}

export function TrackCard({ track, isSelected, onSelect }: TrackCardProps) {
  const handlePlay = () => {
    // TODO: Implement play functionality
    console.log('Play track:', track.title)
  }

  return (
    <div
      className={cn(
        'bg-gray-800 rounded-lg p-4 hover:bg-gray-700 transition-colors group cursor-pointer',
        isSelected && 'ring-2 ring-blue-500'
      )}
    >
      {/* Album Art Placeholder */}
      <div className="aspect-square bg-gray-700 rounded-lg mb-3 flex items-center justify-center relative overflow-hidden">
        <Music className="w-12 h-12 text-gray-500" />
        
        {/* Play Button Overlay */}
        <button
          onClick={handlePlay}
          className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <div className="w-12 h-12 bg-blue-600 hover:bg-blue-700 rounded-full flex items-center justify-center">
            <Play className="w-6 h-6 text-white ml-0.5" />
          </div>
        </button>

        {/* Selection Checkbox */}
        <input
          type="checkbox"
          checked={isSelected}
          onChange={(e) => onSelect(e.target.checked)}
          className="absolute top-2 right-2 rounded border-gray-600 bg-gray-700 text-blue-600 focus:ring-blue-500"
        />
      </div>

      {/* Track Info */}
      <div className="space-y-1">
        <h3 className="text-white font-medium truncate" title={track.title}>
          {track.title}
        </h3>
        <p className="text-gray-400 text-sm truncate" title={track.artist}>
          {track.artist}
        </p>
        <p className="text-gray-500 text-xs truncate" title={track.album}>
          {track.album}
        </p>
        
        <div className="flex items-center justify-between pt-1 text-xs text-gray-500">
          <span>{track.genre || 'Unknown'}</span>
          <span>{track.year || '—'}</span>
        </div>
        
        <div className="flex items-center justify-between pt-1">
          <span className="text-gray-500 text-xs">
            {formatDuration(track.duration)} • {formatFileFormat(track.fileFormat)}
          </span>
          {track.rating && (
            <span className="text-gray-500 text-xs">
              {formatRating(track.rating)}
            </span>
          )}
        </div>
        
        {track.bitrate && (
          <div className="text-gray-500 text-xs">
            {formatBitrate(track.bitrate)}
          </div>
        )}
      </div>
    </div>
  )
}