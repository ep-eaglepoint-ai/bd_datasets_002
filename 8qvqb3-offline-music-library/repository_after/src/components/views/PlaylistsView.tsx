'use client'

import { useState } from 'react'
import { useMusicStore } from '@/lib/store/music-store'
import { playlistService } from '@/lib/services/playlist-service'
import { EmptyState } from '@/components/ui/EmptyState'
import { PlaylistCard } from '@/components/ui/PlaylistCard'
import { CreatePlaylistModal } from '@/components/modals/CreatePlaylistModal'
import { ListMusic, Plus, Tag, RefreshCw } from 'lucide-react'

export function PlaylistsView() {
  const { playlists, selectedPlaylistId, setSelectedPlaylist, syncTagBasedPlaylists } = useMusicStore()
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [filter, setFilter] = useState<'all' | 'manual' | 'tag-based'>('all')
  const [isSyncing, setIsSyncing] = useState(false)

  const handleSyncTagPlaylists = async () => {
    setIsSyncing(true)
    try {
      await syncTagBasedPlaylists()
    } finally {
      setIsSyncing(false)
    }
  }

  // Filter playlists based on type
  const filteredPlaylists = playlists.filter(playlist => {
    if (filter === 'manual') {
      return playlist.type === 'manual' || !playlistService.isTagBasedPlaylist(playlist)
    }
    if (filter === 'tag-based') {
      return playlistService.isTagBasedPlaylist(playlist)
    }
    return true // 'all'
  })

  // Separate manual and tag-based playlists for display
  const manualPlaylists = filteredPlaylists.filter(p => 
    p.type === 'manual' || !playlistService.isTagBasedPlaylist(p)
  )
  const tagBasedPlaylists = filteredPlaylists.filter(p => 
    playlistService.isTagBasedPlaylist(p)
  )

  if (playlists.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <EmptyState
          icon={ListMusic}
          title="No playlists yet"
          description="Create your first playlist or add tags to tracks to generate automatic playlists"
          actionLabel="Create Playlist"
          onAction={() => setShowCreateModal(true)}
        />
        <CreatePlaylistModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
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
            <h1 className="text-2xl font-bold text-white">Playlists</h1>
            <p className="text-gray-400">
              {playlists.length} playlists 
              ({manualPlaylists.length} manual, {tagBasedPlaylists.length} tag-based)
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={handleSyncTagPlaylists}
              disabled={isSyncing}
              className="flex items-center gap-2 px-3 py-2 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-600 rounded-lg text-gray-300 text-sm font-medium transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
              {isSyncing ? 'Syncing...' : 'Sync Tags'}
            </button>
            
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white font-medium transition-colors"
            >
              <Plus className="w-4 h-4" />
              Create Playlist
            </button>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-1 bg-gray-800 rounded-lg p-1">
          {[
            { key: 'all', label: 'All', count: playlists.length },
            { key: 'manual', label: 'Manual', count: manualPlaylists.length },
            { key: 'tag-based', label: 'Tag-Based', count: tagBasedPlaylists.length },
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
      <div className="flex-1 p-6">
        {filteredPlaylists.length === 0 ? (
          <div className="flex-1 flex items-center justify-center">
            <EmptyState
              icon={filter === 'tag-based' ? Tag : ListMusic}
              title={
                filter === 'manual' 
                  ? "No manual playlists" 
                  : filter === 'tag-based'
                  ? "No tag-based playlists"
                  : "No playlists found"
              }
              description={
                filter === 'manual'
                  ? "Create a manual playlist to organize your music"
                  : filter === 'tag-based'
                  ? "Add tags to your tracks to automatically generate playlists"
                  : "Switch tabs to see other playlists"
              }
              actionLabel={filter === 'manual' ? "Create Playlist" : undefined}
              onAction={filter === 'manual' ? () => setShowCreateModal(true) : undefined}
            />
          </div>
        ) : (
          <div className="space-y-8">
            {/* Manual Playlists */}
            {(filter === 'all' || filter === 'manual') && manualPlaylists.length > 0 && (
              <div>
                {filter === 'all' && (
                  <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <ListMusic className="w-5 h-5" />
                    Manual Playlists
                  </h2>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {manualPlaylists.map((playlist) => (
                    <PlaylistCard
                      key={playlist.id}
                      playlist={playlist}
                      isSelected={selectedPlaylistId === playlist.id}
                      onClick={() => setSelectedPlaylist(playlist.id)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Tag-Based Playlists */}
            {(filter === 'all' || filter === 'tag-based') && tagBasedPlaylists.length > 0 && (
              <div>
                {filter === 'all' && (
                  <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <Tag className="w-5 h-5" />
                    Tag-Based Playlists
                  </h2>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {tagBasedPlaylists.map((playlist) => (
                    <PlaylistCard
                      key={playlist.id}
                      playlist={playlist}
                      isSelected={selectedPlaylistId === playlist.id}
                      onClick={() => setSelectedPlaylist(playlist.id)}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <CreatePlaylistModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
      />
    </div>
  )
}