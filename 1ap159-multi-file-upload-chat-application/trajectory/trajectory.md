# Trajectory (Thinking Process for Refactoring)

1. I audited the original code. It used `useState` for simple message state, had no file upload capability, and lacked any progress tracking. The component was a single monolithic file with all logic embedded.

2. I identified the core challenge: transforming a simple chat app into a multi-file upload system requiring complex nested state management (`messages[].files[].uploadProgress`) with parallel uploads and real-time progress updates.

3. I migrated from `useState` to `useReducer` to handle complex nested state updates. The reducer manages messages, files, upload progress, and validation state with proper immutability patterns.
   *   **Reference**: 
       *   **[React Documentation: useReducer](https://react.dev/reference/react/useReducer)** - Recommended for complex state logic with nested updates.

4. I implemented file selection with drag-and-drop and click-to-select. Added file input handling, drag event listeners, and validation before adding files to state.
   *   **Reference**: 
       *   **[MDN: File API](https://developer.mozilla.org/en-US/docs/Web/API/File)** - Native browser APIs for file handling.
       *   **[MDN: Drag and Drop API](https://developer.mozilla.org/en-US/docs/Web/API/HTML_Drag_and_Drop_API)** - Implementation of drag-and-drop functionality.

5. I created file validation logic. Checks file type (jpg, png, gif, pdf, txt), enforces 3MB per file limit, 8MB total limit, and maximum 4 files per message. Displays error messages for violations.

6. I built a file preview component that shows selected files before sending. Displays file name (truncated), file size, and remove button. Files are stored as metadata only (not File objects) to prevent memory issues.
   *   **Reference**: 
       *   **[React Patterns: Optimistic UI](https://react.dev/learn/queueing-a-series-of-state-updates)** - Patterns for immediate user feedback.

7. I implemented parallel upload simulation using `setInterval` timers. Each file gets its own timer that starts simultaneously, updating progress every 100ms with deterministic speed calculations based on file index.
   *   **Reference**: 
       *   **[MDN: setInterval](https://developer.mozilla.org/en-US/docs/Web/API/setInterval)** - Timer API for progress simulation.
       *   **[Web Performance Best Practices](https://web.dev/rail/)** - 100ms update frequency balances smooth animation and performance.

8. I created progress tracking for individual files. Each file tracks its own progress (0-100%), upload speed (simulated 800 KB/s - 1.5 MB/s), and completion status. Progress updates are dispatched through reducer actions.
   *   **Reference**: 
       *   **[React State Updates: Batching](https://react.dev/learn/queueing-a-series-of-state-updates)** - useReducer batches updates automatically for performance.

9. I implemented optimistic UI pattern. Messages appear immediately in chat with "uploading" state. Files show progress bars during upload, and message state transitions to "complete" when all files finish.
   *   **Reference**: 
       *   **[React Patterns: Optimistic Updates](https://react.dev/learn/queueing-a-series-of-state-updates)** - Immediate UI feedback improves perceived performance.

10. I added upload progress display in sent messages. Active uploads show progress bar, percentage, and speed. Completed uploads show checkmark. Each file updates independently as it completes.

11. I implemented proper cleanup for all intervals. Intervals are stored in refs and cleared when files complete, component unmounts, or new message is sent. Prevents memory leaks.
    *   **Reference**: 
        *   **[React Documentation: useEffect Cleanup](https://react.dev/learn/synchronizing-with-effects#how-to-handle-the-effect-firing-twice-in-development)** - Proper cleanup prevents memory leaks.
        *   **[React Patterns: useRef for Intervals](https://react.dev/learn/referencing-values-with-refs)** - Using refs to track intervals for cleanup.

12. I separated concerns by extracting constants to `libs/constants.js`, utility functions to `utils/helpers.js`, and upload simulation logic to `services/uploadSimulation.js`.
    *   **Reference**: 
        *   **[Clean Code by Robert C. Martin](https://www.amazon.com/Clean-Code-Handbook-Software-Craftsmanship/dp/0132350882)** - Separation of concerns and single responsibility principle.

13. I split the monolithic component into separate components following SOLID principles: Header, MessageList, MessageItem, FilePreview, InputArea, and TypingIndicator.
    *   **Reference**: 
        *   **[SOLID Principles](https://en.wikipedia.org/wiki/SOLID)** - Single Responsibility Principle applied to component design.
        *   **[React Documentation: Components and Props](https://react.dev/learn/passing-props-to-a-component)** - Best practices for component composition.

14. I migrated from Create React App to Vite for faster build times and better developer experience. Updated build configuration and moved index.html to root.
    *   **Reference**: 
        *   **[Vite Documentation](https://vitejs.dev/)** - Official Vite guide for React applications.
        *   **[Vite Migration Guide](https://vitejs.dev/guide/migration.html)** - Best practices for migrating from CRA to Vite.

15. I integrated Tailwind CSS v4 with Vite plugin. Updated to use `@tailwindcss/vite` plugin and v4 syntax (`@import "tailwindcss"`).
    *   **Reference**: 
        *   **[Tailwind CSS v4 Documentation](https://tailwindcss.com/docs/installation/using-vite)** - Official guide for Tailwind CSS v4 with Vite.

16. I migrated state management from useReducer to Redux Toolkit for better scalability and developer tools. Created store, reducer with createSlice, and wrapped app with Provider.
    *   **Reference**: 
        *   **[Redux Toolkit Documentation](https://redux-toolkit.js.org/)** - Official guide for modern Redux patterns.
        *   **[React Redux: Hooks API](https://react-redux.js.org/api/hooks)** - Best practices for using Redux with React hooks.

17. I ensured all edge cases are handled: file count limits, size validation, parallel uploads, cleanup on unmount, rapid progress updates without race conditions, and send button disabled during uploads.

18. The solution uses useReducer (later Redux) for state, parallel setInterval timers for uploads, immutable state updates, proper cleanup, and maintains responsive UI during rapid updates.
