import { playlistService } from '@/lib/services/playlist-service'
import { TrackMetadata, Playlist } from '@/lib/types/music'

describe('PlaylistService', () => {
  const createMockTrack = (overrides: Partial<TrackMetadata>): TrackMetadata => ({
    id: 'track1',
    title: 'Test Song',
    artist: 'Test Artist',
    album: 'Test Album',
    duration: 180,
    fileSize: 5000000,
    filePath: 'test.mp3',
    fileFormat: 'mp3',
    fileHash: 'hash1',
    dateAdded: new Date(),
    dateModified: new Date(),
    playCount: 0,
    customTags: [],
    ...overrides
  })

  const createMockPlaylist = (overrides: Partial<Playlist>): Playlist => ({
    id: 'playlist1',
    name: 'Test Playlist',
    type: 'manual',
    rules: [],
    trackIds: [],
    dateCreated: new Date(),
    dateModified: new Date(),
    sortBy: 'dateAdded',
    sortOrder: 'desc',
    ...overrides
  })

  describe('Tag-based playlist management', () => {
    it('should create tag-based playlists for tracks with tags', async () => {
      const tracks = [
        createMockTrack({ id: 'track1', customTags: ['Workout', 'Rock'] }),
        createMockTrack({ id: 'track2', customTags: ['Workout'] }),
        createMockTrack({ id: 'track3', customTags: ['Chill'] }),
        createMockTrack({ id: 'track4', customTags: [] }),
      ]

      const existingPlaylists: Playlist[] = []
      
      const result = await playlistService.createTagBasedPlaylists(tracks, existingPlaylists)
      
      expect(result).toHaveLength(3) // Workout, Rock, Chill
      
      const workoutPlaylist = result.find(p => p.name === '🏷️ Workout')
      expect(workoutPlaylist).toBeDefined()
      expect(workoutPlaylist!.trackIds).toEqual(['track1', 'track2'])
      expect(workoutPlaylist!.type).toBe('smart')
      
      const rockPlaylist = result.find(p => p.name === '🏷️ Rock')
      expect(rockPlaylist).toBeDefined()
      expect(rockPlaylist!.trackIds).toEqual(['track1'])
      
      const chillPlaylist = result.find(p => p.name === '🏷️ Chill')
      expect(chillPlaylist).toBeDefined()
      expect(chillPlaylist!.trackIds).toEqual(['track3'])
    })

    it('should update existing tag-based playlists', async () => {
      const tracks = [
        createMockTrack({ id: 'track1', customTags: ['Workout'] }),
        createMockTrack({ id: 'track2', customTags: ['Workout'] }),
      ]

      const existingPlaylists = [
        createMockPlaylist({
          id: 'existing1',
          name: '🏷️ Workout',
          type: 'smart',
          trackIds: ['track1'], // Only has track1 initially
        })
      ]
      
      const result = await playlistService.createTagBasedPlaylists(tracks, existingPlaylists)
      
      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('existing1') // Same playlist ID
      expect(result[0].trackIds).toEqual(['track1', 'track2']) // Updated with both tracks
    })

    it('should identify orphaned tag playlists', () => {
      const tracks = [
        createMockTrack({ id: 'track1', customTags: ['Workout'] }),
      ]

      const existingPlaylists = [
        createMockPlaylist({ id: 'playlist1', name: '🏷️ Workout', type: 'smart' }),
        createMockPlaylist({ id: 'playlist2', name: '🏷️ Chill', type: 'smart' }), // No tracks with 'Chill' tag
        createMockPlaylist({ id: 'playlist3', name: 'Manual Playlist', type: 'manual' }),
      ]
      
      const orphanedIds = playlistService.cleanupOrphanedTagPlaylists(tracks, existingPlaylists)
      
      expect(orphanedIds).toEqual(['playlist2']) // Only the Chill playlist should be orphaned
    })

    it('should identify tag-based playlists correctly', () => {
      const tagPlaylist = createMockPlaylist({ name: '🏷️ Workout', type: 'smart' })
      const manualPlaylist = createMockPlaylist({ name: 'My Playlist', type: 'manual' })
      const smartPlaylist = createMockPlaylist({ name: 'Smart Playlist', type: 'smart' })
      
      expect(playlistService.isTagBasedPlaylist(tagPlaylist)).toBe(true)
      expect(playlistService.isTagBasedPlaylist(manualPlaylist)).toBe(false)
      expect(playlistService.isTagBasedPlaylist(smartPlaylist)).toBe(false)
    })

    it('should extract tag name from tag-based playlist', () => {
      const tagPlaylist = createMockPlaylist({ name: '🏷️ Workout', type: 'smart' })
      const manualPlaylist = createMockPlaylist({ name: 'My Playlist', type: 'manual' })
      
      expect(playlistService.getTagFromPlaylist(tagPlaylist)).toBe('Workout')
      expect(playlistService.getTagFromPlaylist(manualPlaylist)).toBe(null)
    })
  })

  describe('Smart playlist evaluation', () => {
    it('should evaluate smart playlist rules correctly', () => {
      const tracks = [
        createMockTrack({ id: 'track1', customTags: ['Workout'], rating: 5 }),
        createMockTrack({ id: 'track2', customTags: ['Chill'], rating: 3 }),
        createMockTrack({ id: 'track3', customTags: ['Workout'], rating: 4 }),
      ]

      const playlist = createMockPlaylist({
        type: 'smart',
        rules: [
          { field: 'customTags', operator: 'contains', value: 'Workout' },
          { field: 'rating', operator: 'greaterThan', value: 3 }
        ]
      })
      
      const result = playlistService.evaluateSmartPlaylist(playlist, tracks)
      
      // Both track1 and track3 have Workout tag and rating > 3
      expect(result).toHaveLength(2)
      expect(result).toContain('track1')
      expect(result).toContain('track3')
    })
  })
})