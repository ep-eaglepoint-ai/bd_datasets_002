import { searchService } from '@/lib/services/search-service'
import { TrackMetadata } from '@/lib/types/music'

describe('SearchService', () => {
  const mockTracks: TrackMetadata[] = [
    {
      id: '1',
      title: 'Bohemian Rhapsody',
      artist: 'Queen',
      album: 'A Night at the Opera',
      genre: 'Rock',
      duration: 355,
      bitrate: 320,
      year: 1975,
      trackNumber: 11,
      discNumber: 1,
      fileFormat: 'mp3',
      fileSize: 14200000,
      filePath: 'Queen - Bohemian Rhapsody.mp3',
      fileHash: 'hash1',
      dateAdded: new Date('2024-01-01'),
      dateModified: new Date('2024-01-01'),
      playCount: 5,
      rating: 5,
      lastPlayed: new Date('2024-01-15')
    },
    {
      id: '2',
      title: 'Stairway to Heaven',
      artist: 'Led Zeppelin',
      album: 'Led Zeppelin IV',
      genre: 'Rock',
      duration: 482,
      bitrate: 320,
      year: 1971,
      trackNumber: 4,
      discNumber: 1,
      fileFormat: 'flac',
      fileSize: 48500000,
      filePath: 'Led Zeppelin - Stairway to Heaven.flac',
      fileHash: 'hash2',
      dateAdded: new Date('2024-01-02'),
      dateModified: new Date('2024-01-02'),
      playCount: 3,
      rating: 5,
      lastPlayed: new Date('2024-01-10')
    }
  ]

  beforeEach(() => {
    searchService.initialize(mockTracks)
  })

  describe('search', () => {
    it('should find tracks by title', () => {
      const results = searchService.search('Bohemian')
      expect(results).toHaveLength(1)
      expect(results[0].title).toBe('Bohemian Rhapsody')
    })

    it('should find tracks by artist', () => {
      const results = searchService.search('Queen')
      expect(results).toHaveLength(1)
      expect(results[0].artist).toBe('Queen')
    })

    it('should find tracks by album', () => {
      const results = searchService.search('Night at the Opera')
      expect(results).toHaveLength(1)
      expect(results[0].album).toBe('A Night at the Opera')
    })

    it('should be case insensitive', () => {
      const results = searchService.search('queen')
      expect(results).toHaveLength(1)
      expect(results[0].artist).toBe('Queen')
    })

    it('should return empty array for no matches', () => {
      const results = searchService.search('nonexistent')
      expect(results).toHaveLength(0)
    })

    it('should return all tracks for empty search query', () => {
      const results = searchService.search('')
      expect(results).toHaveLength(2)
    })
  })

  describe('addTracks', () => {
    it('should add new tracks to search index', () => {
      const newTrack: TrackMetadata = {
        id: '3',
        title: 'Hotel California',
        artist: 'Eagles',
        album: 'Hotel California',
        genre: 'Rock',
        duration: 391,
        bitrate: 320,
        year: 1976,
        trackNumber: 1,
        discNumber: 1,
        fileFormat: 'mp3',
        fileSize: 15600000,
        filePath: 'Eagles - Hotel California.mp3',
        fileHash: 'hash3',
        dateAdded: new Date('2024-01-03'),
        dateModified: new Date('2024-01-03'),
        playCount: 0,
        rating: 4
      }

      searchService.addTracks([newTrack])
      const results = searchService.search('Hotel California')
      expect(results).toHaveLength(1)
      expect(results[0].title).toBe('Hotel California')
    })
  })
})