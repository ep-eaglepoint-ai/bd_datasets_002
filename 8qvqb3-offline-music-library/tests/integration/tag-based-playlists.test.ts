import { playlistService } from '@/lib/services/playlist-service'
import { TrackMetadata, Playlist } from '@/lib/types/music'

describe('Tag-Based Playlists Integration', () => {
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

  it('should create tag-based playlists for tracks with tags', async () => {
    const tracks = [
      createMockTrack({ id: 'track1', customTags: ['Workout', 'Rock'] }),
      createMockTrack({ id: 'track2', customTags: ['Chill'] }),
    ]
    
    const existingPlaylists: Playlist[] = []
    
    const tagBasedPlaylists = await playlistService.createTagBasedPlaylists(tracks, existingPlaylists)
    
    expect(tagBasedPlaylists).toHaveLength(3) // Workout, Rock, Chill
    
    const workoutPlaylist = tagBasedPlaylists.find(p => p.name === '🏷️ Workout')
    const rockPlaylist = tagBasedPlaylists.find(p => p.name === '🏷️ Rock')
    const chillPlaylist = tagBasedPlaylists.find(p => p.name === '🏷️ Chill')
    
    expect(workoutPlaylist).toBeDefined()
    expect(workoutPlaylist!.type).toBe('smart')
    expect(workoutPlaylist!.trackIds).toContain('track1')
    
    expect(rockPlaylist).toBeDefined()
    expect(rockPlaylist!.trackIds).toContain('track1')
    
    expect(chillPlaylist).toBeDefined()
    expect(chillPlaylist!.trackIds).toContain('track2')
  })

  it('should update existing tag-based playlists when tracks change', async () => {
    const tracks = [
      createMockTrack({ id: 'track1', customTags: ['Workout'] }),
      createMockTrack({ id: 'track2', customTags: ['Workout'] }),
    ]
    
    const existingPlaylists: Playlist[] = [{
      id: 'existing1',
      name: '🏷️ Workout',
      type: 'smart',
      rules: [{ field: 'customTags', operator: 'contains', value: 'Workout' }],
      trackIds: ['track1'], // Only has track1 initially
      dateCreated: new Date(),
      dateModified: new Date(),
      sortBy: 'dateAdded',
      sortOrder: 'desc',
    }]
    
    const updatedPlaylists = await playlistService.createTagBasedPlaylists(tracks, existingPlaylists)
    
    expect(updatedPlaylists).toHaveLength(1)
    expect(updatedPlaylists[0].id).toBe('existing1') // Same playlist ID
    expect(updatedPlaylists[0].trackIds).toEqual(['track1', 'track2']) // Updated with both tracks
  })

  it('should distinguish between manual and tag-based playlists', () => {
    const manualPlaylist: Playlist = {
      id: 'manual1',
      name: 'My Manual Playlist',
      type: 'manual',
      rules: [],
      trackIds: [],
      dateCreated: new Date(),
      dateModified: new Date(),
      sortBy: 'dateAdded',
      sortOrder: 'desc',
    }
    
    const tagPlaylist: Playlist = {
      id: 'tag1',
      name: '🏷️ Workout',
      type: 'smart',
      rules: [{ field: 'customTags', operator: 'contains', value: 'Workout' }],
      trackIds: [],
      dateCreated: new Date(),
      dateModified: new Date(),
      sortBy: 'dateAdded',
      sortOrder: 'desc',
    }
    
    expect(playlistService.isTagBasedPlaylist(manualPlaylist)).toBe(false)
    expect(playlistService.isTagBasedPlaylist(tagPlaylist)).toBe(true)
    
    expect(playlistService.getTagFromPlaylist(manualPlaylist)).toBe(null)
    expect(playlistService.getTagFromPlaylist(tagPlaylist)).toBe('Workout')
  })

  it('should clean up orphaned tag playlists', () => {
    const tracks = [
      createMockTrack({ id: 'track1', customTags: ['Workout'] }),
    ]

    const existingPlaylists: Playlist[] = [
      {
        id: 'playlist1',
        name: '🏷️ Workout',
        type: 'smart',
        rules: [],
        trackIds: [],
        dateCreated: new Date(),
        dateModified: new Date(),
        sortBy: 'dateAdded',
        sortOrder: 'desc',
      },
      {
        id: 'playlist2',
        name: '🏷️ Chill',
        type: 'smart',
        rules: [],
        trackIds: [],
        dateCreated: new Date(),
        dateModified: new Date(),
        sortBy: 'dateAdded',
        sortOrder: 'desc',
      },
      {
        id: 'playlist3',
        name: 'Manual Playlist',
        type: 'manual',
        rules: [],
        trackIds: [],
        dateCreated: new Date(),
        dateModified: new Date(),
        sortBy: 'dateAdded',
        sortOrder: 'desc',
      },
    ]
    
    const orphanedIds = playlistService.cleanupOrphanedTagPlaylists(tracks, existingPlaylists)
    
    expect(orphanedIds).toEqual(['playlist2']) // Only the Chill playlist should be orphaned
  })
})