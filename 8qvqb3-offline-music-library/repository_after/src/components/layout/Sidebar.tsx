'use client'

import { useMusicStore } from '@/lib/store/music-store'
import { cn } from '@/lib/utils/cn'
import { 
  Music, 
  ListMusic, 
  BarChart3, 
  Copy, 
  Settings, 
  Plus,
  Search,
  Home
} from 'lucide-react'

const navigationItems = [
  { id: 'library', label: 'Library', icon: Music },
  { id: 'playlists', label: 'Playlists', icon: ListMusic },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  { id: 'duplicates', label: 'Duplicates', icon: Copy },
  { id: 'settings', label: 'Settings', icon: Settings },
] as const

export function Sidebar() {
  const { viewState, setCurrentView, toggleImportModal, playlists, libraryStats } = useMusicStore()

  return (
    <div className="w-64 bg-gray-800 border-r border-gray-700 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center gap-2 mb-4">
          <Home className="w-6 h-6 text-blue-400" />
          <h1 className="text-lg font-semibold text-white">Music Library</h1>
        </div>
        
        <button
          onClick={toggleImportModal}
          className="w-full flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          Import Music
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4">
        <div className="space-y-1">
          {navigationItems.map((item) => {
            const Icon = item.icon
            const isActive = viewState.currentView === item.id
            
            return (
              <button
                key={item.id}
                onClick={() => setCurrentView(item.id)}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-300 hover:text-white hover:bg-gray-700'
                )}
              >
                <Icon className="w-4 h-4" />
                {item.label}
              </button>
            )
          })}
        </div>

        {/* Playlists Section */}
        <div className="mt-8">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Playlists
            </h3>
            <button
              onClick={() => {
                // TODO: Open create playlist modal
              }}
              className="text-gray-400 hover:text-white"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
          
          <div className="space-y-1 max-h-48 overflow-y-auto">
            {playlists.map((playlist) => (
              <button
                key={playlist.id}
                onClick={() => {
                  setCurrentView('playlists')
                  // TODO: Select playlist
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:text-white hover:bg-gray-700 rounded-lg transition-colors text-left"
              >
                <ListMusic className="w-4 h-4 flex-shrink-0" />
                <span className="truncate">{playlist.name}</span>
                <span className="text-xs text-gray-500 ml-auto">
                  {playlist.trackIds.length}
                </span>
              </button>
            ))}
            
            {playlists.length === 0 && (
              <p className="text-xs text-gray-500 px-3 py-2">
                No playlists yet
              </p>
            )}
          </div>
        </div>
      </nav>

      {/* Library Stats */}
      {libraryStats && (
        <div className="p-4 border-t border-gray-700">
          <div className="text-xs text-gray-400 space-y-1">
            <div className="flex justify-between">
              <span>Tracks:</span>
              <span className="text-white">{libraryStats.totalTracks.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span>Artists:</span>
              <span className="text-white">{libraryStats.totalArtists.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span>Albums:</span>
              <span className="text-white">{libraryStats.totalAlbums.toLocaleString()}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}