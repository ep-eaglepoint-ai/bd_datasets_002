import {
  generateId,
  formatBytes,
  formatNumber,
  calculateChecksum,
  cn,
} from '@/lib/utils'

describe('Utils', () => {
  describe('generateId', () => {
    it('should generate a unique string ID', () => {
      const id1 = generateId()
      const id2 = generateId()
      
      expect(typeof id1).toBe('string')
      expect(typeof id2).toBe('string')
      expect(id1).not.toBe(id2)
      expect(id1.length).toBeGreaterThan(0)
    })
  })

  describe('formatBytes', () => {
    it('should format bytes correctly', () => {
      expect(formatBytes(0)).toBe('0 Bytes')
      expect(formatBytes(1024)).toBe('1 KB')
      expect(formatBytes(1024 * 1024)).toBe('1 MB')
      expect(formatBytes(1536)).toBe('1.5 KB')
    })
  })

  describe('formatNumber', () => {
    it('should format numbers with suffixes', () => {
      expect(formatNumber(0)).toBe('0')
      expect(formatNumber(999)).toBe('999.00')
      expect(formatNumber(1000)).toBe('1.00K')
      expect(formatNumber(1000000)).toBe('1.00M')
    })
  })

  describe('calculateChecksum', () => {
    it('should generate consistent checksums for same data', () => {
      const data = { test: 'value', number: 123 }
      const checksum1 = calculateChecksum(data)
      const checksum2 = calculateChecksum(data)
      
      expect(checksum1).toBe(checksum2)
      expect(typeof checksum1).toBe('string')
    })
  })

  describe('cn (className utility)', () => {
    it('should merge class names', () => {
      expect(cn('class1', 'class2')).toBe('class1 class2')
      expect(cn('base', true && 'conditional', false && 'hidden')).toBe('base conditional')
    })
  })
})