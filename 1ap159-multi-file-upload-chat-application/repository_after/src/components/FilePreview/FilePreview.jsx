import React from "react";
import { X } from "lucide-react";
import { useChat, actions } from "../../state/chatContext";
import { truncateName, formatSize, getTotalSize } from "../../utils/helpers";

export default function FilePreview() {
  const { state, dispatch } = useChat();
  const { selectedFiles } = state;

  if (selectedFiles.length === 0) return null;
  const totalSize = getTotalSize(selectedFiles);

  return (
    <div className="mb-2 p-2 bg-slate-50 rounded-lg border border-slate-200">
      <div className="flex flex-wrap gap-2">
        {selectedFiles.map((f) => (
          <div
            key={f.id}
            className="flex items-center gap-1.5 bg-white px-2 py-1.5 rounded border border-slate-200 text-slate-700 text-sm"
          >
            <span className="max-w-[140px] truncate" title={f.name}>
              {truncateName(f.name, 20)}
            </span>
            <span className="text-slate-400 flex-shrink-0">
              {formatSize(f.size)}
            </span>
            <button
              type="button"
              onClick={() =>
                dispatch({ type: actions.REMOVE_SELECTED_FILE, payload: f.id })
              }
              className="p-0.5 rounded hover:bg-slate-200 flex-shrink-0"
              aria-label="Remove"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
      <div className="mt-2 text-xs text-slate-500">
        Total: {formatSize(totalSize)} / 8 MB
      </div>
    </div>
  );
}
