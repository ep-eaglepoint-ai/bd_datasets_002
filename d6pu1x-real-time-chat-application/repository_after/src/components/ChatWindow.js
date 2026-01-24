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
  const messagesEndRef = useRef();

  /**
   * Scrolls the chat window to the bottom to show latest messages
   */
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView && messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(scrollToBottom, [chat.messages, isTyping]);

  return (
    <div className="chat-window">
      <MessageList messages={chat.messages} />
      {isTyping && <TypingIndicator />}
      <MessageInput onSendMessage={onSendMessage} />
      <div ref={messagesEndRef} />
    </div>
  );
}

export default ChatWindow;