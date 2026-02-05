import { render } from '@testing-library/react'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'

describe('LoadingSpinner Component', () => {
  it('should render with default size', () => {
    const { container } = render(<LoadingSpinner />)
    
    const spinner = container.firstChild
    expect(spinner).toHaveClass('h-6', 'w-6') // default md size
  })

  it('should render with small size', () => {
    const { container } = render(<LoadingSpinner size="sm" />)
    
    const spinner = container.firstChild
    expect(spinner).toHaveClass('h-4', 'w-4')
  })

  it('should apply custom className', () => {
    const { container } = render(<LoadingSpinner className="custom-class" />)
    
    const spinner = container.firstChild
    expect(spinner).toHaveClass('custom-class')
  })

  it('should have spinning animation', () => {
    const { container } = render(<LoadingSpinner />)
    
    const spinner = container.firstChild
    expect(spinner).toHaveClass('animate-spin')
  })

  it('should render without errors', () => {
    expect(() => render(<LoadingSpinner />)).not.toThrow()
  })
})