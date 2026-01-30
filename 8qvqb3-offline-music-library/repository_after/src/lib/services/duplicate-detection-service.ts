import { TrackMetadata, DuplicateGroup } from '@/lib/types/music'

class DuplicateDetectionService {
  // Detect exact duplicates by file hash
  private detectExactDuplicates(tracks: TrackMetadata[]): DuplicateGroup[] {
    const hashGroups = new Map<string, TrackMetadata[]>()
    
    tracks.forEach(track => {
      // Skip tracks without fileHash
      if (!track.fileHash) return
      
      const existing = hashGroups.get(track.fileHash) || []
      existing.push(track)
      hashGroups.set(track.fileHash, existing)
    })
    
    const duplicateGroups: DuplicateGroup[] = []
    
    hashGroups.forEach((groupTracks, hash) => {
      if (groupTracks.length > 1) {
        duplicateGroups.push({
          id: crypto.randomUUID(),
          trackIds: groupTracks.map(t => t.id),
          similarityScore: 1.0,
          duplicateType: 'exact',
          resolved: false,
        })
      }
    })
    
    return duplicateGroups
  }

  // Detect metadata-based duplicates
  private detectMetadataDuplicates(tracks: TrackMetadata[]): DuplicateGroup[] {
    const duplicateGroups: DuplicateGroup[] = []
    const processed = new Set<string>()
    
    for (let i = 0; i < tracks.length; i++) {
      if (processed.has(tracks[i].id)) continue
      
      const currentTrack = tracks[i]
      const similarTracks = [currentTrack]
      processed.add(currentTrack.id)
      
      for (let j = i + 1; j < tracks.length; j++) {
        if (processed.has(tracks[j].id)) continue
        
        const compareTrack = tracks[j]
        const similarity = this.calculateMetadataSimilarity(currentTrack, compareTrack)
        
        if (similarity >= 0.9) {
          similarTracks.push(compareTrack)
          processed.add(compareTrack.id)
        }
      }
      
      if (similarTracks.length > 1) {
        duplicateGroups.push({
          id: crypto.randomUUID(),
          trackIds: similarTracks.map(t => t.id),
          similarityScore: this.calculateGroupSimilarity(similarTracks),
          duplicateType: 'metadata',
          resolved: false,
        })
      }
    }
    
    return duplicateGroups
  }

  // Detect duration-based duplicates (same duration, similar metadata)
  private detectDurationDuplicates(tracks: TrackMetadata[]): DuplicateGroup[] {
    const duplicateGroups: DuplicateGroup[] = []
    const processed = new Set<string>()
    
    for (let i = 0; i < tracks.length; i++) {
      if (processed.has(tracks[i].id)) continue
      
      const currentTrack = tracks[i]
      const similarTracks = [currentTrack]
      processed.add(currentTrack.id)
      
      for (let j = i + 1; j < tracks.length; j++) {
        if (processed.has(tracks[j].id)) continue
        
        const compareTrack = tracks[j]
        
        // Check if durations are very close (within 2 seconds)
        const durationDiff = Math.abs(currentTrack.duration - compareTrack.duration)
        if (durationDiff <= 2) {
          const metadataSimilarity = this.calculateMetadataSimilarity(currentTrack, compareTrack)
          
          if (metadataSimilarity >= 0.7) {
            similarTracks.push(compareTrack)
            processed.add(compareTrack.id)
          }
        }
      }
      
      if (similarTracks.length > 1) {
        duplicateGroups.push({
          id: crypto.randomUUID(),
          trackIds: similarTracks.map(t => t.id),
          similarityScore: this.calculateGroupSimilarity(similarTracks),
          duplicateType: 'duration',
          resolved: false,
        })
      }
    }
    
    return duplicateGroups
  }

  // Detect fuzzy duplicates using Levenshtein distance
  private detectFuzzyDuplicates(tracks: TrackMetadata[]): DuplicateGroup[] {
    const duplicateGroups: DuplicateGroup[] = []
    const processed = new Set<string>()
    
    for (let i = 0; i < tracks.length; i++) {
      if (processed.has(tracks[i].id)) continue
      
      const currentTrack = tracks[i]
      const similarTracks = [currentTrack]
      processed.add(currentTrack.id)
      
      for (let j = i + 1; j < tracks.length; j++) {
        if (processed.has(tracks[j].id)) continue
        
        const compareTrack = tracks[j]
        const similarity = this.calculateFuzzySimilarity(currentTrack, compareTrack)
        
        if (similarity >= 0.8) {
          similarTracks.push(compareTrack)
          processed.add(compareTrack.id)
        }
      }
      
      if (similarTracks.length > 1) {
        duplicateGroups.push({
          id: crypto.randomUUID(),
          trackIds: similarTracks.map(t => t.id),
          similarityScore: this.calculateGroupSimilarity(similarTracks),
          duplicateType: 'fuzzy',
          resolved: false,
        })
      }
    }
    
    return duplicateGroups
  }

  // Calculate metadata similarity between two tracks
  private calculateMetadataSimilarity(track1: TrackMetadata, track2: TrackMetadata): number {
    let score = 0
    let factors = 0
    
    // Title similarity (most important)
    if (this.normalizeString(track1.title) === this.normalizeString(track2.title)) {
      score += 0.4
    }
    factors += 0.4
    
    // Artist similarity
    if (this.normalizeString(track1.artist) === this.normalizeString(track2.artist)) {
      score += 0.3
    }
    factors += 0.3
    
    // Album similarity
    if (this.normalizeString(track1.album) === this.normalizeString(track2.album)) {
      score += 0.2
    }
    factors += 0.2
    
    // Duration similarity (within 5 seconds)
    const durationDiff = Math.abs(track1.duration - track2.duration)
    if (durationDiff <= 5) {
      score += 0.1
    }
    factors += 0.1
    
    return factors > 0 ? score / factors : 0
  }

  // Calculate fuzzy similarity using Levenshtein distance
  private calculateFuzzySimilarity(track1: TrackMetadata, track2: TrackMetadata): number {
    const titleSim = this.levenshteinSimilarity(
      this.normalizeString(track1.title),
      this.normalizeString(track2.title)
    )
    
    const artistSim = this.levenshteinSimilarity(
      this.normalizeString(track1.artist),
      this.normalizeString(track2.artist)
    )
    
    const albumSim = this.levenshteinSimilarity(
      this.normalizeString(track1.album),
      this.normalizeString(track2.album)
    )
    
    // Weighted average
    return (titleSim * 0.5 + artistSim * 0.3 + albumSim * 0.2)
  }

  // Calculate overall similarity for a group of tracks
  private calculateGroupSimilarity(tracks: TrackMetadata[]): number {
    if (tracks.length < 2) return 1.0
    
    let totalSimilarity = 0
    let comparisons = 0
    
    for (let i = 0; i < tracks.length; i++) {
      for (let j = i + 1; j < tracks.length; j++) {
        totalSimilarity += this.calculateMetadataSimilarity(tracks[i], tracks[j])
        comparisons++
      }
    }
    
    return comparisons > 0 ? totalSimilarity / comparisons : 0
  }

  // Normalize string for comparison
  private normalizeString(str: string): string {
    return str
      .toLowerCase()
      .trim()
      .replace(/[^\w\s]/g, '') // Remove special characters
      .replace(/\s+/g, ' ') // Normalize whitespace
  }

  // Calculate Levenshtein similarity (0-1 scale)
  private levenshteinSimilarity(str1: string, str2: string): number {
    const distance = this.levenshteinDistance(str1, str2)
    const maxLength = Math.max(str1.length, str2.length)
    return maxLength === 0 ? 1 : 1 - (distance / maxLength)
  }

  // Calculate Levenshtein distance
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null))
    
    for (let i = 0; i <= str1.length; i++) {
      matrix[0][i] = i
    }
    
    for (let j = 0; j <= str2.length; j++) {
      matrix[j][0] = j
    }
    
    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1, // deletion
          matrix[j - 1][i] + 1, // insertion
          matrix[j - 1][i - 1] + indicator // substitution
        )
      }
    }
    
    return matrix[str2.length][str1.length]
  }

  // Main duplicate detection method
  async detectDuplicates(tracks: TrackMetadata[]): Promise<DuplicateGroup[]> {
    // Safety check
    if (!tracks || tracks.length === 0) {
      return []
    }
    
    const allDuplicates: DuplicateGroup[] = []
    
    try {
      // Detect different types of duplicates
      const exactDuplicates = this.detectExactDuplicates(tracks)
      const metadataDuplicates = this.detectMetadataDuplicates(tracks)
      const durationDuplicates = this.detectDurationDuplicates(tracks)
      const fuzzyDuplicates = this.detectFuzzyDuplicates(tracks)
      
      allDuplicates.push(...exactDuplicates)
      allDuplicates.push(...metadataDuplicates)
      allDuplicates.push(...durationDuplicates)
      allDuplicates.push(...fuzzyDuplicates)
      
      // Remove overlapping groups (prefer higher similarity scores)
      return this.deduplicateGroups(allDuplicates)
    } catch (error) {
      console.error('Error during duplicate detection:', error)
      return []
    }
  }

  // Remove overlapping duplicate groups
  private deduplicateGroups(groups: DuplicateGroup[]): DuplicateGroup[] {
    const sortedGroups = groups.sort((a, b) => b.similarityScore - a.similarityScore)
    const usedTrackIds = new Set<string>()
    const finalGroups: DuplicateGroup[] = []
    
    for (const group of sortedGroups) {
      const hasOverlap = group.trackIds.some(id => usedTrackIds.has(id))
      
      if (!hasOverlap) {
        finalGroups.push(group)
        group.trackIds.forEach(id => usedTrackIds.add(id))
      }
    }
    
    return finalGroups
  }

  // Get recommended action for a duplicate group
  getRecommendedAction(group: DuplicateGroup, tracks: TrackMetadata[]): {
    action: 'keep_highest_quality' | 'keep_most_played' | 'keep_newest' | 'manual_review'
    recommendedTrackId?: string
    reason: string
  } {
    // Safety checks
    if (!group || !tracks || tracks.length === 0) {
      return {
        action: 'manual_review',
        reason: 'Invalid group or tracks data'
      }
    }
    
    const groupTracks = tracks.filter(t => t && group.trackIds && group.trackIds.includes(t.id))
    
    if (groupTracks.length === 0) {
      return {
        action: 'manual_review',
        reason: 'No valid tracks found in group'
      }
    }
    
    if (group.duplicateType === 'exact') {
      // For exact duplicates, keep the highest quality version
      const highestQuality = groupTracks.reduce((best, current) => {
        const bestBitrate = best.bitrate || 0
        const currentBitrate = current.bitrate || 0
        return currentBitrate > bestBitrate ? current : best
      })
      
      return {
        action: 'keep_highest_quality',
        recommendedTrackId: highestQuality.id,
        reason: `Keep highest quality version (${highestQuality.bitrate || 'unknown'} kbps)`
      }
    }
    
    if (group.similarityScore >= 0.95) {
      // For very similar tracks, keep the most played one
      const mostPlayed = groupTracks.reduce((best, current) => 
        current.playCount > best.playCount ? current : best
      )
      
      if (mostPlayed.playCount > 0) {
        return {
          action: 'keep_most_played',
          recommendedTrackId: mostPlayed.id,
          reason: `Keep most played version (${mostPlayed.playCount} plays)`
        }
      }
      
      // If no plays, keep the newest
      const newest = groupTracks.reduce((best, current) => 
        current.dateAdded > best.dateAdded ? current : best
      )
      
      return {
        action: 'keep_newest',
        recommendedTrackId: newest.id,
        reason: 'Keep most recently added version'
      }
    }
    
    return {
      action: 'manual_review',
      reason: 'Similarity too low for automatic resolution'
    }
  }
}

export const duplicateDetectionService = new DuplicateDetectionService()