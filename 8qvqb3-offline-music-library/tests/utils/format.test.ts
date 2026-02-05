import { 
  formatDuration, 
  formatBitrate, 
  formatFileSize, 
  formatRating,
  formatTrackNumber,
  formatFileFormat
} from '@/lib/utils/format'

describe('Format Utils', () => {
  describe('formatDuration', () => {
    it('should format seconds to MM:SS', () => {
      expect(formatDuration(65)).toBe('1:05')
      expect(formatDuration(125)).toBe('2:05')
      expect(formatDuration(3661)).toBe('1:01:01') // Hours format
    })

    it('should handle zero duration', () => {
      expect(formatDuration(0)).toBe('0:00')
    })

    it('should handle negative duration', () => {
      expect(formatDuration(-10)).toBe('0:00')
    })
  })

  describe('formatBitrate', () => {
    it('should format bitrate with kbps suffix', () => {
      expect(formatBitrate(320)).toBe('320 kbps')
      expect(formatBitrate(128)).toBe('128 kbps')
    })

    it('should handle undefined bitrate', () => {
      expect(formatBitrate(undefined)).toBe('Unknown')
    })
  })

  describe('formatFileSize', () => {
    it('should format bytes to human readable', () => {
      expect(formatFileSize(1024)).toBe('1 KB')
      expect(formatFileSize(1048576)).toBe('1 MB')
      expect(formatFileSize(1073741824)).toBe('1 GB')
    })

    it('should handle small sizes', () => {
      expect(formatFileSize(500)).toBe('500 B')
    })

    it('should handle zero size', () => {
      expect(formatFileSize(0)).toBe('0 B')
    })
  })

  describe('formatRating', () => {
    it('should format rating as stars', () => {
      expect(formatRating(5)).toBe('★★★★★')
      expect(formatRating(3)).toBe('★★★☆☆')
      expect(formatRating(0)).toBe('☆☆☆☆☆')
    })

    it('should handle undefined rating', () => {
      expect(formatRating(undefined)).toBe('☆☆☆☆☆')
    })
  })

  describe('formatTrackNumber', () => {
    it('should format track number with leading zero', () => {
      expect(formatTrackNumber(1)).toBe('01')
      expect(formatTrackNumber(10)).toBe('10')
    })

    it('should handle undefined track number', () => {
      expect(formatTrackNumber(undefined)).toBe('')
    })
  })

  describe('formatFileFormat', () => {
    it('should format file format in uppercase', () => {
      expect(formatFileFormat('mp3')).toBe('MP3')
      expect(formatFileFormat('flac')).toBe('FLAC')
    })

    it('should handle undefined format', () => {
      expect(formatFileFormat(undefined)).toBe('Unknown')
    })
  })
})