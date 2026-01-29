import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import App from "@/client/src/App.jsx";
import NoteForm from "@/client/src/components/NoteForm.jsx";
import NoteList from "@/client/src/components/NoteList.jsx";
import TagFilter from "@/client/src/components/TagFilter.jsx";
import NoteDetail from "@/client/src/components/NoteDetail.jsx";

jest.mock("@/client/src/api/notesApi.js", () => ({
  getNotes: jest.fn(),
  getTags: jest.fn(),
  getNoteById: jest.fn(),
  createNote: jest.fn(),
  updateNote: jest.fn(),
  deleteNote: jest.fn(),
}));

import { getNotes, getTags, getNoteById, createNote, updateNote, deleteNote } from "@/client/src/api/notesApi.js";

describe("Frontend UI", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("NoteForm calls onCreate with parsed tags", () => {
    const onCreate = jest.fn();
    render(<NoteForm onCreate={onCreate} />);

    fireEvent.change(screen.getByPlaceholderText("Title"), { target: { value: "Test Title" } });
    fireEvent.change(screen.getByPlaceholderText("Content"), { target: { value: "Test Content" } });
    fireEvent.change(screen.getByPlaceholderText("Tags (comma separated)"), { target: { value: "work, personal" } });

    fireEvent.click(screen.getByText("Add Note"));

    expect(onCreate).toHaveBeenCalledWith({
      title: "Test Title",
      content: "Test Content",
      tags: ["work", "personal"],
    });
  });

  test("NoteList shows empty message when no notes", () => {
    render(<NoteList notes={[]} onUpdate={jest.fn()} onDelete={jest.fn()} onView={jest.fn()} />);
    expect(screen.getByText("No notes found.")).toBeInTheDocument();
  });

  test("TagFilter renders tags and allows selection + clear", () => {
    const onSelectTag = jest.fn();
    const onClear = jest.fn();

    render(
      <TagFilter
        tags={[{ id: 1, name: "work", count: 2 }]}
        activeTag="work"
        onSelectTag={onSelectTag}
        onClear={onClear}
      />,
    );

    expect(screen.getByText("work (2)")).toBeInTheDocument();
    fireEvent.click(screen.getByText("work (2)"));
    expect(onSelectTag).toHaveBeenCalledWith("work");

    fireEvent.click(screen.getByText("Clear"));
    expect(onClear).toHaveBeenCalled();
  });

  test("App loads notes and tags on mount", async () => {
    getNotes.mockResolvedValueOnce([{ id: 1, title: "Note 1", content: "Content 1", tags: ["work"] }]);
    getTags.mockResolvedValueOnce([{ id: 1, name: "work", count: 1 }]);

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText("Note 1")).toBeInTheDocument();
      expect(screen.getByText("work (1)")).toBeInTheDocument();
    });
  });

  test("App creates a note and reloads data", async () => {
    getNotes.mockResolvedValueOnce([]);
    getTags.mockResolvedValueOnce([]);

    render(<App />);

    fireEvent.change(screen.getByPlaceholderText("Title"), { target: { value: "New Note" } });
    fireEvent.change(screen.getByPlaceholderText("Content"), { target: { value: "New Content" } });
    fireEvent.click(screen.getByText("Add Note"));

    await waitFor(() => {
      expect(createNote).toHaveBeenCalled();
    });
  });

  test("App updates a note", async () => {
    getNotes.mockResolvedValueOnce([{ id: 2, title: "Old", content: "Old Content", tags: ["work"] }]);
    getTags.mockResolvedValueOnce([{ id: 1, name: "work", count: 1 }]);

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText("Old")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Edit"));
    fireEvent.change(screen.getByDisplayValue("Old"), { target: { value: "Updated" } });
    fireEvent.click(screen.getByText("Save"));

    await waitFor(() => {
      expect(updateNote).toHaveBeenCalled();
    });
  });

  test("App deletes a note", async () => {
    getNotes.mockResolvedValueOnce([{ id: 3, title: "Delete Me", content: "Bye", tags: [] }]);
    getTags.mockResolvedValueOnce([]);

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText("Delete Me")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Delete"));

    await waitFor(() => {
      expect(deleteNote).toHaveBeenCalledWith(3);
    });
  });
});

describe("NoteDetail component", () => {
  test("NoteDetail renders note data correctly", () => {
    const mockNote = {
      id: 123,
      title: "Test Note",
      content: "Test Content",
      tags: ["work", "personal"],
    };
    const onBack = jest.fn();

    render(<NoteDetail note={mockNote} onBack={onBack} />);

    expect(screen.getByText("Test Note")).toBeInTheDocument();
    expect(screen.getByText("Test Content")).toBeInTheDocument();
    expect(screen.getByText("Note ID: 123")).toBeInTheDocument();
    expect(screen.getByText("work")).toBeInTheDocument();
    expect(screen.getByText("personal")).toBeInTheDocument();
  });

  test("NoteDetail back button calls onBack", () => {
    const mockNote = { id: 1, title: "Note", content: "Content", tags: [] };
    const onBack = jest.fn();

    render(<NoteDetail note={mockNote} onBack={onBack} />);

    fireEvent.click(screen.getByText("← Back to Notes"));
    expect(onBack).toHaveBeenCalled();
  });
});

describe("View note functionality", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("App shows view button and navigates to note detail", async () => {
    const mockNote = { id: 5, title: "Viewable Note", content: "View me", tags: ["test"] };
    getNotes.mockResolvedValueOnce([mockNote]);
    getTags.mockResolvedValueOnce([{ id: 1, name: "test", count: 1 }]);
    getNoteById.mockResolvedValueOnce(mockNote);

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText("Viewable Note")).toBeInTheDocument();
    });


    getNotes.mockResolvedValueOnce([mockNote]);
    getTags.mockResolvedValueOnce([{ id: 1, name: "test", count: 1 }]);

    fireEvent.click(screen.getByText("View"));

    await waitFor(() => {
      expect(getNoteById).toHaveBeenCalledWith(5);
      expect(screen.getByText("Note ID: 5")).toBeInTheDocument();
    });
  });

  test("NoteList shows view button for each note", () => {
    const notes = [
      { id: 1, title: "Note 1", content: "Content 1", tags: ["tag1"] },
      { id: 2, title: "Note 2", content: "Content 2", tags: ["tag2"] },
    ];
    const onView = jest.fn();

    render(<NoteList notes={notes} onUpdate={jest.fn()} onDelete={jest.fn()} onView={onView} />);

    const viewButtons = screen.getAllByText("View");
    expect(viewButtons).toHaveLength(2);

    fireEvent.click(viewButtons[0]);
    expect(onView).toHaveBeenCalledWith(1);

    fireEvent.click(viewButtons[1]);
    expect(onView).toHaveBeenCalledWith(2);
  });
});
