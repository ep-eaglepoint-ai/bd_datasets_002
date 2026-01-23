# Trajectory: Multi-File Upload Chat Application (1AP159)

## 1. Analysis: Deconstructing the Prompt

### 1.1 Problem Statement
Support agents need to share multiple files in a chat UI with real-time upload progress. The baseline app supports only plain text. The refactor must add concurrent multi-file uploads, progress tracking, and a responsive UI.

### 1.2 Extracted Requirements (19 Criteria)

| # | Requirement | Interpretation |
|---|-------------|----------------|
| 1 | Drag-and-drop and click-to-select | File input + `onDrop`/`onDragOver` on a zone; `accept` and validation for allowed types. |
| 2 | Formats: jpg, png, gif, pdf, txt | Regex `/\.(jpe?g|png|gif|pdf|txt)$/i` + `accept=".jpg,.jpeg,.png,.gif,.pdf,.txt"`. |
| 3 | Max 4 files per message | Reject or truncate when adding; enforce in `ADD_PENDING_FILES`. |
| 4 | Per-file ≤ 3MB | Filter in `isAllowedFile` before merging into `pendingFiles`. |
| 5 | Total ≤ 8MB per message | When merging, stop before total exceeds 8MB. |
| 6 | Independent progress per file | `fileProgress: [{ fileId, progress, speed, done }]` per message. |
| 7 | Parallel uploads | Single `tick()` advances all files; no `await` or sequential `for` over uploads. |
| 8 | Progress 0%→100% smoothly | Deterministic sim: `(uploaded / size) * 100`; CSS `transition` on width. |
| 9 | Simulated speed 800–1500 KB/s | Per-file speed from `800 + (index * 233) % 701` (KB/s); no `Math.random()`. |
| 10 | CSS transitions on progress bars | `.upload-progress-fill { transition: width 0.2s ease-out; }`. |
| 11 | Before send: preview, name (truncate), size, remove ×; no progress | Separate `pendingFiles` UI; no `fileProgress` or progress bar here. |
| 12 | After send: progress bar, %, speed, spinner | In message bubble: `Loader2` (spin), bar, `formatSpeed(prog.speed)`, `Math.round(prog.progress)%`. |
| 13 | After completion: checkmark ✓ | When `prog.done` or `uploadState === 'complete'`, show `Check` instead of `Loader2`. |
| 14 | Optimistic UI | `SEND_MESSAGE` adds the message immediately; sim runs after dispatch. |
| 15 | Send disabled while uploading | `isUploading = messages.some(m => m.uploadState === 'uploading')`; `disabled={!canSend}` with `!isUploading`. |
| 16 | Message state → "complete" when all done | `MESSAGE_UPLOAD_COMPLETE` sets `uploadState: 'complete'`. |
| 17 | useReducer for state | Single `appReducer` for `messages`, `inputText`, `isTyping`, `pendingFiles`. |
| 18 | No useState for upload or message state | Only `useReducer`; `useRef` for `messagesEndRef` and `fileInputRef` is allowed. |
| 19 | No external libs for uploads or state | Only React (`useReducer`, `useRef`, `useEffect`) and lucide-react (icons). No axios, redux, etc. |

### 1.3 Constraints That Drive Design

- **Determinism:** No `Math.random()` in GT. `generateResponse` uses `getSeedFromStr(input) % N`. Upload speeds use a deterministic formula per file index.
- **Parallelism:** `startUploadSimulation` runs one `setTimeout` loop that, each tick, updates every file’s `uploaded` and dispatches one `PROGRESS_UPDATE` with `updates: [...]` for all files. No sequential `await` per file.
- **Scope:** Only the chat UI and upload flow; no backend. Upload is simulated in the browser.

---

## 2. Strategy: Why This Shape

### 2.1 State: One useReducer

All of `messages`, `inputText`, `isTyping`, and `pendingFiles` live in one reducer to satisfy “useReducer for state” and “no useState for upload or message state.” `messages` include `files`, `uploadState`, and `fileProgress` so that:

- Optimistic message is one object.
- `PROGRESS_UPDATE` and `MESSAGE_UPLOAD_COMPLETE` only touch `messages`.
- `isUploading` is derived: `messages.some(m => m.uploadState === 'uploading')`.

### 2.2 Upload Simulation Outside the Reducer

The reducer must stay pure. `startUploadSimulation(dispatch, messageId, files)` is called from the `handleSend` handler after `SEND_MESSAGE`. It:

- Uses a fixed `UPLOAD_TICK_MS` (50ms) and, each tick, advances `uploaded[i]` by `(speed * 1024 * tick / 1000)` bytes.
- Dispatches `PROGRESS_UPDATE` with `{ messageId, updates }` where each update has `fileId`, `progress`, `speed`, `done`.
- When all files have `uploaded[i] >= size`, dispatches `MESSAGE_UPLOAD_COMPLETE` and stops the loop.

Speeds are in [800, 1500] KB/s via `800 + (i * 233) % 701` to avoid unseeded randomness.

### 2.3 Before vs After Send

- **Before send:** `pendingFiles`; UI shows name (truncated), `formatSize(size)`, and a remove (×) button. No progress, no `fileProgress`.
- **After send:** Message has `files`, `uploadState`, `fileProgress`. We render progress bar, %, speed, and spinner/check in the message bubble.

### 2.4 Drag-and-Drop and Click-to-Select

- **Click:** `<input type="file" multiple accept="...">` hidden; a button triggers `fileInputRef.current.click()`. `onChange` calls `handleFiles(e.target.files)`.
- **Drop:** A parent `div` has `onDrop` and `onDragOver` (with `preventDefault`). `onDrop` uses `e.dataTransfer.files` and the same `handleFiles` path. Validation (format, 3MB, 4 files, 8MB total) is done in `ADD_PENDING_FILES`.

---

## 3. Execution: Step-by-Step

1. **Constants and helpers**  
   `ALLOWED_EXT`, `MAX_FILES`, `MAX_FILE_BYTES`, `MAX_TOTAL_BYTES`, `SPEED_MIN_KB`, `SPEED_MAX_KB`, `UPLOAD_TICK_MS`.  
   `truncateName`, `formatSize`, `formatSpeed`, `isAllowedFile`, `getSeedFromStr`, `generateResponse`.

2. **Reducer and state**  
   `initialState`: `messages` (one assistant line), `inputText: ''`, `isTyping: false`, `pendingFiles: []`.  
   Actions: `SET_INPUT`, `SET_TYPING`, `ADD_PENDING_FILES`, `REMOVE_PENDING_FILE`, `SEND_MESSAGE`, `PROGRESS_UPDATE`, `MESSAGE_UPLOAD_COMPLETE`, `ADD_MESSAGE`.

3. **`ADD_PENDING_FILES`**  
   Map `FileList` to `{ id, file, name, size }`, filter with `isAllowedFile`. Merge into `pendingFiles` without exceeding 4 files or 8MB total (greedy add).

4. **`SEND_MESSAGE`**  
   Build `fileProgress` from `files`; set `uploadState: fileProgress.length ? 'uploading' : 'complete'`. Append message, clear `inputText` and `pendingFiles`, set `isTyping: true`. Then `startUploadSimulation(dispatch, messageId, pendingFiles)` in the handler (reducer stays pure).

5. **`PROGRESS_UPDATE`**  
   Find message by `messageId`, merge each `updates` entry into `fileProgress` by `fileId`.

6. **`MESSAGE_UPLOAD_COMPLETE`**  
   Set `message.uploadState = 'complete'`.

7. **`handleSend`**  
   If `!canSend` return.  
   `content = inputText.trim()`, `messageId = Date.now()`, `filesToSend = pendingFiles.map(...)`.  
   `dispatch(SEND_MESSAGE)`, then `startUploadSimulation(dispatch, messageId, pendingFiles)`.  
   `setTimeout` for assistant reply using `generateResponse(content)` and `ADD_MESSAGE` (delay: `1000 + getSeedFromStr(content) % 1000`).

8. **UI**  
   - **Preview:** `pendingFiles` → name (truncate), size, × → `REMOVE_PENDING_FILE`.  
   - **Drop zone:** `onDrop`, `onDragOver` on a wrapper; hidden `input` + “Add files” button for click-to-select.  
   - **Send:** `disabled={!canSend}`; `canSend = (inputText.trim() || pendingFiles.length) && !isTyping && !isUploading`.  
   - **Message bubble (user, with files):** For each file: `Loader2` (animate-spin) or `Check` when `prog.done` or `uploadState === 'complete'`; progress bar (`.upload-progress-bar`/`.upload-progress-fill` with `width: prog.progress%`), `formatSpeed(prog.speed)`, `Math.round(prog.progress)%`.

9. **CSS**  
   `App.css`: `.upload-progress-bar` (track) and `.upload-progress-fill` with `transition: width 0.2s ease-out` for smooth 0%→100%.

---

## 4. Self-Correction and Dead Ends

- **useState for “just inputText”:** Req 18 forbids useState for “upload or message state.” To avoid ambiguity, `inputText` and `isTyping` are also in the reducer.
- **Sequential “upload” per file:** Req 7 requires parallel uploads. A `for (const f of files) { await simulate(f); }` would be sequential. The chosen design uses one `tick()` that updates all files and one `PROGRESS_UPDATE` per tick.
- **Progress in `pendingFiles`:** Req 11 says no upload progress before send. So `pendingFiles` has no `progress` or `fileProgress`; those exist only on the message after `SEND_MESSAGE`.

---

## 5. Resources

- React `useReducer`: [https://react.dev/reference/react/useReducer](https://react.dev/reference/react/useReducer)
- HTML drag-and-drop: `DataTransfer.files` in `drop`; `preventDefault` on `dragover` and `drop`
- lucide-react: `Send`, `Bot`, `User`, `X`, `Loader2`, `Check` for UI and progress/complete states

---

## 6. Requirement Traceability

| Req | Implementation |
|-----|----------------|
| 1 | `onDrop`/`onDragOver` on wrapper; `<input type="file" multiple accept="...">` + “Add files” button |
| 2 | `ALLOWED_EXT`, `accept=".jpg,.jpeg,.png,.gif,.pdf,.txt"` |
| 3–5 | `ADD_PENDING_FILES`: `isAllowedFile`, then merge with `MAX_FILES` and `MAX_TOTAL_BYTES` |
| 6 | `fileProgress` per message, one entry per file |
| 7 | `startUploadSimulation` one `tick()` advancing all `uploaded[i]`, one `PROGRESS_UPDATE` per tick |
| 8 | `progress = (uploaded / size) * 100`; CSS `transition` on `.upload-progress-fill` |
| 9 | `800 + (i * 233) % 701` KB/s per file |
| 10 | `App.css`: `transition: width 0.2s ease-out` |
| 11 | `pendingFiles` UI: `truncateName`, `formatSize`, ×; no progress |
| 12 | Message: `Loader2`, bar, `formatSpeed`, `Math.round(prog.progress)%` |
| 13 | `Check` when `prog.done` or `uploadState === 'complete'` |
| 14 | `SEND_MESSAGE` adds message immediately; sim starts after |
| 15 | `canSend` includes `!isUploading`; `isUploading = messages.some(m => m.uploadState === 'uploading')` |
| 16 | `MESSAGE_UPLOAD_COMPLETE` sets `uploadState: 'complete'` |
| 17 | Single `useReducer(appReducer, initialState)` |
| 18 | No `useState`; only `useRef` for `messagesEndRef` and `fileInputRef` |
| 19 | No upload/state libraries; React + lucide-react only |
