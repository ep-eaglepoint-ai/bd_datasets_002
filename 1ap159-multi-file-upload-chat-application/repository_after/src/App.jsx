import React, { useReducer, useRef, useEffect } from 'react';
import { Send, Bot, User, X, Loader2, Check } from 'lucide-react';
import './App.css';

// --- Constants ---
const ALLOWED_EXT = /\.(jpe?g|png|gif|pdf|txt)$/i;
const MAX_FILES = 4;
const MAX_FILE_BYTES = 3 * 1024 * 1024;
const MAX_TOTAL_BYTES = 8 * 1024 * 1024;
const SPEED_MIN_KB = 800;
const SPEED_MAX_KB = 1500;
const UPLOAD_TICK_MS = 50;

// --- Reducer ---
const initialState = {
  messages: [
    { id: 1, role: 'assistant', content: 'Hello! I\'m here to help. What would you like to talk about?' }
  ],
  inputText: '',
  isTyping: false,
  pendingFiles: []  // { id, file, name, size }
};

function truncateName(name, max = 24) {
  if (name.length <= max) return name;
  const ext = name.slice(name.lastIndexOf('.'));
  const base = name.slice(0, name.length - ext.length);
  if (base.length <= 4) return name.slice(0, max - 3) + '...';
  return base.slice(0, max - ext.length - 3) + '...' + ext;
}

function formatSize(bytes) {
  if (bytes >= 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  return (bytes / 1024).toFixed(2) + ' KB';
}

function formatSpeed(kbPerSec) {
  if (kbPerSec >= 1024) return (kbPerSec / 1024).toFixed(1) + ' MB/s';
  return (kbPerSec | 0) + ' KB/s';
}

function isAllowedFile(file) {
  return ALLOWED_EXT.test(file.name) && file.size <= MAX_FILE_BYTES;
}

function getSeedFromStr(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function generateResponse(userInput) {
  const input = userInput.toLowerCase();
  if (input.includes('hello') || input.includes('hi')) return 'Hello! How can I assist you today?';
  if (input.includes('how are you')) return 'I\'m doing well, thank you for asking! How can I help you?';
  if (input.includes('help')) return 'I\'m here to help! You can ask me questions, and I\'ll do my best to provide useful responses.';
  if (input.includes('bye') || input.includes('goodbye')) return 'Goodbye! Feel free to come back anytime you need assistance.';
  if (input.includes('name')) return 'I\'m a minimal chat assistant, built to demonstrate conversational UI patterns.';
  if (input.includes('weather')) return 'I don\'t have access to real-time weather data, but I recommend checking a weather service for accurate forecasts!';
  if (input.includes('time')) return `The current time is ${new Date().toLocaleTimeString()}.`;
  if (input.includes('date')) return `Today's date is ${new Date().toLocaleDateString()}.`;
  const choices = [
    'That\'s an interesting question. Could you tell me more?',
    'I understand. What else would you like to know?',
    'Thanks for sharing that. How can I help you further?',
    'I see. Is there anything specific you\'d like assistance with?',
    'That\'s a good point. What are your thoughts on this?'
  ];
  return choices[getSeedFromStr(userInput) % choices.length];
}

function appReducer(state, action) {
  switch (action.type) {
    case 'SET_INPUT':
      return { ...state, inputText: action.payload };

    case 'SET_TYPING':
      return { ...state, isTyping: action.payload };

    case 'ADD_PENDING_FILES': {
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
      return { ...state, pendingFiles: current };
    }

    case 'REMOVE_PENDING_FILE':
      return { ...state, pendingFiles: state.pendingFiles.filter(f => f.id !== action.payload) };

    case 'SEND_MESSAGE': {
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
      return {
        ...state,
        messages: [...state.messages, newMsg],
        inputText: '',
        pendingFiles: [],
        isTyping: true
      };
    }

    case 'PROGRESS_UPDATE': {
      const { messageId, updates } = action.payload;
      return {
        ...state,
        messages: state.messages.map(m => {
          if (m.id !== messageId) return m;
          const next = m.fileProgress.map(p => {
            const u = (updates || []).find(x => x.fileId === p.fileId);
            if (!u) return p;
            return { ...p, progress: u.progress, speed: u.speed, done: !!u.done };
          });
          return { ...m, fileProgress: next };
        })
      };
    }

    case 'MESSAGE_UPLOAD_COMPLETE':
      return {
        ...state,
        messages: state.messages.map(m =>
          m.id === action.payload ? { ...m, uploadState: 'complete' } : m
        )
      };

    case 'ADD_MESSAGE':
      return { ...state, messages: [...state.messages, action.payload], isTyping: false };

    default:
      return state;
  }
}

// --- Upload simulation: parallel, smooth 0-100, speed in [800,1500] KB/s (deterministic per file index) ---
function startUploadSimulation(dispatch, messageId, files) {
  if (!files.length) return;
  const speeds = files.map((_, i) => SPEED_MIN_KB + (i * 233) % (SPEED_MAX_KB - SPEED_MIN_KB + 1)); // KB/s
  const uploaded = files.map(() => 0);

  function tick() {
    let allDone = true;
    const updates = [];
    files.forEach((f, i) => {
      if (uploaded[i] >= f.size) {
        updates.push({ fileId: f.id, progress: 100, speed: speeds[i], done: true });
        return;
      }
      allDone = false;
      const chunk = Math.min(f.size - uploaded[i], (speeds[i] * 1024 * UPLOAD_TICK_MS) / 1000);
      uploaded[i] += chunk;
      const progress = Math.min(100, (uploaded[i] / f.size) * 100);
      updates.push({ fileId: f.id, progress, speed: speeds[i], done: uploaded[i] >= f.size });
    });
    dispatch({ type: 'PROGRESS_UPDATE', payload: { messageId, updates } });
    if (allDone) {
      dispatch({ type: 'MESSAGE_UPLOAD_COMPLETE', payload: messageId });
      return;
    }
    setTimeout(tick, UPLOAD_TICK_MS);
  }
  tick();
}

// --- Component ---
export default function MinimalChatApp() {
  const [state, dispatch] = useReducer(appReducer, initialState);
  const { messages, inputText, isTyping, pendingFiles } = state;
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  const isUploading = messages.some(m => m.uploadState === 'uploading');
  const canSend = (inputText.trim() || pendingFiles.length) && !isTyping && !isUploading;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const handleFiles = (fileList) => {
    if (!fileList?.length) return;
    dispatch({ type: 'ADD_PENDING_FILES', payload: fileList });
  };

  const onDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    handleFiles(e.dataTransfer?.files);
  };

  const onDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleSend = () => {
    if (!canSend) return;
    const content = inputText.trim();
    const messageId = Date.now();
    const filesToSend = pendingFiles.map(({ id, name, size }) => ({ id, name, size }));
    dispatch({ type: 'SEND_MESSAGE', payload: { messageId, content, files: filesToSend } });
    startUploadSimulation(dispatch, messageId, pendingFiles);

    setTimeout(() => {
      dispatch({ type: 'ADD_MESSAGE', payload: { id: Date.now() + 1, role: 'assistant', content: generateResponse(content || '') } });
    }, 1000 + (getSeedFromStr(content || '') % 1000));
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
            <Bot className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-slate-800">Chat Assistant</h1>
            <p className="text-sm text-slate-500">Always here to help</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="max-w-3xl mx-auto space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex gap-3 ${message.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                message.role === 'user' ? 'bg-gradient-to-br from-green-400 to-emerald-600' : 'bg-gradient-to-br from-blue-400 to-purple-600'
              }`}>
                {message.role === 'user' ? <User className="w-5 h-5 text-white" /> : <Bot className="w-5 h-5 text-white" />}
              </div>
              <div className={`max-w-lg px-4 py-3 rounded-2xl ${
                message.role === 'user' ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white' : 'bg-white text-slate-800 shadow-sm border border-slate-200'
              }`}>
                {message.content ? <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p> : null}
                {message.files?.length ? (
                  <div className="mt-2 space-y-2">
                    {message.files.map((f) => {
                      const prog = message.fileProgress?.find(p => p.fileId === f.id) || {};
                      const done = prog.done || message.uploadState === 'complete';
                      return (
                        <div key={f.id} className="flex items-center gap-2">
                          {!done ? (
                            <Loader2 className="w-4 h-4 flex-shrink-0 animate-spin" />
                          ) : (
                            <Check className="w-4 h-4 flex-shrink-0" />
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-xs truncate">{truncateName(f.name)}</span>
                              {!done && prog.speed != null ? (
                                <span className="text-xs flex-shrink-0">{formatSpeed(prog.speed)}</span>
                              ) : null}
                            </div>
                            {!done ? (
                              <div className="upload-progress-bar mt-0.5">
                                <div className="upload-progress-fill" style={{ width: `${prog.progress || 0}%` }} />
                              </div>
                            ) : null}
                            {!done && prog.progress != null ? (
                              <span className="text-xs">{Math.round(prog.progress)}%</span>
                            ) : null}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            </div>
          ))}

          {isTyping && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-purple-600 flex items-center justify-center flex-shrink-0">
                <Bot className="w-5 h-5 text-white" />
              </div>
              <div className="bg-white px-4 py-3 rounded-2xl shadow-sm border border-slate-200">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area: drop zone + preview + textarea + send */}
      <div className="bg-white border-t border-slate-200 px-4 py-4 shadow-lg">
        <div className="max-w-3xl mx-auto">
          {/* File preview (before send): name, size, remove; no progress */}
          {pendingFiles.length > 0 && (
            <div className="mb-2 p-2 bg-slate-50 rounded-lg border border-slate-200">
              <div className="flex flex-wrap gap-2">
                {pendingFiles.map((f) => (
                  <div key={f.id} className="flex items-center gap-1.5 bg-white px-2 py-1.5 rounded border border-slate-200 text-slate-700 text-sm">
                    <span className="max-w-[140px] truncate" title={f.name}>{truncateName(f.name, 20)}</span>
                    <span className="text-slate-400 flex-shrink-0">{formatSize(f.size)}</span>
                    <button
                      type="button"
                      onClick={() => dispatch({ type: 'REMOVE_PENDING_FILE', payload: f.id })}
                      className="p-0.5 rounded hover:bg-slate-200 flex-shrink-0"
                      aria-label="Remove"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Drop zone + textarea row */}
          <div
            onDrop={onDrop}
            onDragOver={onDragOver}
            className={`flex gap-3 items-end rounded-xl border-2 border-dashed transition-colors ${pendingFiles.length ? 'border-slate-300' : 'border-slate-200 hover:border-slate-300'}`}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".jpg,.jpeg,.png,.gif,.pdf,.txt"
              className="hidden"
              onChange={(e) => { handleFiles(e.target.files); e.target.value = ''; }}
            />
            <div className="flex-1 flex flex-col min-w-0">
              <div className="flex gap-2 px-2 pt-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isTyping || isUploading}
                  className="text-xs px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Add files (jpg, png, gif, pdf, txt · max 4, 3MB each, 8MB total)
                </button>
                <span className="text-xs text-slate-400 self-center">or drag and drop</span>
              </div>
              <textarea
                value={inputText}
                onChange={(e) => dispatch({ type: 'SET_INPUT', payload: e.target.value })}
                onKeyDown={handleKeyPress}
                placeholder="Type your message..."
                rows={1}
                disabled={isTyping}
                className="w-full px-4 py-3 border-0 border-t border-slate-200 rounded-b-xl focus:outline-none focus:ring-0 resize-none disabled:bg-slate-50 disabled:cursor-not-allowed text-slate-800 placeholder-slate-400"
                style={{ minHeight: '44px', maxHeight: '120px' }}
              />
            </div>
            <button
              onClick={handleSend}
              disabled={!canSend}
              className="mb-2 px-5 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl hover:from-blue-600 hover:to-blue-700 disabled:from-slate-300 disabled:to-slate-400 disabled:cursor-not-allowed transition-all duration-200 shadow-md hover:shadow-lg active:scale-95 flex items-center gap-2 font-medium"
            >
              <Send className="w-5 h-5" />
              <span className="hidden sm:inline">Send</span>
            </button>
          </div>
          <p className="text-xs text-slate-400 mt-2 text-center">Press Enter to send, Shift+Enter for new line</p>
        </div>
      </div>
    </div>
  );
}
