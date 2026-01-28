import { render } from '@testing-library/react'
import { Progress } from '@/components/ui/Progress'

describe('Progress Component', () => {
  it('should render with basic styling', () => {
    const { container } = render(<Progress value={50} />)
    
    const progressContainer = container.firstChild
    expect(progressContainer).toHaveClass('relative', 'h-4', 'w-full', 'bg-secondary')
  })

  it('should apply custom className', () => {
    const { container } = render(<Progress value={50} className="custom-class" />)
    
    expect(container.firstChild).toHaveClass('custom-class')
  })

  it('should render progress fill element', () => {
    const { container } = render(<Progress value={75} />)
    
    const progressFill = container.querySelector('div > div')
    expect(progressFill).toBeTruthy()
  })

  it('should handle undefined value', () => {
    const { container } = render(<Progress />)
    
    const progressContainer = container.firstChild
    expect(progressContainer).toHaveClass('relative', 'h-4', 'w-full')
  })

  it('should render without errors', () => {
    expect(() => render(<Progress value={100} />)).not.toThrow()
  })
})