import { inferColumnTypes, validateData } from '@/lib/parser'

describe('CSV Parser - Simple Tests', () => {
  describe('inferColumnTypes', () => {
    it('should infer number type', () => {
      const data = [
        { age: '25' },
        { age: '30' },
        { age: '35' },
      ]

      const columns = inferColumnTypes(data)

      expect(columns.find(c => c.name === 'age')?.type).toBe('number')
    })

    it('should infer boolean type', () => {
      const data = [
        { active: 'true' },
        { active: 'false' },
        { active: 'true' },
      ]

      const columns = inferColumnTypes(data)

      expect(columns.find(c => c.name === 'active')?.type).toBe('boolean')
    })

    it('should infer string type as fallback', () => {
      const data = [
        { mixed: 'unique1' },
        { mixed: 'unique2' },
        { mixed: 'unique3' },
      ]

      const columns = inferColumnTypes(data)

      expect(columns.find(c => c.name === 'mixed')?.type).toBe('categorical')
    })
  })

  describe('validateData', () => {
    it('should validate clean data', () => {
      const data = [
        { name: 'John', age: 25 },
        { name: 'Jane', age: 30 },
      ]

      const result = validateData(data)

      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should handle large datasets', () => {
      const largeData = Array.from({ length: 1000 }, (_, i) => ({
        id: i,
        value: `value${i}`,
      }))

      const result = validateData(largeData)

      expect(result.isValid).toBe(true)
      expect(result.rowCount).toBe(1000)
    })
  })
})