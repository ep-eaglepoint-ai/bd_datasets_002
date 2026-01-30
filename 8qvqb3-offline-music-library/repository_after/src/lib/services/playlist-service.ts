import { TrackMetadata, Playlist, PlaylistRule } from '@/lib/types/music'

class PlaylistService {
  // Create or update tag-based playlists automatically
  async createTagBasedPlaylists(
    allTracks: TrackMetadata[],
    existingPlaylists: Playlist[]
  ): Promise<Playlist[]> {
    // Get all unique tags from tracks
    const allTags = new Set<string>()
    allTracks.forEach(track => {
      track.customTags.forEach(tag => allTags.add(tag))
    })

    const tagBasedPlaylists: Playlist[] = []

    // Create or update playlist for each tag
    for (const tag of allTags) {
      const playlistName = `🏷️ ${tag}`
      
      // Check if tag-based playlist already exists
      let existingPlaylist = existingPlaylists.find(p => 
        p.name === playlistName && p.type === 'smart'
      )

      // Get tracks with this tag
      const tracksWithTag = allTracks
        .filter(track => track.customTags.includes(tag))
        .map(track => track.id)

      if (existingPlaylist) {
        // Update existing playlist
        const updatedPlaylist: Playlist = {
          ...existingPlaylist,
          trackIds: tracksWithTag,
          dateModified: new Date(),
          rules: [{
            field: 'customTags',
            operator: 'contains',
            value: tag
          }]
        }
        tagBasedPlaylists.push(updatedPlaylist)
      } else {
        // Create new tag-based playlist
        const newPlaylist: Playlist = {
          id: crypto.randomUUID(),
          name: playlistName,
          description: `Automatically generated playlist for tracks tagged with "${tag}"`,
          type: 'smart',
          rules: [{
            field: 'customTags',
            operator: 'contains',
            value: tag
          }],
          trackIds: tracksWithTag,
          dateCreated: new Date(),
          dateModified: new Date(),
          sortBy: 'dateAdded',
          sortOrder: 'desc'
        }
        tagBasedPlaylists.push(newPlaylist)
      }
    }

    return tagBasedPlaylists
  }

  // Clean up tag-based playlists that no longer have corresponding tags
  cleanupOrphanedTagPlaylists(
    allTracks: TrackMetadata[],
    existingPlaylists: Playlist[]
  ): string[] {
    // Get all current tags
    const currentTags = new Set<string>()
    allTracks.forEach(track => {
      track.customTags.forEach(tag => currentTags.add(tag))
    })

    // Find tag-based playlists that no longer have corresponding tags
    const orphanedPlaylistIds: string[] = []
    
    existingPlaylists.forEach(playlist => {
      if (this.isTagBasedPlaylist(playlist)) {
        const tag = this.getTagFromPlaylist(playlist)
        if (tag && !currentTags.has(tag)) {
          orphanedPlaylistIds.push(playlist.id)
        }
      }
    })

    return orphanedPlaylistIds
  }

  // Check if a playlist is tag-based
  isTagBasedPlaylist(playlist: Playlist): boolean {
    return playlist.name.startsWith('🏷️ ') && playlist.type === 'smart'
  }

  // Get the tag name from a tag-based playlist
  getTagFromPlaylist(playlist: Playlist): string | null {
    if (this.isTagBasedPlaylist(playlist)) {
      return playlist.name.substring(3).trim() // Remove "🏷️ " prefix and trim whitespace
    }
    return null
  }
  // Evaluate smart playlist rules and return matching tracks
  evaluateSmartPlaylist(playlist: Playlist, allTracks: TrackMetadata[]): string[] {
    if (playlist.type !== 'smart' || playlist.rules.length === 0) {
      return playlist.trackIds
    }

    let matchingTracks = allTracks

    // Apply each rule (AND logic between rules)
    for (const rule of playlist.rules) {
      matchingTracks = this.applyRule(matchingTracks, rule)
    }

    // Sort tracks according to playlist settings
    matchingTracks = this.sortTracks(matchingTracks, playlist.sortBy, playlist.sortOrder)

    return matchingTracks.map(track => track.id)
  }

  // Apply a single rule to filter tracks
  private applyRule(tracks: TrackMetadata[], rule: PlaylistRule): TrackMetadata[] {
    return tracks.filter(track => {
      const fieldValue = this.getFieldValue(track, rule.field)
      return this.evaluateCondition(fieldValue, rule.operator, rule.value)
    })
  }

  // Get field value from track
  private getFieldValue(track: TrackMetadata, field: PlaylistRule['field']): any {
    switch (field) {
      case 'genre':
        return track.genre || ''
      case 'artist':
        return track.artist
      case 'album':
        return track.album
      case 'year':
        return track.year || 0
      case 'rating':
        return track.rating || 0
      case 'playCount':
        return track.playCount
      case 'dateAdded':
        return track.dateAdded
      case 'customTags':
        return track.customTags
      case 'mood':
        return track.mood || ''
      default:
        return null
    }
  }

  // Evaluate condition based on operator
  private evaluateCondition(fieldValue: any, operator: PlaylistRule['operator'], ruleValue: any): boolean {
    switch (operator) {
      case 'equals':
        return fieldValue === ruleValue
      
      case 'contains':
        if (typeof fieldValue === 'string' && typeof ruleValue === 'string') {
          return fieldValue.toLowerCase().includes(ruleValue.toLowerCase())
        }
        if (Array.isArray(fieldValue) && typeof ruleValue === 'string') {
          return fieldValue.some(item => 
            typeof item === 'string' && item.toLowerCase().includes(ruleValue.toLowerCase())
          )
        }
        return false
      
      case 'startsWith':
        if (typeof fieldValue === 'string' && typeof ruleValue === 'string') {
          return fieldValue.toLowerCase().startsWith(ruleValue.toLowerCase())
        }
        return false
      
      case 'endsWith':
        if (typeof fieldValue === 'string' && typeof ruleValue === 'string') {
          return fieldValue.toLowerCase().endsWith(ruleValue.toLowerCase())
        }
        return false
      
      case 'greaterThan':
        if (typeof fieldValue === 'number' && typeof ruleValue === 'number') {
          return fieldValue > ruleValue
        }
        if (fieldValue instanceof Date && typeof ruleValue === 'number') {
          return fieldValue.getTime() > ruleValue
        }
        if (fieldValue instanceof Date && ruleValue instanceof Date) {
          return fieldValue > ruleValue
        }
        return false
      
      case 'lessThan':
        if (typeof fieldValue === 'number' && typeof ruleValue === 'number') {
          return fieldValue < ruleValue
        }
        if (fieldValue instanceof Date && typeof ruleValue === 'number') {
          return fieldValue.getTime() < ruleValue
        }
        if (fieldValue instanceof Date && ruleValue instanceof Date) {
          return fieldValue < ruleValue
        }
        return false
      
      case 'between':
        if (Array.isArray(ruleValue) && ruleValue.length === 2) {
          const [min, max] = ruleValue
          if (typeof fieldValue === 'number') {
            return fieldValue >= min && fieldValue <= max
          }
          if (fieldValue instanceof Date) {
            const timestamp = fieldValue.getTime()
            return timestamp >= min && timestamp <= max
          }
        }
        return false
      
      case 'in':
        if (Array.isArray(ruleValue)) {
          return ruleValue.includes(fieldValue)
        }
        return false
      
      default:
        return false
    }
  }

  // Sort tracks based on criteria
  private sortTracks(
    tracks: TrackMetadata[], 
    sortBy: Playlist['sortBy'], 
    sortOrder: Playlist['sortOrder']
  ): TrackMetadata[] {
    const sorted = [...tracks].sort((a, b) => {
      let aValue: any
      let bValue: any

      switch (sortBy) {
        case 'title':
          aValue = a.title.toLowerCase()
          bValue = b.title.toLowerCase()
          break
        case 'artist':
          aValue = a.artist.toLowerCase()
          bValue = b.artist.toLowerCase()
          break
        case 'album':
          aValue = a.album.toLowerCase()
          bValue = b.album.toLowerCase()
          break
        case 'dateAdded':
          aValue = a.dateAdded
          bValue = b.dateAdded
          break
        case 'playCount':
          aValue = a.playCount
          bValue = b.playCount
          break
        case 'rating':
          aValue = a.rating || 0
          bValue = b.rating || 0
          break
        case 'duration':
          aValue = a.duration
          bValue = b.duration
          break
        default:
          return 0
      }

      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1
      return 0
    })

    return sorted
  }

  // Generate dynamic playlist based on listening behavior
  generateDynamicPlaylist(
    allTracks: TrackMetadata[],
    type: 'recently_played' | 'most_played' | 'recently_added' | 'highly_rated' | 'discover_weekly',
    limit = 50
  ): string[] {
    let tracks: TrackMetadata[]

    switch (type) {
      case 'recently_played':
        tracks = allTracks
          .filter(track => track.lastPlayed)
          .sort((a, b) => {
            const aTime = a.lastPlayed?.getTime() || 0
            const bTime = b.lastPlayed?.getTime() || 0
            return bTime - aTime
          })
          .slice(0, limit)
        break

      case 'most_played':
        tracks = allTracks
          .filter(track => track.playCount > 0)
          .sort((a, b) => b.playCount - a.playCount)
          .slice(0, limit)
        break

      case 'recently_added':
        tracks = allTracks
          .sort((a, b) => b.dateAdded.getTime() - a.dateAdded.getTime())
          .slice(0, limit)
        break

      case 'highly_rated':
        tracks = allTracks
          .filter(track => track.rating && track.rating >= 4)
          .sort((a, b) => (b.rating || 0) - (a.rating || 0))
          .slice(0, limit)
        break

      case 'discover_weekly':
        // Generate discovery playlist based on listening patterns
        tracks = this.generateDiscoveryPlaylist(allTracks, limit)
        break

      default:
        tracks = []
    }

    return tracks.map(track => track.id)
  }

  // Generate discovery playlist using similarity and listening patterns
  private generateDiscoveryPlaylist(allTracks: TrackMetadata[], limit: number): TrackMetadata[] {
    // Get user's most played genres and artists
    const genrePlayCounts = new Map<string, number>()
    const artistPlayCounts = new Map<string, number>()

    allTracks.forEach(track => {
      if (track.genre) {
        genrePlayCounts.set(track.genre, (genrePlayCounts.get(track.genre) || 0) + track.playCount)
      }
      artistPlayCounts.set(track.artist, (artistPlayCounts.get(track.artist) || 0) + track.playCount)
    })

    // Get top genres and artists
    const topGenres = Array.from(genrePlayCounts.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([genre]) => genre)

    const topArtists = Array.from(artistPlayCounts.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([artist]) => artist)

    // Find tracks that match user preferences but haven't been played much
    const discoveryTracks = allTracks.filter(track => {
      // Skip heavily played tracks
      if (track.playCount > 5) return false

      // Include tracks from favorite genres
      if (track.genre && topGenres.includes(track.genre)) return true

      // Include tracks from favorite artists (but not overplayed)
      if (topArtists.includes(track.artist) && track.playCount < 3) return true

      // Include highly rated but underplayed tracks
      if (track.rating && track.rating >= 4 && track.playCount < 2) return true

      return false
    })

    // Sort by potential interest (combination of rating, genre preference, and freshness)
    discoveryTracks.sort((a, b) => {
      let aScore = 0
      let bScore = 0

      // Genre preference score
      if (a.genre && topGenres.includes(a.genre)) {
        aScore += topGenres.indexOf(a.genre) * 10
      }
      if (b.genre && topGenres.includes(b.genre)) {
        bScore += topGenres.indexOf(b.genre) * 10
      }

      // Rating score
      aScore += (a.rating || 0) * 5
      bScore += (b.rating || 0) * 5

      // Freshness score (newer tracks get bonus)
      const now = Date.now()
      const aAge = now - a.dateAdded.getTime()
      const bAge = now - b.dateAdded.getTime()
      const maxAge = 30 * 24 * 60 * 60 * 1000 // 30 days

      if (aAge < maxAge) aScore += (maxAge - aAge) / maxAge * 10
      if (bAge < maxAge) bScore += (maxAge - bAge) / maxAge * 10

      return bScore - aScore
    })

    return discoveryTracks.slice(0, limit)
  }

  // Create playlist from similar tracks
  createSimilarTracksPlaylist(
    seedTrack: TrackMetadata,
    allTracks: TrackMetadata[],
    limit = 25
  ): string[] {
    const similarTracks = allTracks
      .filter(track => track.id !== seedTrack.id)
      .map(track => ({
        track,
        similarity: this.calculateTrackSimilarity(seedTrack, track)
      }))
      .filter(({ similarity }) => similarity > 0.3)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit)
      .map(({ track }) => track)

    return similarTracks.map(track => track.id)
  }

  // Calculate similarity between two tracks
  private calculateTrackSimilarity(track1: TrackMetadata, track2: TrackMetadata): number {
    let similarity = 0
    let factors = 0

    // Genre similarity
    if (track1.genre && track2.genre) {
      similarity += track1.genre === track2.genre ? 0.3 : 0
      factors += 0.3
    }

    // Artist similarity
    similarity += track1.artist === track2.artist ? 0.4 : 0
    factors += 0.4

    // Album similarity
    similarity += track1.album === track2.album ? 0.2 : 0
    factors += 0.2

    // Duration similarity (within 30 seconds)
    const durationDiff = Math.abs(track1.duration - track2.duration)
    if (durationDiff <= 30) {
      similarity += 0.1
    }
    factors += 0.1

    return factors > 0 ? similarity / factors : 0
  }

  // Validate playlist rules
  validatePlaylistRules(rules: PlaylistRule[]): { isValid: boolean; errors: string[] } {
    const errors: string[] = []

    rules.forEach((rule, index) => {
      // Check if field and operator combination is valid
      if (rule.field === 'dateAdded' && !['greaterThan', 'lessThan', 'between'].includes(rule.operator)) {
        errors.push(`Rule ${index + 1}: Date fields only support date comparison operators`)
      }

      if (['playCount', 'rating', 'year'].includes(rule.field) && 
          !['equals', 'greaterThan', 'lessThan', 'between', 'in'].includes(rule.operator)) {
        errors.push(`Rule ${index + 1}: Numeric fields don't support text operators`)
      }

      // Check if value type matches field type
      if (rule.operator === 'between' && !Array.isArray(rule.value)) {
        errors.push(`Rule ${index + 1}: 'between' operator requires an array of two values`)
      }

      if (rule.operator === 'in' && !Array.isArray(rule.value)) {
        errors.push(`Rule ${index + 1}: 'in' operator requires an array of values`)
      }
    })

    return {
      isValid: errors.length === 0,
      errors
    }
  }

  // Get suggested rules based on user's library
  getSuggestedRules(allTracks: TrackMetadata[]): PlaylistRule[] {
    const suggestions: PlaylistRule[] = []

    // Most common genres
    const genreCounts = new Map<string, number>()
    allTracks.forEach(track => {
      if (track.genre) {
        genreCounts.set(track.genre, (genreCounts.get(track.genre) || 0) + 1)
      }
    })

    const topGenres = Array.from(genreCounts.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([genre]) => genre)

    topGenres.forEach(genre => {
      suggestions.push({
        field: 'genre',
        operator: 'equals',
        value: genre
      })
    })

    // High-rated tracks
    const hasRatedTracks = allTracks.some(track => track.rating && track.rating > 0)
    if (hasRatedTracks) {
      suggestions.push({
        field: 'rating',
        operator: 'greaterThan',
        value: 3
      })
    }

    // Recently added
    suggestions.push({
      field: 'dateAdded',
      operator: 'greaterThan',
      value: Date.now() - 30 * 24 * 60 * 60 * 1000 // Last 30 days as timestamp
    })

    // Frequently played
    const hasPlayCounts = allTracks.some(track => track.playCount > 0)
    if (hasPlayCounts) {
      suggestions.push({
        field: 'playCount',
        operator: 'greaterThan',
        value: 2
      })
    }

    return suggestions
  }
}

export const playlistService = new PlaylistService()