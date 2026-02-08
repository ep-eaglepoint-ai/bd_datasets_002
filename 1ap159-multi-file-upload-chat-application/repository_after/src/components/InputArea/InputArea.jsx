import React, { useRef } from "react";
import { Send } from "lucide-react";
import { useChat, actions } from "../../state/chatContext";
import { validateSelectedFiles } from "../../utils/helpers";

export default function InputArea() {
  const { state, dispatch, startUploads, queueAssistantResponse } = useChat();
  const { inputText, selectedFiles, isTyping, isSending, error } = state;
  const fileInputRef = useRef(null);

  const canSend =
    (inputText.trim() || selectedFiles.length) && !isTyping && !isSending;

  const handleFiles = (fileList) => {
    if (!fileList?.length) return;
    const { validated, errors } = validateSelectedFiles({
      existingFiles: selectedFiles,
      nextFiles: Array.from(fileList),
    });
    if (errors.length) {
      dispatch({ type: actions.SET_ERROR, payload: errors[0] });
    } else {
      dispatch({ type: actions.CLEAR_ERROR });
    }
    validated.forEach((fileMeta) => {
      dispatch({ type: actions.ADD_SELECTED_FILE, payload: fileMeta });
    });
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
    const filesToSend = selectedFiles.map((file) => ({
      ...file,
      uploadProgress: 0,
      uploadSpeed: 0,
      isUploading: false,
      isComplete: false,
    }));

    dispatch({
      type: actions.ADD_MESSAGE,
      payload: {
        id: messageId,
        role: "user",
        content,
        files: filesToSend,
        timestamp: new Date(),
        uploadState: filesToSend.length ? "uploading" : "none",
      },
    });

    dispatch({ type: actions.SET_INPUT_TEXT, payload: "" });
    dispatch({ type: actions.CLEAR_SELECTED_FILES });
    dispatch({ type: actions.CLEAR_ERROR });
    queueAssistantResponse(messageId, content);

    if (filesToSend.length) {
      dispatch({ type: actions.SET_SENDING, payload: true });
      startUploads(messageId, filesToSend);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <>
      {/* Drop zone + textarea row */}
      <div
        onDrop={onDrop}
        onDragOver={onDragOver}
        className={`flex gap-3 items-end rounded-xl border-2 border-dashed transition-colors ${selectedFiles.length ? "border-slate-300" : "border-slate-200 hover:border-slate-300"}`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".jpg,.jpeg,.png,.gif,.pdf,.txt"
          className="hidden"
          onChange={(e) => {
            handleFiles(e.target.files);
            e.target.value = "";
          }}
        />
        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex gap-2 px-3 pt-3 pb-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isTyping || isSending}
              className="text-sm px-4 py-2 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              📎 Add Files
            </button>
            <span className="text-xs text-slate-500 self-center">
              or drag and drop here
            </span>
          </div>
          <textarea
            value={inputText}
            onChange={(e) =>
              dispatch({
                type: actions.SET_INPUT_TEXT,
                payload: e.target.value,
              })
            }
            onKeyDown={handleKeyPress}
            placeholder="Type your message..."
            rows={1}
            disabled={isTyping}
            className="w-full px-4 py-3 border-0 border-t border-slate-200 rounded-b-xl focus:outline-none focus:ring-0 resize-none disabled:bg-slate-50 disabled:cursor-not-allowed text-slate-800 placeholder-slate-400"
            style={{ minHeight: "44px", maxHeight: "120px" }}
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
      {error ? (
        <p className="text-xs text-red-500 mt-2 text-center">{error}</p>
      ) : (
        <p className="text-xs text-slate-400 mt-2 text-center">
          Press Enter to send, Shift+Enter for new line
        </p>
      )}
    </>
  );
}
