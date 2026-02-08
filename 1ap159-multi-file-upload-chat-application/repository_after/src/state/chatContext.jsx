import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
} from "react";
import { MAX_FILES } from "../libs/constants";
import {
  startUploadSimulation,
  clearAllUploadIntervals,
} from "../services/uploadSimulation";
import { generateResponse, getSeedFromStr } from "../utils/helpers";

export const actions = {
  ADD_MESSAGE: "ADD_MESSAGE",
  SET_INPUT_TEXT: "SET_INPUT_TEXT",
  ADD_SELECTED_FILE: "ADD_SELECTED_FILE",
  REMOVE_SELECTED_FILE: "REMOVE_SELECTED_FILE",
  CLEAR_SELECTED_FILES: "CLEAR_SELECTED_FILES",
  START_FILE_UPLOAD: "START_FILE_UPLOAD",
  UPDATE_FILE_PROGRESS: "UPDATE_FILE_PROGRESS",
  COMPLETE_FILE_UPLOAD: "COMPLETE_FILE_UPLOAD",
  COMPLETE_MESSAGE_UPLOAD: "COMPLETE_MESSAGE_UPLOAD",
  SET_TYPING: "SET_TYPING",
  SET_SENDING: "SET_SENDING",
  SET_ERROR: "SET_ERROR",
  CLEAR_ERROR: "CLEAR_ERROR",
};

export const initialState = {
  messages: [
    {
      id: 1,
      role: "assistant",
      content: "Hello! Send me messages and attach files. Watch them upload!",
      files: [],
      timestamp: new Date(),
      uploadState: "complete",
    },
  ],
  inputText: "",
  selectedFiles: [],
  isTyping: false,
  isSending: false,
  error: "",
};

function updateMessageFiles(messages, messageId, updater) {
  return messages.map((message) => {
    if (message.id !== messageId) return message;
    return updater(message);
  });
}

function getUploadState(files) {
  if (!files?.length) return "none";
  if (files.every((file) => file.isComplete)) return "complete";
  return "uploading";
}

export function chatReducer(state, action) {
  switch (action.type) {
    case actions.SET_INPUT_TEXT:
      return { ...state, inputText: action.payload };
    case actions.SET_TYPING:
      return { ...state, isTyping: action.payload };
    case actions.SET_SENDING:
      return { ...state, isSending: action.payload };
    case actions.SET_ERROR:
      return { ...state, error: action.payload };
    case actions.CLEAR_ERROR:
      return { ...state, error: "" };
    case actions.ADD_SELECTED_FILE: {
      if (state.selectedFiles.length >= MAX_FILES) return state;
      return {
        ...state,
        selectedFiles: [...state.selectedFiles, action.payload],
      };
    }
    case actions.REMOVE_SELECTED_FILE:
      return {
        ...state,
        selectedFiles: state.selectedFiles.filter(
          (file) => file.id !== action.payload,
        ),
      };
    case actions.CLEAR_SELECTED_FILES:
      return { ...state, selectedFiles: [] };
    case actions.ADD_MESSAGE:
      return { ...state, messages: [...state.messages, action.payload] };
    case actions.START_FILE_UPLOAD: {
      const { messageId, fileId } = action.payload;
      const messages = updateMessageFiles(
        state.messages,
        messageId,
        (message) => {
          const files = message.files.map((file) =>
            file.id === fileId
              ? { ...file, isUploading: true, uploadProgress: 0 }
              : file,
          );
          return { ...message, files, uploadState: getUploadState(files) };
        },
      );
      return { ...state, messages };
    }
    case actions.UPDATE_FILE_PROGRESS: {
      const { messageId, fileId, progress, speed } = action.payload;
      const messages = updateMessageFiles(
        state.messages,
        messageId,
        (message) => {
          const files = message.files.map((file) =>
            file.id === fileId
              ? {
                  ...file,
                  uploadProgress: progress,
                  uploadSpeed: speed,
                  isUploading: true,
                }
              : file,
          );
          return { ...message, files, uploadState: getUploadState(files) };
        },
      );
      return { ...state, messages };
    }
    case actions.COMPLETE_FILE_UPLOAD: {
      const { messageId, fileId } = action.payload;
      const messages = updateMessageFiles(
        state.messages,
        messageId,
        (message) => {
          const files = message.files.map((file) =>
            file.id === fileId
              ? {
                  ...file,
                  uploadProgress: 100,
                  isUploading: false,
                  isComplete: true,
                }
              : file,
          );
          return { ...message, files, uploadState: getUploadState(files) };
        },
      );
      return { ...state, messages };
    }
    case actions.COMPLETE_MESSAGE_UPLOAD: {
      const { messageId } = action.payload;
      const messages = updateMessageFiles(
        state.messages,
        messageId,
        (message) => {
          const files = message.files.map((file) => ({
            ...file,
            uploadProgress: 100,
            isUploading: false,
            isComplete: true,
          }));
          return { ...message, files, uploadState: "complete" };
        },
      );
      const hasUploading = messages.some(
        (message) => message.uploadState === "uploading",
      );
      return { ...state, messages, isSending: hasUploading };
    }
    default:
      return state;
  }
}

const ChatContext = createContext(null);

export function ChatProvider({ children }) {
  const [state, dispatch] = useReducer(chatReducer, initialState);
  const uploadIntervalsRef = useRef(new Map());
  const pendingResponsesRef = useRef(new Map());
  const respondedRef = useRef(new Set());

  useEffect(() => {
    return () => {
      clearAllUploadIntervals(uploadIntervalsRef);
    };
  }, []);

  useEffect(() => {
    state.messages.forEach((message) => {
      if (message.role !== "user") return;
      if (message.uploadState !== "complete" && message.uploadState !== "none")
        return;
      if (!pendingResponsesRef.current.has(message.id)) return;
      if (respondedRef.current.has(message.id)) return;

      respondedRef.current.add(message.id);
      const content = pendingResponsesRef.current.get(message.id);
      pendingResponsesRef.current.delete(message.id);
      dispatch({ type: actions.SET_TYPING, payload: true });
      const delay = 800 + (getSeedFromStr(content || "") % 700);
      setTimeout(() => {
        dispatch({
          type: actions.ADD_MESSAGE,
          payload: {
            id: Date.now() + 1,
            role: "assistant",
            content: generateResponse(content || ""),
            files: [],
            timestamp: new Date(),
            uploadState: "complete",
          },
        });
        dispatch({ type: actions.SET_TYPING, payload: false });
      }, delay);
    });
  }, [state.messages]);

  const api = useMemo(() => {
    return {
      state,
      dispatch,
      startUploads(messageId, files) {
        if (!files.length) return;
        startUploadSimulation({
          dispatch,
          messageId,
          files,
          uploadIntervalsRef,
        });
      },
      queueAssistantResponse(messageId, content) {
        pendingResponsesRef.current.set(messageId, content);
      },
    };
  }, [state]);

  return <ChatContext.Provider value={api}>{children}</ChatContext.Provider>;
}

export function useChat() {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error("useChat must be used within ChatProvider");
  }
  return context;
}
