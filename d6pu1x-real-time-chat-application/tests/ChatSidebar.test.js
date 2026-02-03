import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import ChatSidebar from '../repository_after/src/components/ChatSidebar';

describe('ChatSidebar', () => {
  const mockConversations = [
    {
      id: 'chat_1',
      number: 1,
      createdAt: '2023-01-01T10:00:00Z',
      messages: [],
      lastMessage: 'Hello',
      lastMessageTime: '2023-01-01T10:00:00Z'
    },
    {
      id: 'chat_2',
      number: 2,
      createdAt: '2023-01-01T11:00:00Z',
      messages: [],
      lastMessage: '',
      lastMessageTime: ''
    }
  ];

  test('renders conversations', () => {
    const mockOnNewChat = jest.fn();
    const mockOnSwitchChat = jest.fn();
    const mockOnDeleteChat = jest.fn();

    render(
      <ChatSidebar
        conversations={mockConversations}
        activeConversationId="chat_1"
        onNewChat={mockOnNewChat}
        onSwitchChat={mockOnSwitchChat}
        onDeleteChat={mockOnDeleteChat}
      />
    );

    expect(screen.getByText('Chat 1')).toBeInTheDocument();
    expect(screen.getByText('Hello')).toBeInTheDocument();
    expect(screen.getByText('New Chat')).toBeInTheDocument();
  });

  test('calls onNewChat when New Chat button is clicked', () => {
    const mockOnNewChat = jest.fn();
    const mockOnSwitchChat = jest.fn();
    const mockOnDeleteChat = jest.fn();

    render(
      <ChatSidebar
        conversations={mockConversations}
        activeConversationId={null}
        onNewChat={mockOnNewChat}
        onSwitchChat={mockOnSwitchChat}
        onDeleteChat={mockOnDeleteChat}
      />
    );

    fireEvent.click(screen.getByText('New Chat'));
    expect(mockOnNewChat).toHaveBeenCalled();
  });

  test('calls onSwitchChat when conversation is clicked', () => {
    const mockOnNewChat = jest.fn();
    const mockOnSwitchChat = jest.fn();
    const mockOnDeleteChat = jest.fn();

    render(
      <ChatSidebar
        conversations={mockConversations}
        activeConversationId={null}
        onNewChat={mockOnNewChat}
        onSwitchChat={mockOnSwitchChat}
        onDeleteChat={mockOnDeleteChat}
      />
    );

    fireEvent.click(screen.getByText('Chat 1'));
    expect(mockOnSwitchChat).toHaveBeenCalledWith('chat_1');
  });

  test('calls onDeleteChat when delete button is clicked', () => {
    const mockOnNewChat = jest.fn();
    const mockOnSwitchChat = jest.fn();
    const mockOnDeleteChat = jest.fn();

    render(
      <ChatSidebar
        conversations={mockConversations}
        activeConversationId="chat_1"
        onNewChat={mockOnNewChat}
        onSwitchChat={mockOnSwitchChat}
        onDeleteChat={mockOnDeleteChat}
      />
    );

    const deleteBtn = screen.getAllByText('×')[0];
    fireEvent.click(deleteBtn);
    expect(mockOnDeleteChat).toHaveBeenCalledWith('chat_1');
  });

  test('highlights active conversation', () => {
    const mockOnNewChat = jest.fn();
    const mockOnSwitchChat = jest.fn();
    const mockOnDeleteChat = jest.fn();

    render(
      <ChatSidebar
        conversations={mockConversations}
        activeConversationId="chat_1"
        onNewChat={mockOnNewChat}
        onSwitchChat={mockOnSwitchChat}
        onDeleteChat={mockOnDeleteChat}
      />
    );

    const activeItem = screen.getByText('Chat 1').closest('.chat-item');
    expect(activeItem).toHaveClass('active');
  });
});