import React from 'react';

/**
 * ChatSidebar component displays the list of conversations and provides controls for managing chats
 * @param {Array} conversations - Array of conversation objects
 * @param {string} activeConversationId - ID of the currently active conversation
 * @param {Function} onNewChat - Callback to create a new chat
 * @param {Function} onSwitchChat - Callback to switch to a different chat
 * @param {Function} onDeleteChat - Callback to delete a chat
 */
function ChatSidebar({ conversations, activeConversationId, onNewChat, onSwitchChat, onDeleteChat }) {
  /**
   * Helper function to check if a chat is currently active
   * @param {string} chatId - ID of the chat to check
   * @returns {boolean} True if the chat is active
   */
  const isActive = (chatId) => chatId === activeConversationId;

  return (
    <div className="sidebar">
      {/* Button to create a new chat conversation */}
      <button className="new-chat-btn" onClick={onNewChat}>New Chat</button>
      <div className="chat-list">
        {/* Render each conversation as a clickable item */}
        {conversations.map(chat => (
          <div
            key={chat.id}
            className={`chat-item ${chat.id === activeConversationId ? 'active' : ''}`}
            onClick={() => onSwitchChat(chat.id)}
          >
            <div className="chat-preview">
              {/* Display chat number and title */}
              <div className="chat-title">Chat {chat.number}</div>
              {/* Display last message or placeholder text */}
              <div className="chat-last-msg">{chat.lastMessage || 'No messages yet'}</div>
              {/* Display timestamp of last activity */}
              <div className="chat-timestamp">
                {chat.lastMessageTime ? new Date(chat.lastMessageTime).toLocaleTimeString() : new Date(chat.createdAt).toLocaleTimeString()}
              </div>
            </div>
            {/* Delete button with event propagation prevention */}
            <button
              className="delete-btn"
              onClick={(e) => {
                e.stopPropagation();
                onDeleteChat(chat.id);
              }}
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default ChatSidebar;