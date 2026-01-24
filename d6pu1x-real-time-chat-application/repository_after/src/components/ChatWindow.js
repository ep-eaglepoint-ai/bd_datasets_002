import React, { useState, useRef, useEffect } from 'react';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import TypingIndicator from './TypingIndicator';

/**
 * ChatWindow component renders the active chat conversation with messages and input
 * @param {Object} chat - The active chat conversation object
 * @param {boolean} isTyping - Whether the AI is currently typing a response
 * @param {Function} onSendMessage - Callback to send a new message
 */
function ChatWindow({ chat, isTyping, onSendMessage }) {
  // Reference to the end of messages for auto-scrolling
  const messagesEndRef = useRef();

  /**
   * Scrolls the chat window to the bottom to show latest messages
   */
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView && messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
  };

  // Auto-scroll when new messages arrive or typing state changes
  useEffect(scrollToBottom, [chat.messages, isTyping]);

  return (
    <div className="chat-window">
      {/* Display the list of messages in the conversation */}
      <MessageList messages={chat.messages} />
      {/* Show typing indicator when AI is responding */}
      {isTyping && <TypingIndicator />}
      {/* Input form for sending new messages */}
      <MessageInput onSendMessage={onSendMessage} />
      {/* Invisible element for scrolling reference */}
      <div ref={messagesEndRef} />
    </div>
  );
}

export default ChatWindow;