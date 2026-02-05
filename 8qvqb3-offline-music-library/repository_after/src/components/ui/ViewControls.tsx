'use client'

import { TrackMetadata } from '@/lib/types/music'
import { List, Grid, ArrowUpDown } from 'lucide-react'

interface ViewControlsProps {
  viewMode: 'list' | 'grid'
  onViewModeChange: (mode: 'list' | 'grid') => void
  sortBy: keyof TrackMetadata
  sortOrder: 'asc' | 'desc'
  onSortChange: (sortBy: keyof TrackMetadata, sortOrder: 'asc' | 'desc') => void
}

const sortOptions = [
  { key: 'title', label: 'Title' },
  { key: 'artist', label: 'Artist' },
  { key: 'album', label: 'Album' },
  { key: 'genre', label: 'Genre' },
  { key: 'year', label: 'Year' },
  { key: 'trackNumber', label: 'Track Number' },
  { key: 'discNumber', label: 'Disc Number' },
  { key: 'duration', label: 'Duration' },
  { key: 'bitrate', label: 'Bitrate' },
  { key: 'fileFormat', label: 'File Format' },
  { key: 'dateAdded', label: 'Date Added' },
  { key: 'playCount', label: 'Play Count' },
  { key: 'rating', label: 'Rating' },
] as const

export function ViewControls({
  viewMode,
  onViewModeChange,
  sortBy,
  sortOrder,
  onSortChange,
}: ViewControlsProps) {
  return (
    <div className="flex items-center gap-4">
      {/* Sort Controls */}
      <div className="flex items-center gap-2">
        <select
          value={sortBy}
          onChange={(e) => onSortChange(e.target.value as keyof TrackMetadata, sortOrder)}
          className="px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white text-sm"
        >
          {sortOptions.map(option => (
            <option key={option.key} value={option.key}>
              {option.label}
            </option>
          ))}
        </select>
        
        <button
          onClick={() => onSortChange(sortBy, sortOrder === 'asc' ? 'desc' : 'asc')}
          className="p-2 bg-gray-800 border border-gray-600 rounded-lg text-white hover:bg-gray-700 transition-colors"
          title={`Sort ${sortOrder === 'asc' ? 'descending' : 'ascending'}`}
        >
          <ArrowUpDown className={`w-4 h-4 ${sortOrder === 'desc' ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {/* View Mode Toggle */}
      <div className="flex bg-gray-800 border border-gray-600 rounded-lg">
        <button
          onClick={() => onViewModeChange('list')}
          className={`p-2 rounded-l-lg transition-colors ${
            viewMode === 'list'
              ? 'bg-blue-600 text-white'
              : 'text-gray-400 hover:text-white hover:bg-gray-700'
          }`}
          title="List view"
        >
          <List className="w-4 h-4" />
        </button>
        <button
          onClick={() => onViewModeChange('grid')}
          className={`p-2 rounded-r-lg transition-colors ${
            viewMode === 'grid'
              ? 'bg-blue-600 text-white'
              : 'text-gray-400 hover:text-white hover:bg-gray-700'
          }`}
          title="Grid view"
        >
          <Grid className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}