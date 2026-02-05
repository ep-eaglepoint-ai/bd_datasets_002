import { TrackMetadata } from '@/lib/types/music'

export interface TagSuggestion {
  tag: string
  count: number
  category?: 'genre' | 'mood' | 'custom'
}

export interface MoodSuggestion {
  mood: string
  count: number
}

class TagService {
  // Get all unique tags from the library
  getAllTags(tracks: TrackMetadata[]): TagSuggestion[] {
    const tagCounts = new Map<string, number>()
    
    tracks.forEach(track => {
      track.customTags.forEach(tag => {
        tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1)
      })
    })
    
    return Array.from(tagCounts.entries())
      .map(([tag, count]) => ({ tag, count, category: 'custom' as const }))
      .sort((a, b) => b.count - a.count)
  }

  // Get all unique moods from the library
  getAllMoods(tracks: TrackMetadata[]): MoodSuggestion[] {
    const moodCounts = new Map<string, number>()
    
    tracks.forEach(track => {
      if (track.mood) {
        moodCounts.set(track.mood, (moodCounts.get(track.mood) || 0) + 1)
      }
    })
    
    return Array.from(moodCounts.entries())
      .map(([mood, count]) => ({ mood, count }))
      .sort((a, b) => b.count - a.count)
  }

  // Get tag suggestions based on partial input
  getTagSuggestions(tracks: TrackMetadata[], query: string, limit = 10): TagSuggestion[] {
    const allTags = this.getAllTags(tracks)
    
    if (!query.trim()) {
      return allTags.slice(0, limit)
    }
    
    const queryLower = query.toLowerCase()
    return allTags
      .filter(({ tag }) => tag.toLowerCase().includes(queryLower))
      .slice(0, limit)
  }

  // Get mood suggestions based on partial input
  getMoodSuggestions(tracks: TrackMetadata[], query: string, limit = 10): MoodSuggestion[] {
    const allMoods = this.getAllMoods(tracks)
    
    if (!query.trim()) {
      return allMoods.slice(0, limit)
    }
    
    const queryLower = query.toLowerCase()
    return allMoods
      .filter(({ mood }) => mood.toLowerCase().includes(queryLower))
      .slice(0, limit)
  }

  // Normalize tag names (consistent casing, remove duplicates)
  normalizeTags(tags: string[]): string[] {
    const normalized = new Set<string>()
    
    tags.forEach(tag => {
      const trimmed = tag.trim()
      if (trimmed) {
        // Convert to title case for consistency
        const titleCase = trimmed
          .toLowerCase()
          .split(' ')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ')
        normalized.add(titleCase)
      }
    })
    
    return Array.from(normalized).sort()
  }

  // Normalize mood names
  normalizeMood(mood: string): string {
    const trimmed = mood.trim()
    if (!trimmed) return ''
    
    // Convert to title case
    return trimmed
      .toLowerCase()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  }

  // Get popular tags (most used)
  getPopularTags(tracks: TrackMetadata[], limit = 20): TagSuggestion[] {
    return this.getAllTags(tracks).slice(0, limit)
  }

  // Get popular moods (most used)
  getPopularMoods(tracks: TrackMetadata[], limit = 10): MoodSuggestion[] {
    return this.getAllMoods(tracks).slice(0, limit)
  }

  // Find similar tags (for deduplication)
  findSimilarTags(tracks: TrackMetadata[], threshold = 0.8): Array<{ original: string; similar: string[]; count: number }> {
    const allTags = this.getAllTags(tracks)
    const similar: Array<{ original: string; similar: string[]; count: number }> = []
    
    for (let i = 0; i < allTags.length; i++) {
      const tag1 = allTags[i]
      const similarTags: string[] = []
      
      for (let j = i + 1; j < allTags.length; j++) {
        const tag2 = allTags[j]
        
        if (this.calculateSimilarity(tag1.tag, tag2.tag) >= threshold) {
          similarTags.push(tag2.tag)
        }
      }
      
      if (similarTags.length > 0) {
        similar.push({
          original: tag1.tag,
          similar: similarTags,
          count: tag1.count
        })
      }
    }
    
    return similar.sort((a, b) => b.count - a.count)
  }

  // Calculate string similarity (Levenshtein distance based)
  private calculateSimilarity(str1: string, str2: string): number {
    const s1 = str1.toLowerCase()
    const s2 = str2.toLowerCase()
    
    if (s1 === s2) return 1
    
    const longer = s1.length > s2.length ? s1 : s2
    const shorter = s1.length > s2.length ? s2 : s1
    
    if (longer.length === 0) return 1
    
    const distance = this.levenshteinDistance(longer, shorter)
    return (longer.length - distance) / longer.length
  }

  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = []
    
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i]
    }
    
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j
    }
    
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1]
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          )
        }
      }
    }
    
    return matrix[str2.length][str1.length]
  }

  // Predefined mood categories for suggestions
  getPredefinedMoods(): string[] {
    return [
      'Happy',
      'Sad',
      'Energetic',
      'Calm',
      'Melancholic',
      'Upbeat',
      'Relaxing',
      'Intense',
      'Peaceful',
      'Aggressive',
      'Romantic',
      'Nostalgic',
      'Motivational',
      'Dark',
      'Bright',
      'Dreamy',
      'Powerful',
      'Gentle',
      'Mysterious',
      'Playful'
    ]
  }

  // Predefined tag categories for suggestions
  getPredefinedTags(): string[] {
    return [
      'Favorite',
      'Workout',
      'Study',
      'Party',
      'Driving',
      'Sleep',
      'Focus',
      'Chill',
      'Dance',
      'Acoustic',
      'Live',
      'Cover',
      'Instrumental',
      'Vocal',
      'Classic',
      'New',
      'Discovered',
      'Recommended',
      'Seasonal',
      'Holiday'
    ]
  }
}

export const tagService = new TagService()