import React from 'react';

/**
 * WelcomeScreen component displays a welcome message when no chat is active
 * Provides initial guidance to users on how to start using the chat application
 */
function WelcomeScreen() {
  return (
    <div className="welcome-screen">
      <div className="welcome-message">
        Start a conversation...
      </div>
    </div>
  );
}

export default WelcomeScreen;