import React, { useReducer, useState, useRef, useMemo } from 'react';
import ChatSidebar from './components/ChatSidebar';
import ChatWindow from './components/ChatWindow';
import WelcomeScreen from './components/WelcomeScreen';
import SearchBar from './components/SearchBar';
import { chatReducer, initialState, CREATE_NEW_CHAT, SWITCH_CHAT, ADD_MESSAGE_TO_CHAT, DELETE_CHAT } from './reducers/chatReducer';

/**
 * Main App component for the real-time chat application
 * Manages chat conversations, messages, and UI state
 */
function App() {
  const [state, dispatch] = useReducer(chatReducer, initialState);
  const [isTyping, setIsTyping] = useState(false);

  const activeChat = state.activeConversationId ? state.conversations[state.activeConversationId] : null;

  /**
   * Handler for creating a new chat conversation
   */
  const handleNewChat = () => {
    dispatch({ type: CREATE_NEW_CHAT });
  };

  /**
   * Handler for switching to a different conversation
   * @param {string} chatId - ID of the conversation to switch to
   */
  const handleSwitchChat = (chatId) => {
    dispatch({ type: SWITCH_CHAT, payload: chatId });
  };

  /**
   * Handler for deleting a conversation
   * @param {string} chatId - ID of the conversation to delete
   */
  const handleDeleteChat = (chatId) => {
    dispatch({ type: DELETE_CHAT, payload: chatId });
  };

  /**
   * Handler for sending a message and triggering AI response
   * @param {string} text - The message text to send
   */
  const handleSendMessage = (text) => {
    if (!state.activeConversationId || !text.trim()) return;

    const message = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      text: text.trim(),
      sender: 'user',
      timestamp: new Date().toISOString()
    };

    dispatch({ type: ADD_MESSAGE_TO_CHAT, payload: { chatId: state.activeConversationId, message } });

    setIsTyping(true);
    setTimeout(() => {
      const aiMessage = {
        id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        text: `AI response to: ${text}`,
        sender: 'ai',
        timestamp: new Date().toISOString()
      };
      dispatch({ type: ADD_MESSAGE_TO_CHAT, payload: { chatId: state.activeConversationId, message: aiMessage } });
      setIsTyping(false);
    }, 1500);
  };

  /**
   * Handler for search functionality (placeholder implementation)
   * @param {string} query - Search query string
   * @param {string} scope - Search scope ('current' or 'all')
   */
  const handleSearch = (query, scope) => {
    dispatch({ type: 'SET_SEARCH', payload: { query, scope } });
  };

  const conversationList = useMemo(() => {
    return Object.values(state.conversations).sort((a, b) => new Date(b.lastMessageTime || b.createdAt) - new Date(a.lastMessageTime || a.createdAt));
  }, [state.conversations]);

  return (
    <div className="app">
      <ChatSidebar
        conversations={conversationList}
        activeConversationId={state.activeConversationId}
        onNewChat={handleNewChat}
        onSwitchChat={handleSwitchChat}
        onDeleteChat={handleDeleteChat}
      />
      <div className="main-area">
        <SearchBar onSearch={handleSearch} query={state.searchQuery} scope={state.searchScope} />
        {activeChat ? (
          <ChatWindow
            chat={activeChat}
            isTyping={isTyping}
            onSendMessage={handleSendMessage}
          />
        ) : (
          <WelcomeScreen />
        )}
      </div>
    </div>
  );
}

export default App;