import { tagService } from '@/lib/services/tag-service'
import { TrackMetadata } from '@/lib/types/music'

describe('TagService', () => {
  const mockTracks: TrackMetadata[] = [
    {
      id: '1',
      title: 'Track 1',
      artist: 'Artist 1',
      album: 'Album 1',
      genre: 'Rock',
      duration: 180,
      bitrate: 320,
      fileSize: 7200000,
      filePath: 'track1.mp3',
      fileFormat: 'mp3',
      fileHash: 'hash1',
      dateAdded: new Date('2024-01-01'),
      dateModified: new Date('2024-01-01'),
      playCount: 5,
      customTags: ['Favorite', 'workout', 'ENERGETIC'],
      mood: 'Happy',
      rating: 5
    },
    {
      id: '2',
      title: 'Track 2',
      artist: 'Artist 2',
      album: 'Album 2',
      genre: 'Pop',
      duration: 200,
      bitrate: 256,
      fileSize: 6400000,
      filePath: 'track2.mp3',
      fileFormat: 'mp3',
      fileHash: 'hash2',
      dateAdded: new Date('2024-01-02'),
      dateModified: new Date('2024-01-02'),
      playCount: 3,
      customTags: ['favorite', 'Chill'],
      mood: 'relaxing',
      rating: 4
    },
    {
      id: '3',
      title: 'Track 3',
      artist: 'Artist 3',
      album: 'Album 3',
      genre: 'Jazz',
      duration: 240,
      bitrate: 320,
      fileSize: 9600000,
      filePath: 'track3.flac',
      fileFormat: 'flac',
      fileHash: 'hash3',
      dateAdded: new Date('2024-01-03'),
      dateModified: new Date('2024-01-03'),
      playCount: 1,
      customTags: ['Study', 'Instrumental'],
      mood: 'Calm'
    }
  ]

  describe('getAllTags', () => {
    it('should return all unique tags with counts', () => {
      const tags = tagService.getAllTags(mockTracks)
      
      expect(tags).toHaveLength(7) // Favorite, workout, ENERGETIC, favorite, Chill, Study, Instrumental
      expect(tags.find(t => t.tag === 'Favorite')?.count).toBe(1)
      expect(tags.find(t => t.tag === 'favorite')?.count).toBe(1)
      expect(tags.find(t => t.tag === 'Study')?.count).toBe(1)
    })

    it('should sort tags by count in descending order', () => {
      const tags = tagService.getAllTags(mockTracks)
      
      // All tags appear once, so they should be sorted alphabetically as secondary sort
      expect(tags[0].count).toBeGreaterThanOrEqual(tags[1].count)
    })
  })

  describe('getAllMoods', () => {
    it('should return all unique moods with counts', () => {
      const moods = tagService.getAllMoods(mockTracks)
      
      expect(moods).toHaveLength(3) // Happy, relaxing, Calm
      expect(moods.find(m => m.mood === 'Happy')?.count).toBe(1)
      expect(moods.find(m => m.mood === 'relaxing')?.count).toBe(1)
      expect(moods.find(m => m.mood === 'Calm')?.count).toBe(1)
    })
  })

  describe('normalizeTags', () => {
    it('should normalize tag casing and remove duplicates', () => {
      const tags = ['favorite', 'FAVORITE', 'Favorite', 'workout', 'WORKOUT']
      const normalized = tagService.normalizeTags(tags)
      
      expect(normalized).toHaveLength(2)
      expect(normalized).toContain('Favorite')
      expect(normalized).toContain('Workout')
    })

    it('should handle empty and whitespace tags', () => {
      const tags = ['', '  ', 'valid', '  valid  ']
      const normalized = tagService.normalizeTags(tags)
      
      expect(normalized).toHaveLength(1)
      expect(normalized).toContain('Valid')
    })

    it('should convert to title case', () => {
      const tags = ['multiple words', 'ANOTHER TAG', 'mixedCase']
      const normalized = tagService.normalizeTags(tags)
      
      expect(normalized).toContain('Multiple Words')
      expect(normalized).toContain('Another Tag')
      expect(normalized).toContain('Mixedcase')
    })
  })

  describe('normalizeMood', () => {
    it('should normalize mood to title case', () => {
      expect(tagService.normalizeMood('happy')).toBe('Happy')
      expect(tagService.normalizeMood('VERY HAPPY')).toBe('Very Happy')
      expect(tagService.normalizeMood('  relaxing  ')).toBe('Relaxing')
    })

    it('should handle empty mood', () => {
      expect(tagService.normalizeMood('')).toBe('')
      expect(tagService.normalizeMood('   ')).toBe('')
    })
  })

  describe('getTagSuggestions', () => {
    it('should return all tags when query is empty', () => {
      const suggestions = tagService.getTagSuggestions(mockTracks, '', 10)
      
      expect(suggestions.length).toBeGreaterThan(0)
    })

    it('should filter tags by query', () => {
      const suggestions = tagService.getTagSuggestions(mockTracks, 'fav', 10)
      
      expect(suggestions.length).toBeGreaterThan(0)
      expect(suggestions.some(s => s.tag.toLowerCase().includes('fav'))).toBe(true)
    })

    it('should limit results', () => {
      const suggestions = tagService.getTagSuggestions(mockTracks, '', 2)
      
      expect(suggestions.length).toBeLessThanOrEqual(2)
    })
  })

  describe('getMoodSuggestions', () => {
    it('should return all moods when query is empty', () => {
      const suggestions = tagService.getMoodSuggestions(mockTracks, '', 10)
      
      expect(suggestions.length).toBe(3)
    })

    it('should filter moods by query', () => {
      const suggestions = tagService.getMoodSuggestions(mockTracks, 'hap', 10)
      
      expect(suggestions.length).toBe(1)
      expect(suggestions[0].mood).toBe('Happy')
    })
  })

  describe('findSimilarTags', () => {
    it('should find similar tags', () => {
      const similar = tagService.findSimilarTags(mockTracks, 0.7)
      
      // Should find 'Favorite' and 'favorite' as similar
      const favoriteGroup = similar.find(s => 
        s.original.toLowerCase() === 'favorite' || 
        s.similar.some(tag => tag.toLowerCase() === 'favorite')
      )
      
      expect(favoriteGroup).toBeDefined()
    })

    it('should respect similarity threshold', () => {
      const highThreshold = tagService.findSimilarTags(mockTracks, 0.95)
      const lowThreshold = tagService.findSimilarTags(mockTracks, 0.5)
      
      expect(lowThreshold.length).toBeGreaterThanOrEqual(highThreshold.length)
    })
  })

  describe('getPredefinedMoods', () => {
    it('should return predefined mood list', () => {
      const moods = tagService.getPredefinedMoods()
      
      expect(moods.length).toBeGreaterThan(0)
      expect(moods).toContain('Happy')
      expect(moods).toContain('Sad')
      expect(moods).toContain('Energetic')
    })
  })

  describe('getPredefinedTags', () => {
    it('should return predefined tag list', () => {
      const tags = tagService.getPredefinedTags()
      
      expect(tags.length).toBeGreaterThan(0)
      expect(tags).toContain('Favorite')
      expect(tags).toContain('Workout')
      expect(tags).toContain('Study')
    })
  })
})