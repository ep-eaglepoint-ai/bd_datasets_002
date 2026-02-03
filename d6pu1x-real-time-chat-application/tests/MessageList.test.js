import React from 'react';
import { render, screen } from '@testing-library/react';
import MessageList from '../repository_after/src/components/MessageList';

describe('MessageList', () => {
  test('renders messages correctly', () => {
    const messages = [
      { id: '1', text: 'Hello', sender: 'user', timestamp: '2023-01-01T10:00:00Z' },
      { id: '2', text: 'Hi there', sender: 'ai', timestamp: '2023-01-01T10:00:05Z' }
    ];
    render(<MessageList messages={messages} />);

    expect(screen.getByText('Hello')).toBeInTheDocument();
    expect(screen.getByText('Hi there')).toBeInTheDocument();
  });

  test('groups consecutive messages from same sender within 2 minutes', () => {
    const messages = [
      { id: '1', text: 'Hello', sender: 'user', timestamp: '2023-01-01T10:00:00Z' },
      { id: '2', text: 'How are you?', sender: 'user', timestamp: '2023-01-01T10:00:30Z' },
      { id: '3', text: 'Hi', sender: 'ai', timestamp: '2023-01-01T10:01:00Z' }
    ];
    render(<MessageList messages={messages} />);

    // Should have one group for user with two messages
    expect(screen.getAllByText('Hello').length).toBe(1);
    expect(screen.getByText('How are you?')).toBeInTheDocument();
    expect(screen.getByText('Hi')).toBeInTheDocument();
  });

  test('does not group messages from same sender after 2 minutes', () => {
    const messages = [
      { id: '1', text: 'Hello', sender: 'user', timestamp: '2023-01-01T10:00:00Z' },
      { id: '2', text: 'How are you?', sender: 'user', timestamp: '2023-01-01T10:03:00Z' }
    ];
    render(<MessageList messages={messages} />);

    // Should have two separate groups
    expect(screen.getAllByText('Hello').length).toBe(1);
    expect(screen.getByText('How are you?')).toBeInTheDocument();
  });
});