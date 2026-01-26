import React from 'react';
import { render, screen, fireEvent, waitFor, within, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../src/App';

afterEach(() => {
  cleanup();
});

// Helper to wait for loading to complete
const waitForLoadingComplete = async () => {
  await waitFor(() => {
    expect(screen.queryByText(/loading notes/i)).not.toBeInTheDocument();
  }, { timeout: 3000 });
};

// Helper to create a note
const createNote = async (title, content, tags = []) => {
  const titleInput = screen.getByPlaceholderText('Enter note title');
  const contentInput = screen.getByPlaceholderText('Enter note content');
  const createButton = screen.getByRole('button', { name: /create note/i });

  fireEvent.change(titleInput, { target: { value: title } });
  fireEvent.change(contentInput, { target: { value: content } });

  if (tags.length > 0) {
    const tagInput = screen.getByPlaceholderText(/add tags/i);
    for (const tag of tags) {
      fireEvent.change(tagInput, { target: { value: tag } });
      fireEvent.keyDown(tagInput, { key: 'Enter' });
    }
  }

  fireEvent.click(createButton);

  await waitFor(() => {
    expect(screen.getByText(title)).toBeInTheDocument();
  });
};

describe('Note Taker Application', () => {
  // Run Initial Render tests first - they run before any notes are created
  describe('Initial Render and Loading', () => {
    test('should display header with application title', async () => {
      render(<App />);
      expect(screen.getByText('📚 Note Taker Application')).toBeInTheDocument();
    });

    test('should display loading state on mount', () => {
      render(<App />);
      expect(screen.getByText(/loading notes/i)).toBeInTheDocument();
    });

    test('should display empty state after loading completes', async () => {
      render(<App />);
      await waitForLoadingComplete();
      expect(screen.getByText(/no notes found/i)).toBeInTheDocument();
    });

    test('should display All Notes (0) initially', async () => {
      render(<App />);
      await waitForLoadingComplete();
      expect(screen.getByText(/All Notes \(0\)/)).toBeInTheDocument();
    });
  });

  describe('Create Note', () => {
    test('should create note with title and content and add to list', async () => {
      render(<App />);
      await waitForLoadingComplete();

      const titleInput = screen.getByPlaceholderText('Enter note title');
      const contentInput = screen.getByPlaceholderText('Enter note content');
      const createButton = screen.getByRole('button', { name: /create note/i });

      fireEvent.change(titleInput, { target: { value: 'Test Note Title' } });
      fireEvent.change(contentInput, { target: { value: 'Test note content here' } });
      fireEvent.click(createButton);

      await waitFor(() => {
        expect(screen.getByText('Test Note Title')).toBeInTheDocument();
        expect(screen.getByText('Test note content here')).toBeInTheDocument();
      });
    });

    test('should increment All Notes count when note is created', async () => {
      render(<App />);
      await waitForLoadingComplete();

      // Get initial count by parsing the "All Notes (X)" text
      const allNotesText = screen.getByText(/All Notes \(\d+\)/).textContent;
      const initialCount = parseInt(allNotesText.match(/\((\d+)\)/)[1]);

      const titleInput = screen.getByPlaceholderText('Enter note title');
      const contentInput = screen.getByPlaceholderText('Enter note content');
      const createButton = screen.getByRole('button', { name: /create note/i });

      fireEvent.change(titleInput, { target: { value: 'Count Test Note' } });
      fireEvent.change(contentInput, { target: { value: 'Content for count' } });
      fireEvent.click(createButton);

      await waitFor(() => {
        expect(screen.getByText(`All Notes (${initialCount + 1})`)).toBeInTheDocument();
      });
    });

    test('should display correct title and content after creation', async () => {
      render(<App />);
      await waitForLoadingComplete();

      const titleInput = screen.getByPlaceholderText('Enter note title');
      const contentInput = screen.getByPlaceholderText('Enter note content');
      const createButton = screen.getByRole('button', { name: /create note/i });

      fireEvent.change(titleInput, { target: { value: 'My Unique Display Title' } });
      fireEvent.change(contentInput, { target: { value: 'My unique content for display testing' } });
      fireEvent.click(createButton);

      await waitFor(() => {
        expect(screen.getByText('My Unique Display Title')).toBeInTheDocument();
        expect(screen.getByText('My unique content for display testing')).toBeInTheDocument();
      });
    });

    test('should update tag counts in TagFilter after creating note with tags', async () => {
      render(<App />);
      await waitForLoadingComplete();

      const titleInput = screen.getByPlaceholderText('Enter note title');
      const contentInput = screen.getByPlaceholderText('Enter note content');
      const tagInput = screen.getByPlaceholderText(/add tags/i);
      const createButton = screen.getByRole('button', { name: /create note/i });

      // Use a unique tag name to avoid collision with other tests
      const uniqueTag = 'tagfiltertest' + Date.now();

      fireEvent.change(titleInput, { target: { value: 'Tagged Note Filter Test' } });
      fireEvent.change(contentInput, { target: { value: 'Content with unique tag' } });
      fireEvent.change(tagInput, { target: { value: uniqueTag } });
      fireEvent.keyDown(tagInput, { key: 'Enter' });
      fireEvent.click(createButton);

      await waitFor(() => {
        // Tag should appear in the filter sidebar
        const sidebar = screen.getByText('🏷️ Filter by Tag').closest('div');
        expect(within(sidebar).getByText(uniqueTag)).toBeInTheDocument();
      });
    });
  });

  describe('Form Validation', () => {
    test('should show alert when submitting with empty title', async () => {
      const alertMock = jest.spyOn(window, 'alert').mockImplementation(() => {});

      render(<App />);
      await waitForLoadingComplete();

      const contentInput = screen.getByPlaceholderText('Enter note content');
      const createButton = screen.getByRole('button', { name: /create note/i });

      fireEvent.change(contentInput, { target: { value: 'Only content no title' } });
      fireEvent.click(createButton);

      expect(alertMock).toHaveBeenCalledWith('Please fill in both title and content');
      alertMock.mockRestore();
    });

    test('should show alert when submitting with empty content', async () => {
      const alertMock = jest.spyOn(window, 'alert').mockImplementation(() => {});

      render(<App />);
      await waitForLoadingComplete();

      const titleInput = screen.getByPlaceholderText('Enter note title');
      const createButton = screen.getByRole('button', { name: /create note/i });

      fireEvent.change(titleInput, { target: { value: 'Only title no content' } });
      fireEvent.click(createButton);

      expect(alertMock).toHaveBeenCalledWith('Please fill in both title and content');
      alertMock.mockRestore();
    });
  });

  describe('Tag Input and Management', () => {
    test('should add tag chip when pressing Enter and clear input', async () => {
      render(<App />);
      await waitForLoadingComplete();

      const tagInput = screen.getByPlaceholderText(/add tags/i);

      fireEvent.change(tagInput, { target: { value: 'entertagtest' } });
      fireEvent.keyDown(tagInput, { key: 'Enter' });

      // Tag chip should appear in the form
      const formSection = screen.getByText(/create new note/i).closest('div');
      expect(within(formSection).getByText('entertagtest')).toBeInTheDocument();

      // Input should be cleared
      expect(tagInput.value).toBe('');
    });

    test('should add tag chip when pressing comma', async () => {
      render(<App />);
      await waitForLoadingComplete();

      const tagInput = screen.getByPlaceholderText(/add tags/i);

      fireEvent.change(tagInput, { target: { value: 'commatagtest' } });
      fireEvent.keyDown(tagInput, { key: ',' });

      const formSection = screen.getByText(/create new note/i).closest('div');
      expect(within(formSection).getByText('commatagtest')).toBeInTheDocument();
    });

    test('should not add duplicate tags', async () => {
      render(<App />);
      await waitForLoadingComplete();

      const tagInput = screen.getByPlaceholderText(/add tags/i);

      // Add tag first time
      fireEvent.change(tagInput, { target: { value: 'duplicatetest' } });
      fireEvent.keyDown(tagInput, { key: 'Enter' });

      // Try to add same tag again
      fireEvent.change(tagInput, { target: { value: 'duplicatetest' } });
      fireEvent.keyDown(tagInput, { key: 'Enter' });

      // Should only have one instance
      const formSection = screen.getByText(/create new note/i).closest('div');
      const tagElements = within(formSection).getAllByText('duplicatetest');
      expect(tagElements).toHaveLength(1);
    });

    test('should remove tag when clicking × button', async () => {
      render(<App />);
      await waitForLoadingComplete();

      const tagInput = screen.getByPlaceholderText(/add tags/i);

      fireEvent.change(tagInput, { target: { value: 'removetagtest' } });
      fireEvent.keyDown(tagInput, { key: 'Enter' });

      const formSection = screen.getByText(/create new note/i).closest('div');
      expect(within(formSection).getByText('removetagtest')).toBeInTheDocument();

      // Click the × button to remove
      const removeButton = within(formSection).getByRole('button', { name: '×' });
      fireEvent.click(removeButton);

      expect(within(formSection).queryByText('removetagtest')).not.toBeInTheDocument();
    });
  });

  describe('Tag Filter', () => {
    test('should show tags with correct counts after creating notes', async () => {
      render(<App />);
      await waitForLoadingComplete();

      const titleInput = screen.getByPlaceholderText('Enter note title');
      const contentInput = screen.getByPlaceholderText('Enter note content');
      const tagInput = screen.getByPlaceholderText(/add tags/i);
      const createButton = screen.getByRole('button', { name: /create note/i });

      // Use unique tag name
      const uniqueTag = 'counttest' + Date.now();

      // Create first note with tag
      fireEvent.change(titleInput, { target: { value: 'Count Note 1' } });
      fireEvent.change(contentInput, { target: { value: 'Count content 1' } });
      fireEvent.change(tagInput, { target: { value: uniqueTag } });
      fireEvent.keyDown(tagInput, { key: 'Enter' });
      fireEvent.click(createButton);

      await waitFor(() => {
        expect(screen.getByText('Count Note 1')).toBeInTheDocument();
      });

      // Create second note with same tag
      fireEvent.change(titleInput, { target: { value: 'Count Note 2' } });
      fireEvent.change(contentInput, { target: { value: 'Count content 2' } });
      fireEvent.change(tagInput, { target: { value: uniqueTag } });
      fireEvent.keyDown(tagInput, { key: 'Enter' });
      fireEvent.click(createButton);

      await waitFor(() => {
        expect(screen.getByText('Count Note 2')).toBeInTheDocument();
      });

      // Check that the tag shows count of 2
      await waitFor(() => {
        const sidebar = screen.getByText('🏷️ Filter by Tag').closest('div');
        const tagButton = within(sidebar).getByText(uniqueTag).closest('button');
        expect(within(tagButton).getByText('2')).toBeInTheDocument();
      });
    });
  });

  describe('Edit Note', () => {
    test('should enter edit mode and pre-fill form when clicking edit button', async () => {
      render(<App />);
      await waitForLoadingComplete();

      // Create a note first with unique title
      const uniqueTitle = 'Edit Mode Test ' + Date.now();
      await createNote(uniqueTitle, 'Original edit content');

      // Click edit button on this specific note
      const noteCard = screen.getByText(uniqueTitle).closest('div[style]');
      const editButton = within(noteCard).getByTitle('Edit note');
      fireEvent.click(editButton);

      // Form should show edit mode with pre-filled values
      await waitFor(() => {
        expect(screen.getByText(/edit note/i)).toBeInTheDocument();
        expect(screen.getByDisplayValue(uniqueTitle)).toBeInTheDocument();
        expect(screen.getByDisplayValue('Original edit content')).toBeInTheDocument();
      });
    });

    test('should update note when submitting in edit mode', async () => {
      render(<App />);
      await waitForLoadingComplete();

      // Create a note with unique title
      const originalTitle = 'Before Update ' + Date.now();
      await createNote(originalTitle, 'Before update content');

      // Click edit
      const noteCard = screen.getByText(originalTitle).closest('div[style]');
      const editButton = within(noteCard).getByTitle('Edit note');
      fireEvent.click(editButton);

      await waitFor(() => {
        expect(screen.getByDisplayValue(originalTitle)).toBeInTheDocument();
      });

      // Update the note
      const editTitleInput = screen.getByDisplayValue(originalTitle);
      const updatedTitle = 'After Update ' + Date.now();

      fireEvent.change(editTitleInput, { target: { value: updatedTitle } });

      const updateButton = screen.getByRole('button', { name: /update note/i });
      fireEvent.click(updateButton);

      await waitFor(() => {
        expect(screen.getByText(updatedTitle)).toBeInTheDocument();
        expect(screen.queryByText(originalTitle)).not.toBeInTheDocument();
      });
    });
  });

  describe('Delete Note', () => {
    test('should not delete note when confirm returns false', async () => {
      const confirmMock = jest.spyOn(window, 'confirm').mockReturnValue(false);

      render(<App />);
      await waitForLoadingComplete();

      // Create a note with unique title
      const uniqueTitle = 'Keep Note ' + Date.now();
      await createNote(uniqueTitle, 'Should not be deleted');

      // Click delete on this note
      const noteCard = screen.getByText(uniqueTitle).closest('div[style]');
      const deleteButton = within(noteCard).getByTitle('Delete note');
      fireEvent.click(deleteButton);

      expect(confirmMock).toHaveBeenCalledWith('Are you sure you want to delete this note?');
      // Note should still be there
      expect(screen.getByText(uniqueTitle)).toBeInTheDocument();

      confirmMock.mockRestore();
    });

    test('should delete note when confirm returns true', async () => {
      const confirmMock = jest.spyOn(window, 'confirm').mockReturnValue(true);

      render(<App />);
      await waitForLoadingComplete();

      // Create a note with unique title
      const uniqueTitle = 'Delete This ' + Date.now();
      await createNote(uniqueTitle, 'Will be deleted');

      // Click delete
      const noteCard = screen.getByText(uniqueTitle).closest('div[style]');
      const deleteButton = within(noteCard).getByTitle('Delete note');
      fireEvent.click(deleteButton);

      await waitFor(() => {
        expect(screen.queryByText(uniqueTitle)).not.toBeInTheDocument();
      });

      confirmMock.mockRestore();
    });

    test('should update tag counts after deletion', async () => {
      const confirmMock = jest.spyOn(window, 'confirm').mockReturnValue(true);

      render(<App />);
      await waitForLoadingComplete();

      // Create a note with a unique tag
      const uniqueTag = 'deletetag' + Date.now();
      const uniqueTitle = 'Tagged Delete ' + Date.now();
      await createNote(uniqueTitle, 'Content to delete', [uniqueTag]);

      // Verify tag appears in sidebar
      await waitFor(() => {
        const sidebar = screen.getByText('🏷️ Filter by Tag').closest('div');
        expect(within(sidebar).getByText(uniqueTag)).toBeInTheDocument();
      });

      // Delete the note
      const noteCard = screen.getByText(uniqueTitle).closest('div[style]');
      const deleteButton = within(noteCard).getByTitle('Delete note');
      fireEvent.click(deleteButton);

      // Tag should be removed from sidebar
      await waitFor(() => {
        const sidebar = screen.getByText('🏷️ Filter by Tag').closest('div');
        expect(within(sidebar).queryByText(uniqueTag)).not.toBeInTheDocument();
      });

      confirmMock.mockRestore();
    });

    test('should show empty state after deleting last note', async () => {
      const confirmMock = jest.spyOn(window, 'confirm').mockReturnValue(true);

      render(<App />);
      await waitForLoadingComplete();

      // Delete all existing notes first
      const deleteAllNotes = async () => {
        let deleteButtons = screen.queryAllByTitle('Delete note');
        while (deleteButtons.length > 0) {
          fireEvent.click(deleteButtons[0]);
          // Wait for deletion to complete
          await waitFor(() => {
            const newCount = screen.queryAllByTitle('Delete note').length;
            return newCount < deleteButtons.length;
          }, { timeout: 2000 });
          deleteButtons = screen.queryAllByTitle('Delete note');
        }
      };

      await deleteAllNotes();

      // Verify empty state - if we started with notes, they're now deleted
      // If we need to test the transition, create a note and delete it
      let emptyStateShown = screen.queryByText(/no notes found/i);

      if (!emptyStateShown) {
        // Create a single note
        const uniqueTitle = 'Last Note Empty State ' + Date.now();
        await createNote(uniqueTitle, 'Will be deleted for empty state');

        // Delete it
        const noteCard = screen.getByText(uniqueTitle).closest('div[style]');
        const deleteButton = within(noteCard).getByTitle('Delete note');
        fireEvent.click(deleteButton);

        await waitFor(() => {
          expect(screen.queryByText(uniqueTitle)).not.toBeInTheDocument();
        });
      }

      // Now we should have empty state
      await waitFor(() => {
        expect(screen.getByText(/no notes found/i)).toBeInTheDocument();
      }, { timeout: 3000 });

      confirmMock.mockRestore();
    });
  });
});
