import React from "react";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  within,
} from "@testing-library/react";
import "@testing-library/jest-dom";
import App from "../repository_after/src/App.jsx";

// Helper function to create a note through the UI
const createNote = async (title, content, tags = []) => {
  const titleInput = screen.getByPlaceholderText(/enter note title/i);
  const contentInput = screen.getByPlaceholderText(/enter note content/i);

  fireEvent.change(titleInput, { target: { value: title } });
  fireEvent.change(contentInput, { target: { value: content } });

  for (const tag of tags) {
    const tagInput = screen.getByPlaceholderText(/add tags/i);
    fireEvent.change(tagInput, { target: { value: tag } });
    fireEvent.keyDown(tagInput, { key: "Enter" });
  }

  const createButton = screen.getByRole("button", { name: /create note/i });
  fireEvent.click(createButton);

  await waitFor(() => {
    expect(screen.getByText(title)).toBeInTheDocument();
  });
};

describe("React Notes", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("should filter notes by date range", async () => {
    render(<App />);

    await createNote("Today Note", "Created today");

    const dateSelect = screen.getByLabelText(/date range/i);
    const options = within(dateSelect).getAllByRole("option");

    // Verify all 4 date options
    expect(options).toHaveLength(4);
    expect(options[0]).toHaveTextContent("All Time");
    expect(options[1]).toHaveTextContent("Today");
    expect(options[2]).toHaveTextContent("This Week");
    expect(options[3]).toHaveTextContent("This Month");

    // Test today filter
    fireEvent.change(dateSelect, { target: { value: "today" } });
    await waitFor(() => {
      expect(screen.getByText("Today Note")).toBeInTheDocument();
    });
  });

  test("should show all notes when search is empty", async () => {
    render(<App />);

    await createNote("Note One", "Content one");
    await createNote("Note Two", "Content two");

    const searchInput = screen.getByPlaceholderText(
      /search by title or content/i,
    );

    // Filter then clear
    fireEvent.change(searchInput, { target: { value: "one" } });
    await waitFor(() => {
      expect(screen.queryByText("Note Two")).not.toBeInTheDocument();
    });

    fireEvent.change(searchInput, { target: { value: "" } });
    await waitFor(() => {
      expect(screen.getByText("Note One")).toBeInTheDocument();
      expect(screen.getByText("Note Two")).toBeInTheDocument();
    });
  });

  test("should have import button for JSON files", async () => {
    render(<App />);

    const importButton = screen.getByRole("button", { name: /import notes/i });
    expect(importButton).toBeInTheDocument();
  });

  test("should generate unique IDs for all notes", async () => {
    render(<App />);

    await createNote("Note 1", "Content 1");
    await createNote("Note 2", "Content 2");

    expect(screen.getByText("Note 1")).toBeInTheDocument();
    expect(screen.getByText("Note 2")).toBeInTheDocument();
  });

  test("should validate required fields", async () => {
    render(<App />);

    const createButton = screen.getByRole("button", { name: /create note/i });
    fireEvent.click(createButton);

    expect(global.alert).toHaveBeenCalledWith(
      "Please fill in both title and content",
    );
  });

  test("should create notes with timestamps", async () => {
    render(<App />);

    await createNote("Timestamped Note", "Has timestamps");

    expect(screen.getByText(/updated:/i)).toBeInTheDocument();
  });

  test("should support create, edit, delete operations", async () => {
    render(<App />);

    // Create
    await createNote("Test Note", "Test content");
    expect(screen.getByText("Test Note")).toBeInTheDocument();

    // Edit
    const editButton = screen.getByTitle(/edit note/i);
    fireEvent.click(editButton);

    await waitFor(() => {
      expect(screen.getByDisplayValue("Test Note")).toBeInTheDocument();
    });

    const titleInput = screen.getByDisplayValue("Test Note");
    fireEvent.change(titleInput, { target: { value: "Updated Note" } });

    const updateButton = screen.getByRole("button", { name: /update note/i });
    fireEvent.click(updateButton);

    await waitFor(() => {
      expect(screen.getByText("Updated Note")).toBeInTheDocument();
    });

    // Delete
    const deleteButton = screen.getByTitle(/delete note/i);
    fireEvent.click(deleteButton);

    await waitFor(() => {
      expect(screen.queryByText("Updated Note")).not.toBeInTheDocument();
    });
  });

  test("should use React state without localStorage", () => {
    render(<App />);

    const localStorageSpy = jest.spyOn(Storage.prototype, "setItem");
    const sessionStorageSpy = jest.spyOn(Storage.prototype, "getItem");

    const titleInput = screen.getByPlaceholderText(/enter note title/i);
    fireEvent.change(titleInput, { target: { value: "Test" } });

    expect(localStorageSpy).not.toHaveBeenCalled();
    expect(sessionStorageSpy).not.toHaveBeenCalled();

    localStorageSpy.mockRestore();
    sessionStorageSpy.mockRestore();
  });

  test("Should filter notes by tags", async () => {
    render(<App />);

    await createNote("Tagged Note", "Has tag", ["important"]);
    await createNote("Other Note", "No tag", []);

    await waitFor(() => {
      expect(screen.getAllByText("important")[0]).toBeInTheDocument();
    });

    const importantTagButton = screen.getByRole("button", {
      name: /important\s+1/i,
    });
    fireEvent.click(importantTagButton);

    await waitFor(() => {
      expect(screen.getByText("Tagged Note")).toBeInTheDocument();
      expect(screen.queryByText("Other Note")).not.toBeInTheDocument();
    });
  });
});
