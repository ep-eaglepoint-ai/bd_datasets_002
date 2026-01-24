import React, { useReducer, useState, useRef, useMemo } from 'react';
import ChatSidebar from './components/ChatSidebar';
import ChatWindow from './components/ChatWindow';
import WelcomeScreen from './components/WelcomeScreen';
import SearchBar from './components/SearchBar';

/**
 * Action types for the chat reducer
 */
const CREATE_NEW_CHAT = 'CREATE_NEW_CHAT';
const SWITCH_CHAT = 'SWITCH_CHAT';
const ADD_MESSAGE_TO_CHAT = 'ADD_MESSAGE_TO_CHAT';
const DELETE_CHAT = 'DELETE_CHAT';

/**
 * Initial state for the chat application
 */
const initialState = {
  conversations: {}, // Object storing all chat conversations by ID
  activeConversationId: null, // ID of the currently active conversation
  searchQuery: '', // Current search query string
  searchScope: 'current', // Search scope: 'current' or 'all'
  chatCounter: 0 // Counter for generating sequential chat numbers
};

/**
 * Reducer function to manage chat application state
 * @param {Object} state - Current state
 * @param {Object} action - Action object with type and payload
 * @returns {Object} New state
 */
function chatReducer(state, action) {
  switch (action.type) {
    case CREATE_NEW_CHAT: {
      // Generate unique ID and sequential number for new chat
      const id = `chat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const number = state.chatCounter + 1;
      const newChat = {
        id,
        number,
        createdAt: new Date().toISOString(),
        messages: [],
        lastMessage: '',
        lastMessageTime: ''
      };
      return {
        ...state,
        conversations: { ...state.conversations, [id]: newChat },
        activeConversationId: id,
        chatCounter: number
      };
    }
    case SWITCH_CHAT:
      // Switch to a different active conversation
      return { ...state, activeConversationId: action.payload };
    case ADD_MESSAGE_TO_CHAT: {
      // Add a message to a specific conversation and update metadata
      const { chatId, message } = action.payload;
      const chat = state.conversations[chatId];
      if (!chat) return state;
      const updatedChat = {
        ...chat,
        messages: [...chat.messages, message],
        lastMessage: message.text,
        lastMessageTime: message.timestamp
      };
      return {
        ...state,
        conversations: { ...state.conversations, [chatId]: updatedChat }
      };
    }
    case DELETE_CHAT: {
      // Remove a conversation and update active conversation if necessary
      const { [action.payload]: deleted, ...rest } = state.conversations;
      const remainingIds = Object.keys(rest);
      let newActiveId = state.activeConversationId;
      if (state.activeConversationId === action.payload) {
        newActiveId = remainingIds.length > 0 ? remainingIds[0] : null;
      }
      return {
        ...state,
        conversations: rest,
        activeConversationId: newActiveId
      };
    }
    case 'SET_SEARCH':
      // Update search query and scope
      return { ...state, searchQuery: action.payload.query, searchScope: action.payload.scope };
    default:
      return state;
  }
}

/**
 * Main App component for the real-time chat application
 * Manages chat conversations, messages, and UI state
 */
function App() {
  // State management using useReducer for complex state logic
  const [state, dispatch] = useReducer(chatReducer, initialState);
  // Typing indicator state for AI responses
  const [isTyping, setIsTyping] = useState(false);
  // Ref for input focus management (currently unused)
  const inputRef = useRef();

  // Get the currently active conversation object
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

    // Create and dispatch user message
    const message = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      text: text.trim(),
      sender: 'user',
      timestamp: new Date().toISOString()
    };

    dispatch({ type: ADD_MESSAGE_TO_CHAT, payload: { chatId: state.activeConversationId, message } });

    // Simulate AI response with typing indicator
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

  // Memoized sorted list of conversations by last activity
  const conversationList = useMemo(() => {
    return Object.values(state.conversations).sort((a, b) => new Date(b.lastMessageTime || b.createdAt) - new Date(a.lastMessageTime || a.createdAt));
  }, [state.conversations]);

  return (
    <div className="app">
      {/* Sidebar with chat list and controls */}
      <ChatSidebar
        conversations={conversationList}
        activeConversationId={state.activeConversationId}
        onNewChat={handleNewChat}
        onSwitchChat={handleSwitchChat}
        onDeleteChat={handleDeleteChat}
      />
      {/* Main content area */}
      <div className="main-area">
        {/* Search bar for filtering messages */}
        <SearchBar onSearch={handleSearch} query={state.searchQuery} scope={state.searchScope} />
        {/* Conditional rendering: Chat window or welcome screen */}
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