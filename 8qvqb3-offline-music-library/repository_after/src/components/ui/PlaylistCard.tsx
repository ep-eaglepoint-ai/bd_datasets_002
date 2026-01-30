'use client'

import { Playlist } from '@/lib/types/music'
import { formatRelativeDate } from '@/lib/utils/format'
import { ListMusic, Music, Zap } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

interface PlaylistCardProps {
  playlist: Playlist
  isSelected: boolean
  onClick: () => void
}

export function PlaylistCard({ playlist, isSelected, onClick }: PlaylistCardProps) {
  const Icon = playlist.type === 'smart' ? Zap : ListMusic

  return (
    <div
      onClick={onClick}
      className={cn(
        'bg-gray-800 rounded-lg p-6 hover:bg-gray-700 transition-colors cursor-pointer',
        isSelected && 'ring-2 ring-blue-500'
      )}
    >
      <div className="flex items-center gap-3 mb-4">
        <div className="w-12 h-12 bg-gray-700 rounded-lg flex items-center justify-center">
          <Icon className="w-6 h-6 text-blue-400" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-white font-medium truncate">{playlist.name}</h3>
          <p className="text-gray-400 text-sm">
            {playlist.type === 'smart' ? 'Smart Playlist' : 'Manual Playlist'}
          </p>
        </div>
      </div>

      {playlist.description && (
        <p className="text-gray-400 text-sm mb-4 line-clamp-2">
          {playlist.description}
        </p>
      )}

      <div className="flex items-center justify-between text-sm">
        <span className="text-gray-400">
          {playlist.trackIds.length} tracks
        </span>
        <span className="text-gray-500">
          {formatRelativeDate(playlist.dateModified)}
        </span>
      </div>
    </div>
  )
}