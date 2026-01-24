import React from 'react';

/**
 * TypingIndicator component displays an animated indicator when the AI is typing a response
 * Shows the AI avatar with animated dots to indicate ongoing activity
 */
function TypingIndicator() {
  return (
    <div className="typing-indicator">
      {/* AI avatar indicator */}
      <div className="message-avatar">AI</div>
      {/* Animated dots container */}
      <div className="typing-dots">
        <div className="dot"></div>
        <div className="dot"></div>
        <div className="dot"></div>
      </div>
    </div>
  );
}

export default TypingIndicator;