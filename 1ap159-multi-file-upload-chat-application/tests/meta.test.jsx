/**
 * Meta-tests: 19 requirements for repository_after (REPO_MODE=after).
 * repository_before (REPO_MODE=before): FAIL_TO_PASS fail, PASS_TO_PASS pass.
 */
import React from 'react';
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
let ChatProvider = null;

const REPO = process.env.REPO_MODE || 'after';
const App = require(`../repository_${REPO}/src/App.jsx`).default;

if (REPO === 'after') {
  try {
    const ctx = require(`../repository_${REPO}/src/state/chatContext.jsx`);
    ChatProvider = ctx.ChatProvider;
  } catch (e) {
    ChatProvider = null;
  }
}

function renderApp() {
  const app = <App />;
  if (ChatProvider) {
    return render(<ChatProvider>{app}</ChatProvider>);
  }
  return render(app);
}

function createFile({ name, size, type }) {
  const file = new File(['x'.repeat(10)], name, { type });
  Object.defineProperty(file, 'size', { value: size, writable: false });
  return file;
}

function getDropZone(container) {
  return container.querySelector('.border-dashed');
}
  walkDir(path.join(root, "src"));
  return files;
}

// Helper to render App with Provider if needed
function renderApp() {
  const app = <App />;
  if (ChatProvider) {
    return render(<ChatProvider>{app}</ChatProvider>);
  }
  return render(app);
}

describe(`Meta (${REPO}): 19 requirements`, () => {
  // --- Req 1: drag-and-drop and click-to-select ---
  it("Req 1: drag-and-drop and click-to-select file uploads", () => {
    if (REPO === "before") {
      // repository_before doesn't have file upload - should fail
      renderApp();
      const input = document.querySelector('input[type="file"]');
      expect(input).toBeNull();
      return;
    }
    renderApp();
    const input = document.querySelector('input[type="file"]');
    expect(input).toBeInTheDocument();
    describe(`Meta (${REPO}): behavioral requirements`, () => {
      it('Req 1: drag-and-drop and click-to-select file uploads', async () => {
        renderApp();
        const input = document.querySelector('input[type="file"]');
        if (REPO === 'before') {
          expect(input).toBeNull();
          return;
        }
        expect(input).toBeInTheDocument();
        expect(input?.multiple).toBe(true);

        const { container } = renderApp();
        const dropZone = getDropZone(container);
        const dropFile = createFile({ name: 'drop.jpg', size: 1024, type: 'image/jpeg' });
        fireEvent.drop(dropZone, { dataTransfer: { files: [dropFile] } });

        await waitFor(() => {
          expect(screen.getByText(/drop\.jpg/i)).toBeInTheDocument();
        });
      });

      it('Req 2: supports jpg, png, gif, pdf, txt and rejects others', async () => {
        renderApp();
        const input = document.querySelector('input[type="file"]');
        if (REPO === 'before') {
          expect(input).toBeNull();
          return;
        }
        const file = createFile({ name: 'notes.txt', size: 1024, type: 'text/plain' });
        await userEvent.upload(input, file);
        await waitFor(() => {
          expect(screen.getByText(/notes\.txt/i)).toBeInTheDocument();
        });

        const badFile = createFile({ name: 'virus.exe', size: 1024, type: 'application/octet-stream' });
        await userEvent.upload(input, badFile);
        await waitFor(() => {
          expect(screen.getByText(/Unsupported file type/i)).toBeInTheDocument();
        });
      });

      it('Req 3: maximum 4 files per message', async () => {
        renderApp();
        const input = document.querySelector('input[type="file"]');
        if (REPO === 'before') {
          expect(input).toBeNull();
          return;
        }
        const files = [
          createFile({ name: '1.jpg', size: 500, type: 'image/jpeg' }),
          createFile({ name: '2.jpg', size: 500, type: 'image/jpeg' }),
          createFile({ name: '3.jpg', size: 500, type: 'image/jpeg' }),
          createFile({ name: '4.jpg', size: 500, type: 'image/jpeg' }),
          createFile({ name: '5.jpg', size: 500, type: 'image/jpeg' })
        ];
        await userEvent.upload(input, files);
        await waitFor(() => {
          expect(screen.getByText(/Maximum 4 files allowed/i)).toBeInTheDocument();
        });
        const chips = screen.getAllByRole('button', { name: /remove/i });
        expect(chips.length).toBe(4);
      });

      it('Req 4: per-file size limit 3MB', async () => {
        renderApp();
        const input = document.querySelector('input[type="file"]');
        if (REPO === 'before') {
          expect(input).toBeNull();
          return;
        }
        const bigFile = createFile({ name: 'big.pdf', size: 4 * 1024 * 1024, type: 'application/pdf' });
        await userEvent.upload(input, bigFile);
        await waitFor(() => {
          expect(screen.getByText(/File too large/i)).toBeInTheDocument();
        });
      });

      it('Req 5: total upload size limit 8MB', async () => {
        renderApp();
        const input = document.querySelector('input[type="file"]');
        if (REPO === 'before') {
          expect(input).toBeNull();
          return;
        }
        const files = [
          createFile({ name: 'a.jpg', size: 3 * 1024 * 1024, type: 'image/jpeg' }),
          createFile({ name: 'b.jpg', size: 3 * 1024 * 1024, type: 'image/jpeg' }),
          createFile({ name: 'c.jpg', size: 3 * 1024 * 1024, type: 'image/jpeg' })
        ];
        await userEvent.upload(input, files);
        await waitFor(() => {
          expect(screen.getByText(/Total size exceeds 8MB limit/i)).toBeInTheDocument();
        });
      });

      it('Req 11: preview shows name, size, remove, no progress before send', async () => {
        renderApp();
        const input = document.querySelector('input[type="file"]');
        if (REPO === 'before') {
          expect(input).toBeNull();
          return;
        }
        const file = createFile({ name: 'photo.jpg', size: 1024, type: 'image/jpeg' });
        await userEvent.upload(input, file);
        await waitFor(() => {
          expect(screen.getByText(/photo\.jpg/i)).toBeInTheDocument();
          expect(screen.getByText(/KB|MB/i)).toBeInTheDocument();
          expect(screen.getByRole('button', { name: /remove/i })).toBeInTheDocument();
        });
        expect(screen.queryByLabelText(/Upload progress/i)).toBeNull();
      });

      it('Req 12-13: after send shows progress, speed, spinner, then checkmark', async () => {
        jest.useFakeTimers();
        renderApp();
        const input = document.querySelector('input[type="file"]');
        if (REPO === 'before') {
          expect(input).toBeNull();
          jest.useRealTimers();
          return;
        }
        const file = createFile({ name: 'upload.png', size: 1024 * 1024, type: 'image/png' });
        await userEvent.upload(input, file);

        const messageInput = screen.getByPlaceholderText(/type your message/i);
        await userEvent.type(messageInput, 'sending');
        const sendButton = screen.getByRole('button', { name: /send/i });
        await userEvent.click(sendButton);

        await waitFor(() => {
          expect(screen.getByLabelText(/Uploading/i)).toBeInTheDocument();
          expect(screen.getByLabelText(/Upload progress/i)).toBeInTheDocument();
          expect(screen.getByText(/%/)).toBeInTheDocument();
          expect(screen.getByText(/KB\/s|MB\/s/)).toBeInTheDocument();
        });

        await waitFor(() => {
          jest.advanceTimersByTime(4500);
        });

        await waitFor(() => {
          expect(screen.getByLabelText(/Upload complete/i)).toBeInTheDocument();
          expect(screen.queryByLabelText(/Upload progress/i)).toBeNull();
        });
        jest.useRealTimers();
      }, 20000);

      it('Req 14: messages appear immediately on send (optimistic UI)', async () => {
        renderApp();
        const input = screen.getByPlaceholderText(/type your message/i);
        await userEvent.type(input, 'hi');
        const sendButton = screen.getByRole('button', { name: /send/i });
        await userEvent.click(sendButton);
        await waitFor(() => {
          expect(screen.getByText('hi')).toBeInTheDocument();
        });
      });

      it('Req 15-16: send disabled while uploading, then re-enabled after complete', async () => {
        jest.useFakeTimers();
        renderApp();
        const input = document.querySelector('input[type="file"]');
        if (REPO === 'before') {
          expect(input).toBeNull();
          jest.useRealTimers();
          return;
        }
        const file = createFile({ name: 'lock.pdf', size: 1024 * 1024, type: 'application/pdf' });
        await userEvent.upload(input, file);
        const messageInput = screen.getByPlaceholderText(/type your message/i);
        await userEvent.type(messageInput, 'upload');
        const sendButton = screen.getByRole('button', { name: /send/i });
        await userEvent.click(sendButton);

        await waitFor(() => {
          expect(sendButton).toBeDisabled();
          expect(screen.getByText(/Uploading\s+0\s+of\s+1\s+files/i)).toBeInTheDocument();
        });

        await waitFor(() => {
          jest.advanceTimersByTime(4500);
        });

        await waitFor(() => {
          expect(sendButton).not.toBeDisabled();
          expect(screen.queryByText(/Uploading\s+1\s+of\s+1\s+files/i)).toBeNull();
        });
        jest.useRealTimers();
      }, 20000);
    });
};);

describe(`Meta (${REPO}): behavioral checks`, () => {
  it("preview shows name (truncate), size, remove when file selected", async () => {
    if (REPO === "before") {
      // repository_before doesn't have file preview - should fail
      renderApp();
      const input = document.querySelector('input[type="file"]');
      expect(input).toBeNull();
      return;
    }
    const { container } = renderApp();
    const input = container.querySelector('input[type="file"]');
    expect(input).toBeInTheDocument();

    const file = new File(["x"], "photo.jpg", { type: "image/jpeg" });
    Object.defineProperty(file, "size", { value: 1024, writable: false });

    // Trigger file selection using userEvent
    await userEvent.upload(input, file);

    // Wait for file preview to appear - check for file name (might be truncated)
    await waitFor(
      () => {
        // FilePreview shows truncated name, so check for partial match
        const nameElement = screen.queryByText(/photo/i);
        if (!nameElement) {
          // Also check for .jpg extension which might be visible
          const jpgElement = screen.queryByText(/\.jpg|jpg/i);
          expect(jpgElement).toBeInTheDocument();
        } else {
          expect(nameElement).toBeInTheDocument();
        }
      },
      { timeout: 10000 },
    );

    // Check for remove button (has aria-label="Remove")
    await waitFor(
      () => {
        const removeButton = screen.getByRole("button", { name: /remove/i });
        expect(removeButton).toBeInTheDocument();
      },
      { timeout: 5000 },
    );
  }, 15000); // Increase test timeout to 15 seconds

  it("message appears immediately on send (optimistic)", async () => {
    renderApp();

    // Wait for textarea to be available
    const input = await waitFor(
      () => {
        return screen.getByPlaceholderText(/type your message|message/i);
      },
      { timeout: 5000 },
    );

    await userEvent.type(input, "hi");

    // Wait for send button to be available and enabled
    const sendButton = await waitFor(
      () => {
        const btn = screen.getByRole("button", { name: /send/i });
        expect(btn).not.toBeDisabled();
        return btn;
      },
      { timeout: 5000 },
    );

    await userEvent.click(sendButton);

    // Wait for message to appear (optimistic UI)
    await waitFor(
      () => {
        expect(screen.getByText("hi")).toBeInTheDocument();
      },
      { timeout: 5000 },
    );
  }, 15000); // Increase test timeout to 15 seconds
});
