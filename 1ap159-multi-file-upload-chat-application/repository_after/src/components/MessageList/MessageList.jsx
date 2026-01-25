import React, { useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import MessageItem from '../MessageItem/MessageItem';
import TypingIndicator from '../TypingIndicator/TypingIndicator';

export default function MessageList() {
  const messages = useSelector((state) => state.chat.messages);
  const isTyping = useSelector((state) => state.chat.isTyping);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  return (
    <div className="flex-1 overflow-y-auto px-4 py-6">
      <div className="max-w-3xl mx-auto space-y-4">
        {messages.map((message) => (
          <MessageItem key={message.id} message={message} />
        ))}

        {isTyping && <TypingIndicator />}
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
}
