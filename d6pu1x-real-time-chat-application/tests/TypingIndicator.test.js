import React from 'react';
import { render, screen } from '@testing-library/react';
import TypingIndicator from '../repository_after/src/components/TypingIndicator';

describe('TypingIndicator', () => {
  test('renders typing indicator with AI avatar and dots', () => {
    const { container } = render(<TypingIndicator />);
    expect(screen.getByText('AI')).toBeInTheDocument();
    expect(screen.getByText('AI').closest('.message-avatar')).toBeInTheDocument();
    const dots = container.querySelectorAll('.dot');
    expect(dots.length).toBe(3);
  });
});