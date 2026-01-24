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
  conversations: {},
  activeConversationId: null,
  searchQuery: '',
  searchScope: 'current',
  chatCounter: 0
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
      return { ...state, activeConversationId: action.payload };
    case ADD_MESSAGE_TO_CHAT: {
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
      return { ...state, searchQuery: action.payload.query, searchScope: action.payload.scope };
    default:
      return state;
  }
}

export { chatReducer, initialState };