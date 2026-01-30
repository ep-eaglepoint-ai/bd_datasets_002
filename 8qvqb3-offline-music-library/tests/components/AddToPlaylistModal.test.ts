import { playlistService } from '@/lib/services/playlist-service'
import { Playlist, TrackMetadata } from '@/lib/types/music'

describe('AddToPlaylistModal Logic', () => {
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

  describe('Playlist filtering for select menu', () => {
    it('should filter out tag-based playlists from manual playlists', () => {
      const playlists = [
        createMockPlaylist({ id: 'manual1', name: 'My Playlist', type: 'manual' }),
        createMockPlaylist({ id: 'tag1', name: '🏷️ Workout', type: 'smart' }),
        createMockPlaylist({ id: 'manual2', name: 'Another Playlist', type: 'manual' }),
        createMockPlaylist({ id: 'tag2', name: '🏷️ Chill', type: 'smart' }),
      ]

      const manualPlaylists = playlists.filter(p => 
        p.type === 'manual' && !playlistService.isTagBasedPlaylist(p)
      )

      expect(manualPlaylists).toHaveLength(2)
      expect(manualPlaylists.map(p => p.id)).toEqual(['manual1', 'manual2'])
    })

    it('should calculate playlist info correctly', () => {
      const trackIds = ['track1', 'track2', 'track3']
      const playlist = createMockPlaylist({
        trackIds: ['track1', 'track4'] // track1 already exists, track4 is different
      })

      const tracksInPlaylist = trackIds.filter(id => playlist.trackIds.includes(id)).length
      const newTracks = trackIds.length - tracksInPlaylist

      expect(tracksInPlaylist).toBe(1) // Only track1 is already in playlist
      expect(newTracks).toBe(2) // track2 and track3 are new
    })

    it('should handle duplicate prevention logic', () => {
      const trackIds = ['track1', 'track2', 'track3']
      const playlist = createMockPlaylist({
        trackIds: ['track1', 'track2'] // track1 and track2 already exist
      })

      const existingTrackIds = new Set(playlist.trackIds)
      const newTrackIds = trackIds.filter(id => !existingTrackIds.has(id))

      expect(newTrackIds).toEqual(['track3']) // Only track3 is new
    })

    it('should detect when all tracks are already in playlist', () => {
      const trackIds = ['track1', 'track2']
      const playlist = createMockPlaylist({
        trackIds: ['track1', 'track2', 'track3'] // All tracks already exist
      })

      const existingTrackIds = new Set(playlist.trackIds)
      const newTrackIds = trackIds.filter(id => !existingTrackIds.has(id))

      expect(newTrackIds).toHaveLength(0) // No new tracks to add
    })
  })

  describe('Select menu option formatting', () => {
    it('should format playlist options correctly', () => {
      const playlist = createMockPlaylist({
        name: 'My Workout Playlist',
        trackIds: ['track1', 'track2', 'track3']
      })

      const trackIds = ['track4', 'track5']
      const tracksInPlaylist = trackIds.filter(id => playlist.trackIds.includes(id)).length
      
      const optionText = `${playlist.name} (${playlist.trackIds.length} tracks)${
        tracksInPlaylist > 0 ? ` • ${tracksInPlaylist} already added` : ''
      }`

      expect(optionText).toBe('My Workout Playlist (3 tracks)')
    })

    it('should show already added tracks in option text', () => {
      const playlist = createMockPlaylist({
        name: 'My Playlist',
        trackIds: ['track1', 'track2', 'track3']
      })

      const trackIds = ['track1', 'track4'] // track1 already exists
      const tracksInPlaylist = trackIds.filter(id => playlist.trackIds.includes(id)).length
      
      const optionText = `${playlist.name} (${playlist.trackIds.length} tracks)${
        tracksInPlaylist > 0 ? ` • ${tracksInPlaylist} already added` : ''
      }`

      expect(optionText).toBe('My Playlist (3 tracks) • 1 already added')
    })
  })
})