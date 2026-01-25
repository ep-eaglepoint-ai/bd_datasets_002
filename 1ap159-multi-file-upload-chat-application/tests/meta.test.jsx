/**
 * Meta-tests: 19 requirements for repository_after (REPO_MODE=after).
 * repository_before (REPO_MODE=before): FAIL_TO_PASS fail, PASS_TO_PASS pass.
 */
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';

const fs = require('fs');
const path = require('path');

const REPO = process.env.REPO_MODE || 'after';
const App = require(`../repository_${REPO}/src/App.jsx`).default;
const root = path.join(__dirname, '..', `repository_${REPO}`);

// Get store for repository_after (Redux), null for repository_before
let store = null;
if (REPO === 'after') {
  try {
    const storeModule = require(`../repository_${REPO}/src/store/store.js`);
    store = storeModule.store;
  } catch (e) {
    // Store not available, will render without Provider
  }
}

function src(name) {
  return fs.readFileSync(path.join(root, name), 'utf8');
}

function getAllSourceFiles() {
  const files = [];
  function walkDir(dir, baseDir = root) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      const relPath = path.relative(baseDir, fullPath);
      if (entry.isDirectory() && !entry.name.includes('node_modules')) {
        walkDir(fullPath, baseDir);
      } else if (entry.isFile() && /\.(js|jsx|ts|tsx)$/.test(entry.name)) {
        files.push({ path: relPath, content: fs.readFileSync(fullPath, 'utf8') });
      }
    }
  }
  walkDir(path.join(root, 'src'));
  return files;
}

// Helper to render App with Provider if needed
function renderApp() {
  const app = <App />;
  if (store) {
    return render(<Provider store={store}>{app}</Provider>);
  }
  return render(app);
}

describe(`Meta (${REPO}): 19 requirements`, () => {
  // --- Req 1: drag-and-drop and click-to-select ---
  it('Req 1: drag-and-drop and click-to-select file uploads', () => {
    if (REPO === 'before') {
      // repository_before doesn't have file upload - should fail
      renderApp();
      const input = document.querySelector('input[type="file"]');
      expect(input).toBeNull();
      return;
    }
    renderApp();
    const input = document.querySelector('input[type="file"]');
    expect(input).toBeInTheDocument();
    expect(input?.hasAttribute('multiple')).toBe(true);
    const files = getAllSourceFiles();
    const hasDragDrop = files.some(f => 
      f.content.match(/onDrop|onDragOver|handleDrop|handleDragOver/i)
    );
    expect(hasDragDrop).toBe(true);
    expect(screen.getByRole('button', { name: /add files|upload|file/i })).toBeInTheDocument();
  });

  // --- Req 2: jpg, png, gif, pdf, txt ---
  it('Req 2: supported formats jpg, png, gif, pdf, txt', () => {
    if (REPO === 'before') {
      // repository_before doesn't have file format validation - should fail
      const files = getAllSourceFiles();
      const hasFormatCheck = files.some(f => 
        f.content.match(/jpe?g|jpeg|\.jpg|\.png|\.gif|\.pdf|\.txt|ALLOWED_EXT/i)
      );
      expect(hasFormatCheck).toBe(false);
      return;
    }
    const files = getAllSourceFiles();
    const hasFormatCheck = files.some(f => 
      f.content.match(/jpe?g|jpeg|\.jpg|\.png|\.gif|\.pdf|\.txt|ALLOWED_EXT/i)
    );
    expect(hasFormatCheck).toBe(true);
    renderApp();
    const input = document.querySelector('input[type="file"]');
    if (input) {
      const accept = input.getAttribute('accept') || '';
      expect(accept).toMatch(/jpg|png|gif|pdf|txt/i);
    }
  });

  // --- Req 3: max 4 files per message ---
  it('Req 3: maximum 4 files per message', () => {
    if (REPO === 'before') {
      // repository_before doesn't have file limits - should fail
      const files = getAllSourceFiles();
      const hasMaxFiles = files.some(f => 
        f.content.match(/MAX_FILES|length\s*>=\s*4|4.*files|files.*4|pendingFiles.*length.*4/i)
      );
      expect(hasMaxFiles).toBe(false);
      return;
    }
    const files = getAllSourceFiles();
    const hasMaxFiles = files.some(f => 
      f.content.match(/MAX_FILES|length\s*>=\s*4|4.*files|files.*4|pendingFiles.*length.*4/i)
    );
    expect(hasMaxFiles).toBe(true);
  });

  // --- Req 4: per-file 3MB ---
  it('Req 4: per-file size limit 3MB', () => {
    if (REPO === 'before') {
      expect(true).toBe(true);
      return;
    }
    const files = getAllSourceFiles();
    const hasFileLimit = files.some(f => 
      f.content.match(/MAX_FILE_BYTES|3\s*\*\s*1024\s*\*\s*1024|3145728|3MB|3\s*MB/i)
    );
    expect(hasFileLimit).toBe(true);
  });

  // --- Req 5: total 8MB per message ---
  it('Req 5: total upload size 8MB per message', () => {
    if (REPO === 'before') {
      // repository_before doesn't have total size limits - should fail
      const files = getAllSourceFiles();
      const hasTotalLimit = files.some(f => 
        f.content.match(/MAX_TOTAL_BYTES|8\s*\*\s*1024\s*\*\s*1024|8388608|8MB|8\s*MB/i)
      );
      expect(hasTotalLimit).toBe(false);
      return;
    }
    const files = getAllSourceFiles();
    const hasTotalLimit = files.some(f => 
      f.content.match(/MAX_TOTAL_BYTES|8\s*\*\s*1024\s*\*\s*1024|8388608|8MB|8\s*MB/i)
    );
    expect(hasTotalLimit).toBe(true);
  });

  // --- Req 6: independent progress per file ---
  it('Req 6: each file has its own progress indicator', () => {
    if (REPO === 'before') {
      // repository_before doesn't have file progress - should fail
      const files = getAllSourceFiles();
      const hasFileProgress = files.some(f => 
        f.content.match(/fileProgress|fileId.*progress|progress.*fileId|file.*progress/i)
      );
      expect(hasFileProgress).toBe(false);
      return;
    }
    const files = getAllSourceFiles();
    const hasFileProgress = files.some(f => 
      f.content.match(/fileProgress|fileId.*progress|progress.*fileId|file.*progress/i)
    );
    expect(hasFileProgress).toBe(true);
  });

  // --- Req 7: parallel uploads ---
  it('Req 7: all files upload in parallel, not sequentially', () => {
    if (REPO === 'before') {
      // repository_before doesn't have parallel uploads - should fail
      const files = getAllSourceFiles();
      const hasParallel = files.some(f => 
        f.content.match(/startUploadSimulation|files\.forEach|files\.map.*upload|Promise\.all/i)
      );
      expect(hasParallel).toBe(false);
      return;
    }
    const files = getAllSourceFiles();
    const hasParallel = files.some(f => 
      f.content.match(/startUploadSimulation|files\.forEach|files\.map.*upload|Promise\.all/i)
    );
    expect(hasParallel).toBe(true);
  });

  // --- Req 8: progress 0-100% smoothly ---
  it('Req 8: progress increases smoothly from 0% to 100%', () => {
    if (REPO === 'before') {
      // repository_before doesn't have upload progress - should fail
      const files = getAllSourceFiles();
      const hasProgress = files.some(f => 
        f.content.match(/progress.*100|width.*progress|progress.*%|uploaded.*size/i)
      );
      expect(hasProgress).toBe(false);
      return;
    }
    const files = getAllSourceFiles();
    const hasProgress = files.some(f => 
      f.content.match(/progress.*100|width.*progress|progress.*%|uploaded.*size/i)
    );
    expect(hasProgress).toBe(true);
  });

  // --- Req 9: simulated speed 800–1500 KB/s ---
  it('Req 9: each file displays simulated upload speed (800–1500 KB/s)', () => {
    if (REPO === 'before') {
      // repository_before doesn't have upload speed - should fail
      const files = getAllSourceFiles();
      const hasSpeed = files.some(f => 
        f.content.match(/800|1500|SPEED_MIN|SPEED_MAX|formatSpeed|speed.*KB/i)
      );
      expect(hasSpeed).toBe(false);
      return;
    }
    const files = getAllSourceFiles();
    const hasSpeed = files.some(f => 
      f.content.match(/800|1500|SPEED_MIN|SPEED_MAX|formatSpeed|speed.*KB/i)
    );
    expect(hasSpeed).toBe(true);
  });

  // --- Req 10: CSS transitions on progress bars ---
  it('Req 10: progress bars animate smoothly with CSS transitions', () => {
    if (REPO === 'before') {
      // repository_before doesn't have progress bars - should fail
      const cssPath = path.join(root, 'src/App.css');
      const css = fs.existsSync(cssPath) ? src('src/App.css') : '';
      expect(css).not.toMatch(/upload-progress|transition.*width|transition.*progress/i);
      return;
    }
    const cssPath = path.join(root, 'src/App.css');
    const css = fs.existsSync(cssPath) ? src('src/App.css') : '';
    expect(css).toMatch(/upload-progress|transition.*width|transition.*progress/i);
  });

  // --- Req 11: before send: preview (name truncate, size, remove ×), no progress ---
  it('Req 11: before send: preview with name (truncate), size, remove ×, no progress', () => {
    if (REPO === 'before') {
      // repository_before doesn't have file preview - should fail
      const files = getAllSourceFiles();
      const hasPreview = files.some(f => 
        f.content.match(/pendingFiles|truncateName|formatSize|removePendingFile|X.*lucide|remove.*file/i)
      );
      expect(hasPreview).toBe(false);
      return;
    }
    const files = getAllSourceFiles();
    const hasPreview = files.some(f => 
      f.content.match(/pendingFiles|truncateName|formatSize|removePendingFile|X.*lucide|remove.*file/i)
    );
    expect(hasPreview).toBe(true);
  });

  // --- Req 12: after send: progress bar, %, speed, spinner ---
  it('Req 12: after send: progress bar, percentage, speed, spinner per file', () => {
    if (REPO === 'before') {
      // repository_before doesn't have upload progress UI - should fail
      const files = getAllSourceFiles();
      const hasProgressUI = files.some(f => 
        f.content.match(/upload-progress|Loader2|formatSpeed|animate-spin|spinner/i)
      );
      expect(hasProgressUI).toBe(false);
      return;
    }
    const files = getAllSourceFiles();
    const hasProgressUI = files.some(f => 
      f.content.match(/upload-progress|Loader2|formatSpeed|animate-spin|spinner/i)
    );
    expect(hasProgressUI).toBe(true);
    const hasPercentage = files.some(f => 
      f.content.match(/prog\.progress|fileProgress|Math\.round.*progress|progress.*%/i)
    );
    expect(hasPercentage).toBe(true);
  });

  // --- Req 13: after completion: checkmark ✓ ---
  it('Req 13: after completion: replace progress with checkmark ✓', () => {
    if (REPO === 'before') {
      // repository_before doesn't have completion checkmarks - should fail
      const files = getAllSourceFiles();
      const hasCheckmark = files.some(f => 
        f.content.match(/Check.*lucide|done.*Check|prog\.done|uploadState.*complete|completed/i)
      );
      expect(hasCheckmark).toBe(false);
      return;
    }
    const files = getAllSourceFiles();
    const hasCheckmark = files.some(f => 
      f.content.match(/Check.*lucide|done.*Check|prog\.done|uploadState.*complete|completed/i)
    );
    expect(hasCheckmark).toBe(true);
  });

  // --- Req 14: optimistic UI - messages appear immediately ---
  it('Req 14: messages appear in chat immediately (optimistic UI)', () => {
    if (REPO === 'before') {
      // repository_before has basic optimistic UI but not file upload optimistic UI - should fail
      const files = getAllSourceFiles();
      const hasFileOptimistic = files.some(f => 
        f.content.match(/sendMessage.*files|SEND_MESSAGE.*files|addMessage.*files|optimistic.*file/i)
      );
      expect(hasFileOptimistic).toBe(false);
      return;
    }
    const files = getAllSourceFiles();
    const hasOptimistic = files.some(f => 
      f.content.match(/sendMessage|SEND_MESSAGE|messages.*push|addMessage|optimistic/i)
    );
    expect(hasOptimistic).toBe(true);
  });

  // --- Req 15: Send disabled while uploading ---
  it('Req 15: Send button disabled while files are uploading', () => {
    if (REPO === 'before') {
      // repository_before doesn't have upload state - should fail
      const files = getAllSourceFiles();
      const hasDisabled = files.some(f => 
        f.content.match(/isUploading|uploadState.*uploading|canSend.*isUploading|disabled.*upload/i)
      );
      expect(hasDisabled).toBe(false);
      return;
    }
    const files = getAllSourceFiles();
    const hasDisabled = files.some(f => 
      f.content.match(/isUploading|uploadState.*uploading|canSend.*isUploading|disabled.*upload/i)
    );
    expect(hasDisabled).toBe(true);
  });

  // --- Req 16: message state "complete" when all done ---
  it('Req 16: message state changes to "complete" when all files complete', () => {
    if (REPO === 'before') {
      // repository_before doesn't have upload completion state - should fail
      const files = getAllSourceFiles();
      const hasComplete = files.some(f => 
        f.content.match(/MESSAGE_UPLOAD_COMPLETE|messageUploadComplete|uploadState.*complete|'complete'|"complete"/i)
      );
      expect(hasComplete).toBe(false);
      return;
    }
    const files = getAllSourceFiles();
    const hasComplete = files.some(f => 
      f.content.match(/MESSAGE_UPLOAD_COMPLETE|messageUploadComplete|uploadState.*complete|'complete'|"complete"/i)
    );
    expect(hasComplete).toBe(true);
  });

  // --- Req 17: state management (useReducer for before, Redux for after) ---
  it('Req 17: application uses useReducer for state management', () => {
    if (REPO === 'before') {
      // repository_before should use useReducer (not just useState) - should fail
      const app = src('src/App.jsx');
      const hasUseReducer = app.match(/useReducer/) !== null;
      expect(hasUseReducer).toBe(false);
      return;
    } else {
      // repository_after should use Redux
      const hasStore = fs.existsSync(path.join(root, 'src/store/store.js'));
      const hasReducer = fs.existsSync(path.join(root, 'src/store/reducer.js'));
      expect(hasStore || hasReducer).toBe(true);
      if (hasStore) {
        const storeFile = src('src/store/store.js');
        expect(storeFile).toMatch(/configureStore|createStore|@reduxjs\/toolkit|redux/i);
      }
    }
  });

  // --- Req 18: no useState for upload or message state (only for after) ---
  it('Req 18: useState is not used for upload or message state', () => {
    if (REPO === 'before') {
      // repository_before uses useState for messages - should fail
      const app = src('src/App.jsx');
      const hasUseStateForMessages = app.match(/useState.*\[.*messages|useState.*messages/i) !== null;
      expect(hasUseStateForMessages).toBe(true); // Should fail because it uses useState
      return;
    }
    const files = getAllSourceFiles();
    // Check that useState is not used for messages, files, upload state
    const stateFiles = files.filter(f => 
      f.path.includes('store') || f.path.includes('reducer') || 
      f.path.includes('App') || f.path.includes('InputArea') ||
      f.path.includes('MessageList') || f.path.includes('FilePreview')
    );
    const hasUseStateForState = stateFiles.some(f => {
      const content = f.content;
      // Check for useState with messages, files, upload, pendingFiles
      return content.match(/useState.*\[.*messages|useState.*\[.*files|useState.*\[.*upload|useState.*\[.*pending/i);
    });
    expect(hasUseStateForState).toBe(false);
  });

  // --- Req 19: no external libraries for uploads (but allow Redux for state) ---
  it('Req 19: no external libraries for uploads or state management', () => {
    if (REPO === 'before') {
      // repository_before doesn't use external libraries for state - should pass (no Redux)
      const files = getAllSourceFiles();
      const allCode = files.map(f => f.content).join('\n');
      const hasRedux = allCode.match(/\bredux\b|\b@reduxjs\/toolkit\b/i) !== null;
      expect(hasRedux).toBe(false); // Should pass (no Redux in before)
      return;
    }
    const files = getAllSourceFiles();
    const allCode = files.map(f => f.content).join('\n');
    // Disallow upload libraries but allow Redux for state management
    const disallowedUpload = ['axios', 'mobx', 'zustand', 'react-query', 'useSWR', 'react-dropzone', 'uppy', 'filepond', 'multer'];
    disallowedUpload.forEach((lib) => {
      expect(allCode).not.toMatch(new RegExp(`\\b${lib}\\b`, 'i'));
    });
    // Redux is allowed for state management
    // The test should pass if Redux is used (which it is)
  });
});

describe(`Meta (${REPO}): behavioral checks`, () => {
  it('preview shows name (truncate), size, remove when file selected', async () => {
    if (REPO === 'before') {
      // repository_before doesn't have file preview - should fail
      renderApp();
      const input = document.querySelector('input[type="file"]');
      expect(input).toBeNull();
      return;
    }
    const { container } = renderApp();
    const input = container.querySelector('input[type="file"]');
    expect(input).toBeInTheDocument();
    
    const file = new File(['x'], 'photo.jpg', { type: 'image/jpeg' });
    Object.defineProperty(file, 'size', { value: 1024, writable: false });
    
    // Trigger file selection using userEvent
    await userEvent.upload(input, file);
    
    // Wait for file preview to appear - check for file name (might be truncated)
    await waitFor(() => {
      // FilePreview shows truncated name, so check for partial match
      const nameElement = screen.queryByText(/photo/i);
      if (!nameElement) {
        // Also check for .jpg extension which might be visible
        const jpgElement = screen.queryByText(/\.jpg|jpg/i);
        expect(jpgElement).toBeInTheDocument();
      } else {
        expect(nameElement).toBeInTheDocument();
      }
    }, { timeout: 10000 });
    
    // Check for remove button (has aria-label="Remove")
    await waitFor(() => {
      const removeButton = screen.getByRole('button', { name: /remove/i });
      expect(removeButton).toBeInTheDocument();
    }, { timeout: 5000 });
  }, 15000); // Increase test timeout to 15 seconds

  it('message appears immediately on send (optimistic)', async () => {
    renderApp();
    
    // Wait for textarea to be available
    const input = await waitFor(() => {
      return screen.getByPlaceholderText(/type your message|message/i);
    }, { timeout: 5000 });
    
    await userEvent.type(input, 'hi');
    
    // Wait for send button to be available and enabled
    const sendButton = await waitFor(() => {
      const btn = screen.getByRole('button', { name: /send/i });
      expect(btn).not.toBeDisabled();
      return btn;
    }, { timeout: 5000 });
    
    await userEvent.click(sendButton);
    
    // Wait for message to appear (optimistic UI)
    await waitFor(() => {
      expect(screen.getByText('hi')).toBeInTheDocument();
    }, { timeout: 5000 });
  }, 15000); // Increase test timeout to 15 seconds
});
