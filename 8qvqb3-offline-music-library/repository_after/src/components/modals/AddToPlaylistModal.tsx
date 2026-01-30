'use client'

import { useState } from 'react'
import { useMusicStore } from '@/lib/store/music-store'
import { playlistService } from '@/lib/services/playlist-service'
import { Playlist } from '@/lib/types/music'
import { X, Plus, ListMusic, Tag, ChevronDown } from 'lucide-react'

interface AddToPlaylistModalProps {
  isOpen: boolean
  onClose: () => void
  trackIds: string[]
}

export function AddToPlaylistModal({ isOpen, onClose, trackIds }: AddToPlaylistModalProps) {
  const { playlists, tracks, updatePlaylist, createPlaylist } = useMusicStore()
  const [showCreateNew, setShowCreateNew] = useState(false)
  const [newPlaylistName, setNewPlaylistName] = useState('')
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string>('')
  const [isAdding, setIsAdding] = useState(false)

  const trackTitles = trackIds.map(id => tracks.find(t => t.id === id)?.title).filter(Boolean)
  
  // Get only manual playlists (not tag-based)
  const manualPlaylists = playlists.filter(p => p.type === 'manual' && !playlistService.isTagBasedPlaylist(p))

  const handleAddToSelectedPlaylist = async () => {
    if (!selectedPlaylistId) return

    const playlist = playlists.find(p => p.id === selectedPlaylistId)
    if (!playlist) return

    setIsAdding(true)
    try {
      // Add tracks to playlist, avoiding duplicates
      const existingTrackIds = new Set(playlist.trackIds)
      const newTrackIds = trackIds.filter(id => !existingTrackIds.has(id))
      
      if (newTrackIds.length === 0) {
        alert('All selected tracks are already in this playlist.')
        return
      }

      const updatedPlaylist: Playlist = {
        ...playlist,
        trackIds: [...playlist.trackIds, ...newTrackIds],
        dateModified: new Date(),
      }

      await updatePlaylist(updatedPlaylist)
      onClose()
    } catch (error) {
      console.error('Failed to add tracks to playlist:', error)
      alert('Failed to add tracks to playlist. Please try again.')
    } finally {
      setIsAdding(false)
    }
  }

  const handleCreateNewPlaylist = async () => {
    if (!newPlaylistName.trim()) return

    setIsAdding(true)
    try {
      await createPlaylist({
        name: newPlaylistName.trim(),
        type: 'manual',
        rules: [],
        trackIds: [...trackIds],
        sortBy: 'dateAdded',
        sortOrder: 'desc',
      })

      setNewPlaylistName('')
      setShowCreateNew(false)
      onClose()
    } catch (error) {
      console.error('Failed to create playlist:', error)
      alert('Failed to create playlist. Please try again.')
    } finally {
      setIsAdding(false)
    }
  }

  const getPlaylistInfo = (playlistId: string) => {
    const playlist = playlists.find(p => p.id === playlistId)
    if (!playlist) return { tracksInPlaylist: 0, newTracks: trackIds.length }
    
    const tracksInPlaylist = trackIds.filter(id => playlist.trackIds.includes(id)).length
    const newTracks = trackIds.length - tracksInPlaylist
    
    return { tracksInPlaylist, newTracks }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">
            Add to Playlist
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Selected tracks info */}
        <div className="mb-6 p-3 bg-gray-700 rounded-lg">
          <p className="text-sm text-gray-300 mb-2">
            Adding {trackIds.length} track{trackIds.length !== 1 ? 's' : ''}:
          </p>
          <div className="max-h-20 overflow-y-auto">
            {trackTitles.slice(0, 3).map((title, index) => (
              <p key={index} className="text-sm text-white truncate">
                • {title}
              </p>
            ))}
            {trackTitles.length > 3 && (
              <p className="text-sm text-gray-400">
                ... and {trackTitles.length - 3} more
              </p>
            )}
          </div>
        </div>

        {/* Create new playlist option */}
        <div className="mb-4">
          {!showCreateNew ? (
            <button
              onClick={() => setShowCreateNew(true)}
              className="w-full flex items-center gap-3 p-3 bg-blue-600 hover:bg-blue-700 rounded-lg text-white transition-colors"
            >
              <Plus className="w-5 h-5" />
              <span>Create New Playlist</span>
            </button>
          ) : (
            <div className="space-y-3">
              <input
                type="text"
                value={newPlaylistName}
                onChange={(e) => setNewPlaylistName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreateNewPlaylist()}
                placeholder="Enter playlist name"
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoFocus
              />
              <div className="flex gap-2">
                <button
                  onClick={handleCreateNewPlaylist}
                  disabled={!newPlaylistName.trim() || isAdding}
                  className="flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
                >
                  {isAdding ? 'Creating...' : 'Create'}
                </button>
                <button
                  onClick={() => {
                    setShowCreateNew(false)
                    setNewPlaylistName('')
                  }}
                  disabled={isAdding}
                  className="flex-1 px-3 py-2 bg-gray-600 hover:bg-gray-700 disabled:bg-gray-500 text-white rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Existing playlists dropdown */}
        {manualPlaylists.length > 0 && (
          <div className="mb-4">
            <h3 className="text-sm font-medium text-gray-300 mb-3">
              Add to Existing Playlist
            </h3>
            
            {/* Playlist Select Dropdown */}
            <div className="relative mb-3">
              <select
                value={selectedPlaylistId}
                onChange={(e) => setSelectedPlaylistId(e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none cursor-pointer"
              >
                <option value="" className="text-gray-400">
                  Select a playlist...
                </option>
                {manualPlaylists.map((playlist) => {
                  console.log("ManualPlaylist: ", playlist);
                  const { tracksInPlaylist, newTracks } = getPlaylistInfo(playlist.id)
                  return (
                    <option key={playlist.id} value={playlist.id} className="text-white">
                      {playlist.name} ({playlist.trackIds.length} tracks)
                      {tracksInPlaylist > 0 ? ` • ${tracksInPlaylist} already added` : ''}
                    </option>
                  )
                })}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>

            {/* Selected playlist info */}
            {selectedPlaylistId && (
              <div className="mb-3 p-3 bg-gray-700/50 border border-gray-600 rounded-lg">
                {(() => {
                  const playlist = playlists.find(p => p.id === selectedPlaylistId)
                  const { tracksInPlaylist, newTracks } = getPlaylistInfo(selectedPlaylistId)
                  
                  if (!playlist) return null
                  
                  return (
                    <div className="flex items-center gap-3">
                      <ListMusic className="w-5 h-5 text-blue-400 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-medium truncate">
                          {playlist.name}
                        </p>
                        <p className="text-gray-400 text-sm">
                          {playlist.trackIds.length} tracks
                          {tracksInPlaylist > 0 && (
                            <span className="text-yellow-400">
                              {' '}• {tracksInPlaylist} already added
                            </span>
                          )}
                        </p>
                      </div>
                      {(() => {
                        const { newTracks } = getPlaylistInfo(selectedPlaylistId)
                        return newTracks > 0 && (
                          <div className="bg-blue-600 text-white text-xs px-2 py-1 rounded-full">
                            +{newTracks}
                          </div>
                        )
                      })()}
                    </div>
                  )
                })()}
              </div>
            )}

            {/* Add to selected playlist button */}
            <button
              onClick={handleAddToSelectedPlaylist}
              disabled={!selectedPlaylistId || isAdding}
              className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
            >
              {isAdding ? 'Adding...' : 'Add to Selected Playlist'}
            </button>
          </div>
        )}

        {/* Tag-based playlists info */}
        {playlists.some(p => playlistService.isTagBasedPlaylist(p)) && (
          <div className="mb-4 p-3 bg-gray-700/50 border border-gray-600 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Tag className="w-4 h-4 text-blue-400" />
              <p className="text-sm font-medium text-gray-300">Tag-Based Playlists</p>
            </div>
            <p className="text-xs text-gray-400">
              Tracks are automatically added to tag-based playlists when you assign matching tags. 
              Use the "Edit Metadata" option to add tags to tracks.
            </p>
          </div>
        )}

        {/* Empty state */}
        {manualPlaylists.length === 0 && !showCreateNew && (
          <div className="text-center py-8">
            <ListMusic className="w-12 h-12 text-gray-500 mx-auto mb-3" />
            <p className="text-gray-400 text-sm">
              No manual playlists available.
              <br />
              Create a new playlist to add tracks.
            </p>
          </div>
        )}

        {/* Close button */}
        <div className="flex justify-end pt-4 border-t border-gray-600 mt-6">
          <button
            onClick={onClose}
            disabled={isAdding}
            className="px-4 py-2 text-gray-300 hover:text-white disabled:text-gray-500 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}