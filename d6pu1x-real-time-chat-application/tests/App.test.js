import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../repository_after/src/App';

describe('App', () => {
  test('renders welcome screen initially', () => {
    render(<App />);
    expect(screen.getByText('Start a conversation...')).toBeInTheDocument();
  });

  test('creates new chat and switches to it', async () => {
    render(<App />);
    const newChatBtn = screen.getByText('New Chat');
    fireEvent.click(newChatBtn);
    await waitFor(() => {
      expect(screen.queryByText('Start a conversation...')).not.toBeInTheDocument();
    });
  });

  test('sends message and receives AI response', async () => {
    render(<App />);
    const newChatBtn = screen.getByText('New Chat');
    fireEvent.click(newChatBtn);

    const input = screen.getByPlaceholderText('Type your message...');
    const sendBtn = screen.getByText('Send');

    await act(async () => {
      await userEvent.type(input, 'Hello');
    });
    fireEvent.click(sendBtn);

    expect(screen.getAllByText('Hello').length).toBeGreaterThan(0);

    await waitFor(() => {
      expect(screen.getAllByText('AI response to: Hello').length).toBeGreaterThan(0);
    }, { timeout: 2000 });
  });

  test('switches between chats', async () => {
    render(<App />);
    const newChatBtn = screen.getByText('New Chat');
    fireEvent.click(newChatBtn);

    const input = screen.getByPlaceholderText('Type your message...');
    await act(async () => {
      await userEvent.type(input, 'First message');
    });
    fireEvent.click(screen.getByText('Send'));

    fireEvent.click(newChatBtn); // Create second chat

    await act(async () => {
      await userEvent.type(input, 'Second message');
    });
    fireEvent.click(screen.getByText('Send'));

    const chats = screen.getAllByText(/Chat \d+/);
    expect(chats.length).toBe(2);

    // Switch back to first chat
    fireEvent.click(chats[1]);
    expect(screen.getAllByText('First message').length).toBeGreaterThan(0);
  });

  test('deletes active chat and switches to another', async () => {
    render(<App />);
    const newChatBtn = screen.getByText('New Chat');
    fireEvent.click(newChatBtn);
    fireEvent.click(newChatBtn); // Two chats

    const deleteBtns = screen.getAllByText('×');
    fireEvent.click(deleteBtns[0]);

    expect(screen.getAllByText(/Chat \d+/).length).toBe(1);
  });

  test('shows typing indicator during AI response', async () => {
    render(<App />);
    const newChatBtn = screen.getByText('New Chat');
    fireEvent.click(newChatBtn);

    const input = screen.getByPlaceholderText('Type your message...');
    await act(async () => {
      await userEvent.type(input, 'Test');
    });
    fireEvent.click(screen.getByText('Send'));

    expect(screen.getByText('AI')).toBeInTheDocument(); // Typing indicator shows AI avatar
  });
});