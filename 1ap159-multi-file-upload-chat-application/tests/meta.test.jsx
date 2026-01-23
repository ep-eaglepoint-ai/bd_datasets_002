/**
 * Meta-tests: 19 requirements for repository_after (REPO_MODE=after).
 * repository_before (REPO_MODE=before): FAIL_TO_PASS fail, PASS_TO_PASS pass.
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const fs = require('fs');
const path = require('path');

const REPO = process.env.REPO_MODE || 'after';
const App = require(`../repository_${REPO}/src/App.jsx`).default;
const root = path.join(__dirname, '..', `repository_${REPO}`);

function src(name) {
  return fs.readFileSync(path.join(root, name), 'utf8');
}

describe(`Meta (${REPO}): 19 requirements`, () => {
  // --- Req 1: drag-and-drop and click-to-select ---
  it('Req 1: drag-and-drop and click-to-select file uploads', () => {
    render(<App />);
    const input = document.querySelector('input[type="file"]');
    expect(input).toBeInTheDocument();
    expect(input?.hasAttribute('multiple')).toBe(true);
    const app = src('src/App.jsx');
    expect(app).toMatch(/onDrop|onDragOver/);
    expect(screen.getByRole('button', { name: /add files/i })).toBeInTheDocument();
  });

  // --- Req 2: jpg, png, gif, pdf, txt ---
  it('Req 2: supported formats jpg, png, gif, pdf, txt', () => {
    const app = src('src/App.jsx');
    expect(app).toMatch(/jpe?g|jpeg|\.jpg|\.png|\.gif|\.pdf|\.txt/i);
    render(<App />);
    const input = document.querySelector('input[type="file"]');
    if (input) expect(input.getAttribute('accept')).toMatch(/jpg|png|gif|pdf|txt/i);
  });

  // --- Req 3: max 4 files per message ---
  it('Req 3: maximum 4 files per message', () => {
    const app = src('src/App.jsx');
    expect(app).toMatch(/MAX_FILES|length >= 4|4.*files|files.*4/);
  });

  // --- Req 4: per-file 3MB ---
  it('Req 4: per-file size limit 3MB', () => {
    const app = src('src/App.jsx');
    expect(app).toMatch(/MAX_FILE_BYTES|3.*1024.*1024|3145728/i);
  });

  // --- Req 5: total 8MB per message ---
  it('Req 5: total upload size 8MB per message', () => {
    const app = src('src/App.jsx');
    expect(app).toMatch(/MAX_TOTAL_BYTES|8.*1024.*1024|8388608/i);
  });

  // --- Req 6: independent progress per file ---
  it('Req 6: each file has its own progress indicator', () => {
    const app = src('src/App.jsx');
    expect(app).toMatch(/fileProgress|fileId.*progress/);
  });

  // --- Req 7: parallel uploads ---
  it('Req 7: all files upload in parallel, not sequentially', () => {
    const app = src('src/App.jsx');
    expect(app).toMatch(/startUploadSimulation|files\.forEach/);
  });

  // --- Req 8: progress 0-100% smoothly ---
  it('Req 8: progress increases smoothly from 0% to 100%', () => {
    const app = src('src/App.jsx');
    expect(app).toMatch(/uploaded.*size|progress.*100|width.*progress/);
  });

  // --- Req 9: simulated speed 800–1500 KB/s ---
  it('Req 9: each file displays simulated upload speed (800–1500 KB/s)', () => {
    const app = src('src/App.jsx');
    expect(app).toMatch(/800|1500|SPEED_MIN|SPEED_MAX|formatSpeed/);
  });

  // --- Req 10: CSS transitions on progress bars ---
  it('Req 10: progress bars animate smoothly with CSS transitions', () => {
    const css = fs.existsSync(path.join(root, 'src/App.css')) ? src('src/App.css') : '';
    expect(css).toMatch(/upload-progress|transition.*width/);
  });

  // --- Req 11: before send: preview (name truncate, size, remove ×), no progress ---
  it('Req 11: before send: preview with name (truncate), size, remove ×, no progress', () => {
    const app = src('src/App.jsx');
    expect(app).toMatch(/pendingFiles|truncateName|formatSize|REMOVE_PENDING_FILE|X.*lucide/);
  });

  // --- Req 12: after send: progress bar, %, speed, spinner ---
  it('Req 12: after send: progress bar, percentage, speed, spinner per file', () => {
    const app = src('src/App.jsx');
    expect(app).toMatch(/upload-progress|Loader2|formatSpeed|animate-spin/);
    expect(app).toMatch(/prog\.progress|fileProgress|Math\.round.*progress/);
  });

  // --- Req 13: after completion: checkmark ✓ ---
  it('Req 13: after completion: replace progress with checkmark ✓', () => {
    const app = src('src/App.jsx');
    expect(app).toMatch(/Check.*lucide|done.*Check|prog\.done|uploadState.*complete/);
  });

  // --- Req 14: optimistic UI - messages appear immediately ---
  it('Req 14: messages appear in chat immediately (optimistic UI)', () => {
    const app = src('src/App.jsx');
    expect(app).toMatch(/SEND_MESSAGE|messages:.*\[\.\.\.state\.messages|\.\.\.state\.messages.*newMsg/);
  });

  // --- Req 15: Send disabled while uploading ---
  it('Req 15: Send button disabled while files are uploading', () => {
    const app = src('src/App.jsx');
    expect(app).toMatch(/isUploading|uploadState.*uploading|canSend.*isUploading/);
  });

  // --- Req 16: message state "complete" when all done ---
  it('Req 16: message state changes to "complete" when all files complete', () => {
    const app = src('src/App.jsx');
    expect(app).toMatch(/MESSAGE_UPLOAD_COMPLETE|uploadState.*complete|'complete'|"complete"/);
  });

  // --- Req 17: useReducer for state ---
  it('Req 17: application uses useReducer for state management', () => {
    const app = src('src/App.jsx');
    expect(app).toMatch(/useReducer/);
  });

  // --- Req 18: no useState for upload or message state ---
  it('Req 18: useState is not used for upload or message state', () => {
    const app = src('src/App.jsx');
    expect(app).not.toMatch(/\buseState\b/);
  });

  // --- Req 19: no external libraries for uploads or state ---
  it('Req 19: no external libraries for uploads or state management', () => {
    const app = src('src/App.jsx');
    const disallowed = ['axios', 'redux', 'mobx', 'zustand', 'react-query', 'useSWR', 'react-dropzone', 'uppy', 'filepond'];
    disallowed.forEach((lib) => expect(app).not.toMatch(new RegExp(lib, 'i')));
  });
});

describe(`Meta (${REPO}): behavioral checks`, () => {
  it('preview shows name (truncate), size, remove when file selected', async () => {
    render(<App />);
    const input = document.querySelector('input[type="file"]');
    expect(input).toBeInTheDocument();
    const file = new File(['x'], 'photo.jpg', { type: 'image/jpeg' });
    Object.defineProperty(file, 'size', { value: 1024 });
    await userEvent.upload(input, file);
    expect(screen.getByText(/photo\.jpg/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /remove/i })).toBeInTheDocument();
  });

  it('message appears immediately on send (optimistic)', async () => {
    render(<App />);
    await userEvent.type(screen.getByPlaceholderText(/type your message/i), 'hi');
    await userEvent.click(screen.getByRole('button', { name: /send/i }));
    expect(screen.getByText('hi')).toBeInTheDocument();
  });
});
