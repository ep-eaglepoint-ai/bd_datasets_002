import React, { useEffect, useRef } from "react";
import MessageItem from "../MessageItem/MessageItem";
import TypingIndicator from "../TypingIndicator/TypingIndicator";
import { useChat } from "../../state/chatContext";

export default function MessageList() {
  const { state } = useChat();
  const { messages, isTyping } = state;
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
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
