import React from 'react';

/**
 * TypingIndicator component displays an animated indicator when the AI is typing a response
 * Shows the AI avatar with animated dots to indicate ongoing activity
 */
function TypingIndicator() {
  return (
    <div className="typing-indicator">
      <div className="message-avatar">AI</div>
      <div className="typing-dots">
        <div className="dot"></div>
        <div className="dot"></div>
        <div className="dot"></div>
      </div>
    </div>
  );
}

export default TypingIndicator;