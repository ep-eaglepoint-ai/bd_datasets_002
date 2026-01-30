import Fuse, { IFuseOptions } from 'fuse.js'
import { TrackMetadata, ViewState } from '@/lib/types/music'

class SearchService {
  private fuse: Fuse<TrackMetadata> | null = null
  private tracks: TrackMetadata[] = []

  private fuseOptions: IFuseOptions<TrackMetadata> = {
    keys: [
      { name: 'title', weight: 0.3 },
      { name: 'artist', weight: 0.25 },
      { name: 'album', weight: 0.2 },
      { name: 'genre', weight: 0.1 },
      { name: 'customTags', weight: 0.1 },
      { name: 'mood', weight: 0.05 },
    ],
    threshold: 0.4, // Lower = more strict matching
    includeScore: true,
    includeMatches: true,
    minMatchCharLength: 2,
  }

  initialize(tracks: TrackMetadata[]): void {
    this.tracks = tracks
    this.fuse = new Fuse(tracks, this.fuseOptions)
  }

  addTracks(newTracks: TrackMetadata[]): void {
    this.tracks = [...this.tracks, ...newTracks]
    this.fuse = new Fuse(this.tracks, this.fuseOptions)
  }

  updateTrack(updatedTrack: TrackMetadata): void {
    const index = this.tracks.findIndex(track => track.id === updatedTrack.id)
    if (index !== -1) {
      this.tracks[index] = updatedTrack
      this.fuse = new Fuse(this.tracks, this.fuseOptions)
    }
  }

  removeTrack(trackId: string): void {
    this.tracks = this.tracks.filter(track => track.id !== trackId)
    this.fuse = new Fuse(this.tracks, this.fuseOptions)
  }

  search(query: string, filters: ViewState['filters'] = {}): TrackMetadata[] {
    if (!this.fuse) {
      return []
    }

    let results: TrackMetadata[]

    // Perform fuzzy search
    if (query.trim()) {
      const fuseResults = this.fuse.search(query)
      results = fuseResults.map(result => result.item)
    } else {
      results = [...this.tracks]
    }

    // Apply filters
    results = this.applyFilters(results, filters)

    return results
  }

  private applyFilters(tracks: TrackMetadata[], filters: ViewState['filters']): TrackMetadata[] {
    return tracks.filter(track => {
      // Genre filter
      if (filters.genre && track.genre !== filters.genre) {
        return false
      }

      // Artist filter
      if (filters.artist && track.artist !== filters.artist) {
        return false
      }

      // Album filter
      if (filters.album && track.album !== filters.album) {
        return false
      }

      // Year filter
      if (filters.year && track.year !== filters.year) {
        return false
      }

      // Rating filter
      if (filters.rating && track.rating !== filters.rating) {
        return false
      }

      return true
    })
  }

  // Advanced search with compound queries
  advancedSearch(searchParams: {
    title?: string
    artist?: string
    album?: string
    genre?: string
    yearRange?: [number, number]
    ratingRange?: [number, number]
    playCountRange?: [number, number]
    customTags?: string[]
    mood?: string
  }): TrackMetadata[] {
    return this.tracks.filter(track => {
      // Title search
      if (searchParams.title && !track.title.toLowerCase().includes(searchParams.title.toLowerCase())) {
        return false
      }

      // Artist search
      if (searchParams.artist && !track.artist.toLowerCase().includes(searchParams.artist.toLowerCase())) {
        return false
      }

      // Album search
      if (searchParams.album && !track.album.toLowerCase().includes(searchParams.album.toLowerCase())) {
        return false
      }

      // Genre search
      if (searchParams.genre && track.genre !== searchParams.genre) {
        return false
      }

      // Year range
      if (searchParams.yearRange && track.year) {
        const [minYear, maxYear] = searchParams.yearRange
        if (track.year < minYear || track.year > maxYear) {
          return false
        }
      }

      // Rating range
      if (searchParams.ratingRange && track.rating) {
        const [minRating, maxRating] = searchParams.ratingRange
        if (track.rating < minRating || track.rating > maxRating) {
          return false
        }
      }

      // Play count range
      if (searchParams.playCountRange) {
        const [minCount, maxCount] = searchParams.playCountRange
        if (track.playCount < minCount || track.playCount > maxCount) {
          return false
        }
      }

      // Custom tags
      if (searchParams.customTags && searchParams.customTags.length > 0) {
        const hasAllTags = searchParams.customTags.every(tag =>
          track.customTags.some(trackTag => trackTag.toLowerCase().includes(tag.toLowerCase()))
        )
        if (!hasAllTags) {
          return false
        }
      }

      // Mood
      if (searchParams.mood && track.mood !== searchParams.mood) {
        return false
      }

      return true
    })
  }

  // Get suggestions for autocomplete
  getSuggestions(field: keyof TrackMetadata, query: string, limit = 10): string[] {
    const values = new Set<string>()
    
    this.tracks.forEach(track => {
      const value = track[field]
      if (typeof value === 'string' && value.toLowerCase().includes(query.toLowerCase())) {
        values.add(value)
      } else if (Array.isArray(value)) {
        value.forEach(item => {
          if (typeof item === 'string' && item.toLowerCase().includes(query.toLowerCase())) {
            values.add(item)
          }
        })
      }
    })

    return Array.from(values).slice(0, limit).sort()
  }

  // Get unique values for filter dropdowns
  getUniqueValues(field: keyof TrackMetadata): string[] {
    const values = new Set<string>()
    
    this.tracks.forEach(track => {
      const value = track[field]
      if (typeof value === 'string' && value) {
        values.add(value)
      } else if (Array.isArray(value)) {
        value.forEach(item => {
          if (typeof item === 'string' && item) {
            values.add(item)
          }
        })
      }
    })

    return Array.from(values).sort()
  }

  // Search within specific playlist
  searchInPlaylist(query: string, trackIds: string[]): TrackMetadata[] {
    const playlistTracks = this.tracks.filter(track => trackIds.includes(track.id))
    
    if (!query.trim()) {
      return playlistTracks
    }

    const playlistFuse = new Fuse(playlistTracks, this.fuseOptions)
    const results = playlistFuse.search(query)
    return results.map(result => result.item)
  }
}

export const searchService = new SearchService()