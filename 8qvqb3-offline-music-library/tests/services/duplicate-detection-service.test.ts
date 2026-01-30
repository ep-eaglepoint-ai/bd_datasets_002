import { duplicateDetectionService } from '@/lib/services/duplicate-detection-service'
import { TrackMetadata } from '@/lib/types/music'

describe('DuplicateDetectionService', () => {
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

  it('should handle empty tracks array', async () => {
    const result = await duplicateDetectionService.detectDuplicates([])
    expect(result).toEqual([])
  })

  it('should handle null/undefined tracks', async () => {
    const result = await duplicateDetectionService.detectDuplicates(null as any)
    expect(result).toEqual([])
  })

  it('should detect exact duplicates by file hash', async () => {
    const tracks = [
      createMockTrack({ id: 'track1', fileHash: 'same-hash' }),
      createMockTrack({ id: 'track2', fileHash: 'same-hash' }),
    ]

    const result = await duplicateDetectionService.detectDuplicates(tracks)
    
    expect(result).toHaveLength(1)
    expect(result[0].duplicateType).toBe('exact')
    expect(result[0].trackIds).toContain('track1')
    expect(result[0].trackIds).toContain('track2')
  })

  it('should detect metadata duplicates', async () => {
    const tracks = [
      createMockTrack({ 
        id: 'track1', 
        title: 'Same Song',
        artist: 'Same Artist',
        album: 'Same Album',
        fileHash: 'hash1'
      }),
      createMockTrack({ 
        id: 'track2', 
        title: 'Same Song',
        artist: 'Same Artist',
        album: 'Same Album',
        fileHash: 'hash2'
      }),
    ]

    const result = await duplicateDetectionService.detectDuplicates(tracks)
    
    expect(result.length).toBeGreaterThan(0)
    const metadataDuplicate = result.find(g => g.duplicateType === 'metadata')
    expect(metadataDuplicate).toBeDefined()
  })

  it('should handle tracks without fileHash', async () => {
    const tracks = [
      createMockTrack({ id: 'track1', fileHash: undefined as any }),
      createMockTrack({ id: 'track2', fileHash: undefined as any }),
    ]

    const result = await duplicateDetectionService.detectDuplicates(tracks)
    
    // Should not crash and should return some result
    expect(Array.isArray(result)).toBe(true)
  })

  it('should provide recommendations for duplicate groups', () => {
    const group = {
      id: 'group1',
      trackIds: ['track1', 'track2'],
      similarityScore: 1.0,
      duplicateType: 'exact' as const,
      resolved: false,
    }

    const tracks = [
      createMockTrack({ id: 'track1', bitrate: 128 }),
      createMockTrack({ id: 'track2', bitrate: 320 }),
    ]

    const recommendation = duplicateDetectionService.getRecommendedAction(group, tracks)
    
    expect(recommendation.action).toBe('keep_highest_quality')
    expect(recommendation.recommendedTrackId).toBe('track2') // Higher bitrate
  })

  it('should handle invalid group data gracefully', () => {
    const recommendation = duplicateDetectionService.getRecommendedAction(null as any, [])
    
    expect(recommendation.action).toBe('manual_review')
    expect(recommendation.reason).toBe('Invalid group or tracks data')
  })
})