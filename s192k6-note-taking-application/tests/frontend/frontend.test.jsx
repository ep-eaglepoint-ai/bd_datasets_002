import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import App from "@/client/src/App.jsx";
import NoteForm from "@/client/src/components/NoteForm.jsx";
import NoteList from "@/client/src/components/NoteList.jsx";
import TagFilter from "@/client/src/components/TagFilter.jsx";

jest.mock("@/client/src/api/notesApi.js", () => ({
  getNotes: jest.fn(),
  getTags: jest.fn(),
  createNote: jest.fn(),
  updateNote: jest.fn(),
  deleteNote: jest.fn(),
}));

import { getNotes, getTags, createNote, updateNote, deleteNote } from "@/client/src/api/notesApi.js";

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
    render(<NoteList notes={[]} onUpdate={jest.fn()} onDelete={jest.fn()} />);
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
