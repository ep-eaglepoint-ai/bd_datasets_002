import React from 'react';
import { render, screen } from '@testing-library/react';
import WelcomeScreen from '../repository_after/src/components/WelcomeScreen';

describe('WelcomeScreen', () => {
  test('renders welcome message', () => {
    render(<WelcomeScreen />);
    expect(screen.getByText('Start a conversation...')).toBeInTheDocument();
  });
});