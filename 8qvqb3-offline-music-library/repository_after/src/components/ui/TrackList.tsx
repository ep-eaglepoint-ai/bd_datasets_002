'use client'

import { TrackMetadata } from '@/lib/types/music'
import { TrackRow } from './TrackRow'
import { TrackGrid } from './TrackGrid'

interface TrackListProps {
  tracks: TrackMetadata[]
  viewMode: 'list' | 'grid'
  selectedTrackIds?: string[]
  onSelectionChange?: (trackIds: string[]) => void
  onDelete?: (trackId: string) => void
  onEdit?: (trackId: string) => void
  onAddToPlaylist?: (trackId: string) => void
  onBulkEdit?: (trackIds: string[]) => void
  onBulkAddToPlaylist?: (trackIds: string[]) => void
  showSelection?: boolean
  context?: 'library' | 'playlist'
}

export function TrackList({
  tracks,
  viewMode,
  selectedTrackIds = [],
  onSelectionChange,
  onDelete,
  onEdit,
  onAddToPlaylist,
  onBulkEdit,
  onBulkAddToPlaylist,
  showSelection = false,
  context = 'library',
}: TrackListProps) {
  const handleTrackSelect = (trackId: string, isSelected: boolean) => {
    if (!onSelectionChange) return
    
    if (isSelected) {
      onSelectionChange([...selectedTrackIds, trackId])
    } else {
      onSelectionChange(selectedTrackIds.filter(id => id !== trackId))
    }
  }

  const handleSelectAll = () => {
    if (!onSelectionChange) return
    
    if (selectedTrackIds.length === tracks.length) {
      onSelectionChange([])
    } else {
      onSelectionChange(tracks.map(t => t.id))
    }
  }
  if (viewMode === 'grid') {
    return (
      <TrackGrid
        tracks={tracks}
        selectedTrackIds={selectedTrackIds}
        onTrackSelect={handleTrackSelect}
      />
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Bulk actions bar */}
      {showSelection && selectedTrackIds.length > 0 && (
        <div className="flex items-center justify-between px-6 py-3 bg-blue-600 text-white">
          <span className="text-sm font-medium">
            {selectedTrackIds.length} track{selectedTrackIds.length !== 1 ? 's' : ''} selected
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onBulkEdit?.(selectedTrackIds)}
              className="px-3 py-1 bg-blue-700 hover:bg-blue-800 rounded text-sm transition-colors"
            >
              Edit Selected
            </button>
            {context === 'library' && onBulkAddToPlaylist && (
              <button
                onClick={() => onBulkAddToPlaylist(selectedTrackIds)}
                className="px-3 py-1 bg-green-700 hover:bg-green-800 rounded text-sm transition-colors"
              >
                Add to Playlist
              </button>
            )}
            <button
              onClick={() => onSelectionChange?.([])}
              className="px-3 py-1 bg-blue-700 hover:bg-blue-800 rounded text-sm transition-colors"
            >
              Clear Selection
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center px-6 py-3 border-b border-gray-700 bg-gray-800">
        {showSelection && (
          <input
            type="checkbox"
            checked={selectedTrackIds.length === tracks.length && tracks.length > 0}
            onChange={handleSelectAll}
            className="mr-4 rounded border-gray-600 bg-gray-700 text-blue-600 focus:ring-blue-500"
          />
        )}
        <div className="flex-1 grid grid-cols-24 gap-2 text-xs font-medium text-gray-400 uppercase tracking-wider">
          <div className="col-span-4">Title</div>
          <div className="col-span-3">Artist</div>
          <div className="col-span-3">Album</div>
          <div className="col-span-2">Genre</div>
          <div className="col-span-1">Year</div>
          <div className="col-span-1">Track</div>
          <div className="col-span-1">Disc</div>
          <div className="col-span-2">Duration</div>
          <div className="col-span-2">Bitrate</div>
          <div className="col-span-1">Format</div>
          <div className="col-span-1">Plays</div>
          <div className="col-span-2">Rating</div>
          <div className="col-span-1">Actions</div>
        </div>
      </div>

      {/* Track List */}
      <div className="flex-1 overflow-auto">
        {tracks.map((track, index) => (
          <TrackRow
            key={track.id}
            track={track}
            index={index}
            isSelected={selectedTrackIds.includes(track.id)}
            onSelect={showSelection ? (isSelected) => handleTrackSelect(track.id, isSelected) : undefined}
            onDelete={onDelete}
            onEdit={onEdit}
            onAddToPlaylist={onAddToPlaylist}
            context={context}
          />
        ))}
      </div>
    </div>
  )
}