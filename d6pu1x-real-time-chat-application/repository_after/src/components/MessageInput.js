import React, { useState } from 'react';

/**
 * MessageInput component provides a form for users to type and send messages
 * @param {Function} onSendMessage - Callback function to handle sending the message
 */
function MessageInput({ onSendMessage }) {
  const [text, setText] = useState('');

  /**
   * Handles form submission to send the message
   * @param {Event} e - Form submit event
   */
  const handleSubmit = (e) => {
    e.preventDefault();
    if (text.trim()) {
      onSendMessage(text);
      setText('');
    }
  };

  return (
    <form className="input-area" onSubmit={handleSubmit}>
      <input
        type="text"
        className="message-input"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Type your message..."
      />
      <button type="submit" className="send-btn">Send</button>
    </form>
  );
}

export default MessageInput;