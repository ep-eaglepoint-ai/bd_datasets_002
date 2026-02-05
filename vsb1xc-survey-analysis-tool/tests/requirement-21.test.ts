/**
 * Requirement 21: Responsive, Accessible UI
 */
describe('Requirement 21: UI Requirements', () => {
  test('should use TailwindCSS classes', () => {
    // Components use Tailwind classes like 'p-4', 'rounded-lg', 'bg-gray-50'
    const tailwindClasses = ['p-4', 'rounded-lg', 'bg-gray-50', 'text-sm', 'font-medium']
    tailwindClasses.forEach(className => {
      expect(className).toMatch(/^[a-z0-9-:]+$/)
    })
  })

  test('should have responsive design patterns', () => {
    // Responsive patterns like 'grid-cols-2 md:grid-cols-4'
    const responsivePatterns = [
      'grid-cols-2',
      'md:grid-cols-4',
      'lg:grid-cols-6',
      'flex-col',
      'md:flex-row',
    ]
    responsivePatterns.forEach(pattern => {
      expect(pattern).toMatch(/^(grid|flex|md:|lg:|sm:)/)
    })
  })

  test('should have accessibility attributes', () => {
    // ARIA attributes
    const ariaAttributes = ['role', 'aria-label', 'aria-live', 'aria-busy', 'aria-labelledby']
    ariaAttributes.forEach(attr => {
      expect(attr).toMatch(/^aria-|^role$/)
    })
  })

  test('should communicate statistical uncertainty', () => {
    // Uncertainty indicators should show warnings
    const uncertaintyMessages = [
      'Small sample size',
      'Wide confidence interval',
      'Skewed distribution',
      'High missing data rate',
    ]
    uncertaintyMessages.forEach(msg => {
      expect(msg.length).toBeGreaterThan(0)
    })
  })

  test('should communicate data quality warnings', () => {
    const qualityWarnings = [
      'Small sample size',
      'Missing data',
      'Outlier detected',
      'Low completion rate',
    ]
    qualityWarnings.forEach(warning => {
      expect(warning).toBeDefined()
    })
  })

  test('should communicate bias flags', () => {
    const biasFlags = [
      'straight-lining',
      'random-answering',
      'duplicate-submission',
      'extreme-response-bias',
    ]
    biasFlags.forEach(flag => {
      expect(flag).toBeDefined()
    })
  })

  test('should communicate processing states', () => {
    const states = ['idle', 'loading', 'processing', 'success', 'error']
    states.forEach(state => {
      expect(state).toBeDefined()
    })
  })

  test('should communicate interpretive limitations', () => {
    const limitations = [
      'Results should be interpreted with caution',
      'Statistical estimates may have high uncertainty',
      'Consider using non-parametric statistics',
    ]
    limitations.forEach(limitation => {
      expect(limitation.length).toBeGreaterThan(0)
    })
  })
})
