// --- Constants ---
export const ALLOWED_EXT = /\.(jpe?g|png|gif|pdf|txt)$/i;
export const MAX_FILES = 4;
export const MAX_FILE_BYTES = 3 * 1024 * 1024;
export const MAX_TOTAL_BYTES = 8 * 1024 * 1024;
export const SPEED_MIN_KB = 800;
export const SPEED_MAX_KB = 1500;
export const UPLOAD_TICK_MS = 50;

export const initialState = {
  messages: [
    { id: 1, role: 'assistant', content: 'Hello! I\'m here to help. What would you like to talk about?' }
  ],
  inputText: '',
  isTyping: false,
  pendingFiles: []  // { id, file, name, size }
};
