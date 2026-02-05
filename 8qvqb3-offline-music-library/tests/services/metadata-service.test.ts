import { metadataService } from '@/lib/services/metadata-service'

describe('MetadataService', () => {
  describe('extractMetadata', () => {
    it('should handle files without metadata gracefully', async () => {
      // Create a mock file
      const mockFile = new File([''], 'test.mp3', { type: 'audio/mpeg' })
      
      const result = await metadataService.extractMetadata(mockFile)
      
      expect(result).toBeDefined()
      expect(result.title).toBe('test')
      expect(result.fileFormat).toBe('mp3')
      expect(result.fileSize).toBe(0)
    })

    it('should generate unique IDs for tracks', async () => {
      const mockFile1 = new File([''], 'test1.mp3', { type: 'audio/mpeg' })
      const mockFile2 = new File([''], 'test2.mp3', { type: 'audio/mpeg' })
      
      const result1 = await metadataService.extractMetadata(mockFile1)
      const result2 = await metadataService.extractMetadata(mockFile2)
      
      expect(result1.id).not.toBe(result2.id)
    })
  })

  describe('calculateFileHash', () => {
    it('should use fallback hash for test environment', async () => {
      const content = 'test content'
      const file = new File([content], 'test.mp3', { type: 'audio/mpeg' })
      
      const hash = await metadataService.calculateFileHash(file)
      
      // In test environment, it should use the fallback hash format
      expect(hash).toMatch(/^\d+-\d+-\d+$/)
    })

    it('should generate different fallback hashes for different files', async () => {
      const file1 = new File(['content1'], 'test1.mp3', { type: 'audio/mpeg' })
      const file2 = new File(['different content'], 'test2.mp3', { type: 'audio/mpeg' })
      
      const hash1 = await metadataService.calculateFileHash(file1)
      const hash2 = await metadataService.calculateFileHash(file2)
      
      expect(hash1).not.toBe(hash2)
    })
  })
})