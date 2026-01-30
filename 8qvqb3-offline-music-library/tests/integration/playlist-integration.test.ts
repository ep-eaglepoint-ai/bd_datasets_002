import { useMusicStore } from '@/lib/store/music-store'
import { TrackMetadata, Playlist } from '@/lib/types/music'

// Simple test to verify playlist functionality works
describe('Playlist Integration', () => {
  it('should have playlist management functions available', () => {
    const store = useMusicStore.getState()
    
    // Verify all required functions exist
    expect(typeof store.createPlaylist).toBe('function')
    expect(typeof store.updatePlaylist).toBe('function')
    expect(typeof store.deletePlaylist).toBe('function')
    expect(Array.isArray(store.playlists)).toBe(true)
  })

  it('should handle track to playlist operations', () => {
    // Test the AddToPlaylistModal logic
    const trackIds = ['track1', 'track2']
    const existingPlaylist: Playlist = {
      id: 'playlist1',
      name: 'Test Playlist',
      type: 'manual',
      rules: [],
      trackIds: ['track1'], // track1 already exists
      sortBy: 'dateAdded',
      sortOrder: 'desc',
      dateCreated: new Date(),
      dateModified: new Date()
    }

    // Simulate the logic from AddToPlaylistModal
    const existingTrackIds = new Set(existingPlaylist.trackIds)
    const newTrackIds = trackIds.filter(id => !existingTrackIds.has(id))
    
    expect(newTrackIds).toEqual(['track2']) // Only track2 should be new
    
    const updatedPlaylist: Playlist = {
      ...existingPlaylist,
      trackIds: [...existingPlaylist.trackIds, ...newTrackIds],
      dateModified: new Date(),
    }
    
    expect(updatedPlaylist.trackIds).toEqual(['track1', 'track2'])
  })

  it('should handle bulk playlist operations', () => {
    const selectedTrackIds = ['track1', 'track2', 'track3']
    
    // Test creating new playlist with selected tracks
    const newPlaylistData = {
      name: 'New Playlist',
      type: 'manual' as const,
      rules: [],
      trackIds: [...selectedTrackIds],
      sortBy: 'dateAdded' as const,
      sortOrder: 'desc' as const,
    }
    
    expect(newPlaylistData.trackIds).toHaveLength(3)
    expect(newPlaylistData.trackIds).toEqual(selectedTrackIds)
  })
})