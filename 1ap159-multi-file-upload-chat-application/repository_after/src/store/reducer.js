import { createSlice } from '@reduxjs/toolkit';
import { initialState, MAX_FILES, MAX_TOTAL_BYTES } from '../libs/constants';
import { isAllowedFile } from '../utils/helpers';

const chatSlice = createSlice({
  name: 'chat',
  initialState,
  reducers: {
    setInput: (state, action) => {
      state.inputText = action.payload;
    },
    setTyping: (state, action) => {
      state.isTyping = action.payload;
    },
    addPendingFiles: (state, action) => {
      const list = Array.from(action.payload || []);
      const valid = list
        .filter(isAllowedFile)
        .map((file, i) => ({ id: `f-${Date.now()}-${i}`, file, name: file.name, size: file.size }));
      let current = [...state.pendingFiles];
      const totalSoFar = () => current.reduce((s, x) => s + x.size, 0);
      for (const f of valid) {
        if (current.length >= MAX_FILES) break;
        if (totalSoFar() + f.size > MAX_TOTAL_BYTES) break;
        current.push(f);
      }
      state.pendingFiles = current;
    },
    removePendingFile: (state, action) => {
      state.pendingFiles = state.pendingFiles.filter(f => f.id !== action.payload);
    },
    sendMessage: (state, action) => {
      const { messageId, content, files } = action.payload;
      const fileProgress = (files || []).map(f => ({ fileId: f.id, progress: 0, speed: 0, done: false }));
      const newMsg = {
        id: messageId,
        role: 'user',
        content: content || '',
        files: (files || []).map(({ id, name, size }) => ({ id, name, size })),
        uploadState: fileProgress.length ? 'uploading' : 'complete',
        fileProgress
      };
      state.messages.push(newMsg);
      state.inputText = '';
      state.pendingFiles = [];
      state.isTyping = true;
    },
    progressUpdate: (state, action) => {
      const { messageId, updates } = action.payload;
      const message = state.messages.find(m => m.id === messageId);
      if (message && message.fileProgress) {
        message.fileProgress = message.fileProgress.map(p => {
          const u = (updates || []).find(x => x.fileId === p.fileId);
          if (!u) return p;
          return { ...p, progress: u.progress, speed: u.speed, done: !!u.done };
        });
      }
    },
    messageUploadComplete: (state, action) => {
      const message = state.messages.find(m => m.id === action.payload);
      if (message) {
        message.uploadState = 'complete';
      }
    },
    addMessage: (state, action) => {
      state.messages.push(action.payload);
      state.isTyping = false;
    }
  }
});

export const {
  setInput,
  setTyping,
  addPendingFiles,
  removePendingFile,
  sendMessage,
  progressUpdate,
  messageUploadComplete,
  addMessage
} = chatSlice.actions;

export default chatSlice.reducer;
