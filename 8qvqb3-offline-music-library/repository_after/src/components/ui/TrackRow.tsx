'use client'

import { useState } from 'react'
import { TrackMetadata } from '@/lib/types/music'
import { 
  formatDuration, 
  formatRating, 
  formatBitrate,
  formatTrackNumber,
  formatFileFormat
} from '@/lib/utils/format'
import { Trash2, Edit, MoreHorizontal, ListPlus } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

interface TrackRowProps {
  track: TrackMetadata
  index: number
  isSelected?: boolean
  onSelect?: (isSelected: boolean) => void
  onDelete?: (trackId: string) => void
  onEdit?: (trackId: string) => void
  onAddToPlaylist?: (trackId: string) => void
  context?: 'library' | 'playlist'
}

export function TrackRow({ 
  track, 
  index, 
  isSelected = false,
  onSelect,
  onDelete,
  onEdit,
  onAddToPlaylist,
  context = 'library'
}: TrackRowProps) {
  const [showActionsMenu, setShowActionsMenu] = useState(false)

  const handleDelete = () => {
    if (confirm(`Are you sure you want to delete "${track.title}" from your library? This cannot be undone.`)) {
      onDelete?.(track.id)
    }
    setShowActionsMenu(false)
  }

  const handleEdit = () => {
    onEdit?.(track.id)
    setShowActionsMenu(false)
  }

  const handleAddToPlaylist = () => {
    onAddToPlaylist?.(track.id)
    setShowActionsMenu(false)
  }

  return (
    <div
      className={cn(
        'flex items-center px-6 py-3 hover:bg-gray-800 transition-colors group',
        isSelected && 'bg-gray-800',
        index % 2 === 0 && 'bg-gray-900/50'
      )}
    >
      {/* Selection checkbox */}
      {onSelect && (
        <input
          type="checkbox"
          checked={isSelected}
          onChange={(e) => onSelect(e.target.checked)}
          className="mr-4 rounded border-gray-600 bg-gray-700 text-blue-600 focus:ring-blue-500"
        />
      )}
      
      <div className="flex-1 grid grid-cols-24 gap-2 items-center text-sm">
        {/* Title */}
        <div className="col-span-4 flex items-center gap-3 min-w-0">
          <div className="min-w-0">
            <div className="text-white font-medium truncate" title={track.title}>
              {track.title}
            </div>
            {/* Show custom tags if any */}
            {track.customTags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1">
                {track.customTags.slice(0, 2).map((tag, idx) => (
                  <span
                    key={idx}
                    className="inline-block px-1 py-0.5 bg-blue-600 text-xs text-white rounded"
                    title={track.customTags.join(', ')}
                  >
                    {tag}
                  </span>
                ))}
                {track.customTags.length > 2 && (
                  <span className="text-xs text-gray-400">
                    +{track.customTags.length - 2}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Artist */}
        <div className="col-span-3 text-gray-300 truncate" title={track.artist}>
          {track.artist}
        </div>

        {/* Album */}
        <div className="col-span-3 text-gray-300 truncate" title={track.album}>
          {track.album}
        </div>

        {/* Genre */}
        <div className="col-span-2 text-gray-400 truncate" title={track.genre || 'Unknown'}>
          {track.genre || 'Unknown'}
        </div>

        {/* Year */}
        <div className="col-span-1 text-gray-400 text-center">
          {track.year || '—'}
        </div>

        {/* Track Number */}
        <div className="col-span-1 text-gray-400 text-center">
          {formatTrackNumber(track.trackNumber)}
        </div>

        {/* Disc Number */}
        <div className="col-span-1 text-gray-400 text-center">
          {track.discNumber || '—'}
        </div>

        {/* Duration */}
        <div className="col-span-2 text-gray-400">
          {formatDuration(track.duration)}
        </div>

        {/* Bitrate */}
        <div className="col-span-2 text-gray-400">
          {formatBitrate(track.bitrate)}
        </div>

        {/* File Format */}
        <div className="col-span-1 text-gray-400 text-center">
          {formatFileFormat(track.fileFormat)}
        </div>

        {/* Play Count */}
        <div className="col-span-1 text-gray-400 text-center">
          {track.playCount}
        </div>

        {/* Rating */}
        <div className="col-span-2 text-gray-400">
          {formatRating(track.rating)}
          {track.mood && (
            <div className="text-xs text-blue-400 truncate" title={track.mood}>
              {track.mood}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="col-span-1 flex justify-center relative">
          <button 
            onClick={() => setShowActionsMenu(!showActionsMenu)}
            className="p-2 text-gray-400 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>

          {/* Actions Dropdown Menu */}
          {showActionsMenu && (
            <div className="absolute right-0 top-full mt-1 w-48 bg-gray-800 border border-gray-600 rounded-lg shadow-lg z-10">
              <div className="py-1">
                {/* Edit Track */}
                {onEdit && (
                  <button
                    onClick={handleEdit}
                    className="w-full px-4 py-2 text-left text-gray-300 hover:bg-gray-700 hover:text-white flex items-center gap-2"
                  >
                    <Edit className="w-4 h-4" />
                    Edit Metadata
                  </button>
                )}

                {/* Add to Playlist */}
                {context === 'library' && onAddToPlaylist && (
                  <button
                    onClick={handleAddToPlaylist}
                    className="w-full px-4 py-2 text-left text-gray-300 hover:bg-gray-700 hover:text-white flex items-center gap-2"
                  >
                    <ListPlus className="w-4 h-4" />
                    Add to Playlist
                  </button>
                )}

                {/* Separator */}
                {onDelete && (onEdit || (context === 'library' && onAddToPlaylist)) && (
                  <div className="border-t border-gray-600 my-1"></div>
                )}

                {/* Delete from Library */}
                {onDelete && (
                  <button
                    onClick={handleDelete}
                    className="w-full px-4 py-2 text-left text-red-400 hover:bg-gray-700 hover:text-red-300 flex items-center gap-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete from Library
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Click outside to close menu */}
      {showActionsMenu && (
        <div 
          className="fixed inset-0 z-5" 
          onClick={() => setShowActionsMenu(false)}
        />
      )}
    </div>
  )
}