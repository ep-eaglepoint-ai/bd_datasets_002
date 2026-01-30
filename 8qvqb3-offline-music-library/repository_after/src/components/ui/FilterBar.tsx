'use client'

import { useState } from 'react'
import { TrackMetadata, ViewState } from '@/lib/types/music'
import { searchService } from '@/lib/services/search-service'
import { tagService } from '@/lib/services/tag-service'
import { Filter, X } from 'lucide-react'

interface FilterBarProps {
  tracks: TrackMetadata[]
  filters: ViewState['filters']
  onFiltersChange: (filters: Partial<ViewState['filters']>) => void
}

export function FilterBar({ tracks, filters, onFiltersChange }: FilterBarProps) {
  const [showFilters, setShowFilters] = useState(false)

  const genres = searchService.getUniqueValues('genre')
  const artists = searchService.getUniqueValues('artist')
  const albums = searchService.getUniqueValues('album')
  const years = Array.from(new Set(tracks.map(t => t.year).filter(Boolean))).sort((a, b) => b! - a!)
  const fileFormats = Array.from(new Set(tracks.map(t => t.fileFormat).filter(Boolean))).sort()
  const allTags = tagService.getAllTags(tracks)
  const allMoods = tagService.getAllMoods(tracks)

  const activeFiltersCount = Object.values(filters).filter(Boolean).length

  const clearFilters = () => {
    onFiltersChange({
      genre: undefined,
      artist: undefined,
      album: undefined,
      year: undefined,
      rating: undefined,
      fileFormat: undefined,
      customTag: undefined,
      mood: undefined,
    })
  }

  return (
    <div className="relative">
      <button
        onClick={() => setShowFilters(!showFilters)}
        className="flex items-center gap-2 px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white hover:bg-gray-700 transition-colors"
      >
        <Filter className="w-4 h-4" />
        Filters
        {activeFiltersCount > 0 && (
          <span className="bg-blue-600 text-white text-xs px-2 py-1 rounded-full">
            {activeFiltersCount}
          </span>
        )}
      </button>

      {showFilters && (
        <div className="absolute top-full right-0 mt-2 w-80 bg-gray-800 border border-gray-600 rounded-lg shadow-lg z-10">
          <div className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-medium">Filters</h3>
              {activeFiltersCount > 0 && (
                <button
                  onClick={clearFilters}
                  className="text-blue-400 hover:text-blue-300 text-sm"
                >
                  Clear all
                </button>
              )}
            </div>

            <div className="space-y-4">
              {/* Genre Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Genre
                </label>
                <select
                  value={filters.genre || ''}
                  onChange={(e) => onFiltersChange({ genre: e.target.value || undefined })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                >
                  <option value="">All genres</option>
                  {genres.map(genre => (
                    <option key={genre} value={genre}>{genre}</option>
                  ))}
                </select>
              </div>

              {/* Artist Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Artist
                </label>
                <select
                  value={filters.artist || ''}
                  onChange={(e) => onFiltersChange({ artist: e.target.value || undefined })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                >
                  <option value="">All artists</option>
                  {artists.slice(0, 50).map(artist => (
                    <option key={artist} value={artist}>{artist}</option>
                  ))}
                </select>
              </div>

              {/* Year Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Year
                </label>
                <select
                  value={filters.year || ''}
                  onChange={(e) => onFiltersChange({ year: e.target.value ? parseInt(e.target.value) : undefined })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                >
                  <option value="">All years</option>
                  {years.map(year => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              </div>

              {/* File Format Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  File Format
                </label>
                <select
                  value={filters.fileFormat || ''}
                  onChange={(e) => onFiltersChange({ fileFormat: e.target.value || undefined })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                >
                  <option value="">All formats</option>
                  {fileFormats.map(format => (
                    <option key={format} value={format}>{format.toUpperCase()}</option>
                  ))}
                </select>
              </div>

              {/* Rating Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Rating
                </label>
                <select
                  value={filters.rating || ''}
                  onChange={(e) => onFiltersChange({ rating: e.target.value ? parseInt(e.target.value) : undefined })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                >
                  <option value="">All ratings</option>
                  <option value="5">★★★★★ (5 stars)</option>
                  <option value="4">★★★★☆ (4+ stars)</option>
                  <option value="3">★★★☆☆ (3+ stars)</option>
                  <option value="2">★★☆☆☆ (2+ stars)</option>
                  <option value="1">★☆☆☆☆ (1+ stars)</option>
                </select>
              </div>

              {/* Custom Tag Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Tag
                </label>
                <select
                  value={filters.customTag || ''}
                  onChange={(e) => onFiltersChange({ customTag: e.target.value || undefined })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                >
                  <option value="">All tags</option>
                  {allTags.slice(0, 20).map(({ tag, count }) => (
                    <option key={tag} value={tag}>{tag} ({count})</option>
                  ))}
                </select>
              </div>

              {/* Mood Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Mood
                </label>
                <select
                  value={filters.mood || ''}
                  onChange={(e) => onFiltersChange({ mood: e.target.value || undefined })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                >
                  <option value="">All moods</option>
                  {allMoods.slice(0, 15).map(({ mood, count }) => (
                    <option key={mood} value={mood}>{mood} ({count})</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}