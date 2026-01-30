'use client'

import { useState, useMemo } from 'react'
import { useMusicStore } from '@/lib/store/music-store'
import { SearchBar } from '@/components/ui/SearchBar'
import { FilterBar } from '@/components/ui/FilterBar'
import { TrackList } from '@/components/ui/TrackList'
import { ViewControls } from '@/components/ui/ViewControls'
import { EmptyState } from '@/components/ui/EmptyState'
import { EditTrackModal } from '@/components/modals/EditTrackModal'
import { TagManagementModal } from '@/components/modals/TagManagementModal'
import { AddToPlaylistModal } from '@/components/modals/AddToPlaylistModal'
import { Music, Edit, Tags } from 'lucide-react'

export function LibraryView() {
  const { 
    tracks, 
    viewState, 
    searchTracks, 
    setFilters, 
    setSorting,
    setSelectedTracks,
    deleteTrack
  } = useMusicStore()
  
  const [searchQuery, setSearchQuery] = useState('')
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list')
  const [showSelection, setShowSelection] = useState(false)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [editingTrack, setEditingTrack] = useState<string | null>(null)
  const [bulkEditTracks, setBulkEditTracks] = useState<string[]>([])
  const [tagManagementOpen, setTagManagementOpen] = useState(false)
  const [addToPlaylistOpen, setAddToPlaylistOpen] = useState(false)
  const [tracksToAddToPlaylist, setTracksToAddToPlaylist] = useState<string[]>([])

  const handleDeleteTrack = async (trackId: string) => {
    try {
      await deleteTrack(trackId)
    } catch (error) {
      console.error('Failed to delete track:', error)
      // TODO: Show error toast
    }
  }

  const handleEditTrack = (trackId: string) => {
    setEditingTrack(trackId)
    setEditModalOpen(true)
  }

  const handleBulkEdit = (trackIds: string[]) => {
    setBulkEditTracks(trackIds)
    setEditModalOpen(true)
  }

  const handleCloseEditModal = () => {
    setEditModalOpen(false)
    setEditingTrack(null)
    setBulkEditTracks([])
  }

  const handleAddToPlaylist = (trackId: string) => {
    setTracksToAddToPlaylist([trackId])
    setAddToPlaylistOpen(true)
  }

  const handleBulkAddToPlaylist = (trackIds: string[]) => {
    setTracksToAddToPlaylist(trackIds)
    setAddToPlaylistOpen(true)
  }

  const handleCloseAddToPlaylistModal = () => {
    setAddToPlaylistOpen(false)
    setTracksToAddToPlaylist([])
  }

  const toggleSelection = () => {
    setShowSelection(!showSelection)
    if (showSelection) {
      setSelectedTracks([])
    }
  }

  // Filter and search tracks
  const filteredTracks = useMemo(() => {
    let result = tracks

    // Apply search
    if (searchQuery.trim()) {
      result = searchTracks(searchQuery)
    }

    // Apply filters
    if (viewState.filters.genre) {
      result = result.filter(track => track.genre === viewState.filters.genre)
    }
    if (viewState.filters.artist) {
      result = result.filter(track => track.artist === viewState.filters.artist)
    }
    if (viewState.filters.album) {
      result = result.filter(track => track.album === viewState.filters.album)
    }
    if (viewState.filters.year) {
      result = result.filter(track => track.year === viewState.filters.year)
    }
    if (viewState.filters.rating) {
      result = result.filter(track => track.rating && track.rating >= viewState.filters.rating!)
    }
    if (viewState.filters.fileFormat) {
      result = result.filter(track => track.fileFormat === viewState.filters.fileFormat)
    }
    if (viewState.filters.customTag) {
      result = result.filter(track => track.customTags.includes(viewState.filters.customTag!))
    }
    if (viewState.filters.mood) {
      result = result.filter(track => track.mood === viewState.filters.mood)
    }

    // Apply sorting
    result = [...result].sort((a, b) => {
      const aValue = a[viewState.sortBy]
      const bValue = b[viewState.sortBy]
      
      if (aValue === undefined && bValue === undefined) return 0
      if (aValue === undefined) return 1
      if (bValue === undefined) return -1
      
      let comparison = 0
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        comparison = aValue.localeCompare(bValue)
      } else if (typeof aValue === 'number' && typeof bValue === 'number') {
        comparison = aValue - bValue
      } else if (aValue instanceof Date && bValue instanceof Date) {
        comparison = aValue.getTime() - bValue.getTime()
      }
      
      return viewState.sortOrder === 'asc' ? comparison : -comparison
    })

    return result
  }, [tracks, searchQuery, viewState, searchTracks])

  if (tracks.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <EmptyState
          icon={Music}
          title="No music in your library"
          description="Import your music files to get started"
          actionLabel="Import Music"
          onAction={() => {
            // TODO: Open import modal
          }}
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
            <h1 className="text-2xl font-bold text-white">Music Library</h1>
            <p className="text-gray-400">
              {filteredTracks.length} of {tracks.length} tracks
              {viewState.selectedTrackIds.length > 0 && (
                <span className="ml-2 text-blue-400">
                  • {viewState.selectedTrackIds.length} selected
                </span>
              )}
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={() => setTagManagementOpen(true)}
              className="px-3 py-2 bg-gray-700 text-gray-300 hover:bg-gray-600 rounded-md text-sm font-medium transition-colors"
            >
              <Tags className="w-4 h-4 mr-2 inline" />
              Manage Tags
            </button>
            
            <button
              onClick={toggleSelection}
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                showSelection
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              <Edit className="w-4 h-4 mr-2 inline" />
              {showSelection ? 'Exit Selection' : 'Select Tracks'}
            </button>
            
            <ViewControls
              viewMode={viewMode}
              onViewModeChange={setViewMode}
              sortBy={viewState.sortBy}
              sortOrder={viewState.sortOrder}
              onSortChange={setSorting}
            />
          </div>
        </div>

        <div className="flex gap-4">
          <div className="flex-1">
            <SearchBar
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Search tracks, artists, albums..."
            />
          </div>
          
          <FilterBar
            tracks={tracks}
            filters={viewState.filters}
            onFiltersChange={setFilters}
          />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {filteredTracks.length === 0 ? (
          <div className="flex-1 flex items-center justify-center">
            <EmptyState
              icon={Music}
              title="No tracks found"
              description="Try adjusting your search or filters"
            />
          </div>
        ) : (
          <TrackList
            tracks={filteredTracks}
            viewMode={viewMode}
            selectedTrackIds={viewState.selectedTrackIds}
            onSelectionChange={setSelectedTracks}
            onDelete={handleDeleteTrack}
            onEdit={handleEditTrack}
            onAddToPlaylist={handleAddToPlaylist}
            onBulkEdit={handleBulkEdit}
            onBulkAddToPlaylist={handleBulkAddToPlaylist}
            showSelection={showSelection}
          />
        )}
      </div>

      {/* Edit Track Modal */}
      <EditTrackModal
        isOpen={editModalOpen}
        onClose={handleCloseEditModal}
        track={editingTrack ? tracks.find(t => t.id === editingTrack) || null : null}
        tracks={bulkEditTracks.map(id => tracks.find(t => t.id === id)!).filter(Boolean)}
        isBulkEdit={bulkEditTracks.length > 0}
      />
      {/* Tag Management Modal */}
      <TagManagementModal
        isOpen={tagManagementOpen}
        onClose={() => setTagManagementOpen(false)}
      />

      {/* Add to Playlist Modal */}
      <AddToPlaylistModal
        isOpen={addToPlaylistOpen}
        onClose={handleCloseAddToPlaylistModal}
        trackIds={tracksToAddToPlaylist}
      />
    </div>
  )
}