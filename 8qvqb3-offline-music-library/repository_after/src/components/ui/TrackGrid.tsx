'use client'

import { TrackMetadata } from '@/lib/types/music'
import { TrackCard } from './TrackCard'

interface TrackGridProps {
  tracks: TrackMetadata[]
  selectedTrackIds: string[]
  onTrackSelect: (trackId: string, isSelected: boolean) => void
}

export function TrackGrid({ tracks, selectedTrackIds, onTrackSelect }: TrackGridProps) {
  return (
    <div className="p-6">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-6">
        {tracks.map((track) => (
          <TrackCard
            key={track.id}
            track={track}
            isSelected={selectedTrackIds.includes(track.id)}
            onSelect={(isSelected) => onTrackSelect(track.id, isSelected)}
          />
        ))}
      </div>
    </div>
  )
}