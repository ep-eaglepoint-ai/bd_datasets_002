import React from "react";
import path from "path";
import { render, screen, within, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const appPath = process.env.APP_UNDER_TEST
  ? path.resolve(process.env.APP_UNDER_TEST)
  : path.resolve(__dirname, "../src/App.jsx");
const App = require(appPath).default;

const advanceTime = async (ms) => {
  await act(async () => {
    jest.advanceTimersByTime(ms);
  });
};

const setSystemTime = (dateNowSpy, isoString) => {
  const date = new Date(isoString);
  jest.setSystemTime(date);
  dateNowSpy.mockReturnValue(date.getTime());
};

const renderApp = () => {
  const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
  render(<App />);
  return { user };
};

const completeInitialLoad = async () => {
  await advanceTime(100);
};

const createNote = async (user, { title, content, tags = [] }) => {
  const titleInput = screen.getByPlaceholderText("Enter note title");
  const contentInput = screen.getByPlaceholderText("Enter note content");

  await user.clear(titleInput);
  await user.type(titleInput, title);
  await user.clear(contentInput);
  await user.type(contentInput, content);

  if (tags.length > 0) {
    const tagInput = screen.getByPlaceholderText(/add tags/i);
    for (const tag of tags) {
      await user.clear(tagInput);
      await user.type(tagInput, `${tag}{enter}`);
    }
  }

  await user.click(screen.getByRole("button", { name: /create note/i }));
  await advanceTime(100);
};

describe("Note Taker Application", () => {
  let dateNowSpy;

  beforeEach(() => {
    jest.useFakeTimers();
    dateNowSpy = jest.spyOn(Date, "now");
    setSystemTime(dateNowSpy, "2026-01-01T00:00:00.000Z");
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  describe("Initial Render and Async Loading", () => {
    test("uses fake timers and deterministic timestamps", async () => {
      renderApp();

      const timerId = setTimeout(() => {}, 10);
      expect(jest.getTimerCount()).toBe(1);
      clearTimeout(timerId);

      expect(Date.now()).toBe(new Date("2026-01-01T00:00:00.000Z").getTime());
    });

    test("renders header and loading, then empty state", async () => {
      renderApp();

      expect(screen.getByText("📚 Note Taker Application")).toBeInTheDocument();
      expect(screen.getByText(/loading notes/i)).toBeInTheDocument();

      await advanceTime(100);

      expect(screen.queryByText(/loading notes/i)).not.toBeInTheDocument();
      expect(screen.getByText(/no notes found/i)).toBeInTheDocument();
      expect(screen.getByText(/All Notes \(0\)/)).toBeInTheDocument();
    });

    test("honors mockAPI delays for loading transition", async () => {
      renderApp();

      expect(screen.getByText(/loading notes/i)).toBeInTheDocument();
      await advanceTime(99);
      expect(screen.getByText(/loading notes/i)).toBeInTheDocument();

      await advanceTime(1);
      expect(screen.queryByText(/loading notes/i)).not.toBeInTheDocument();
      expect(screen.getByText(/no notes found/i)).toBeInTheDocument();
    });
  });

  describe("Create Note", () => {
    test("creating a note adds it to the list with correct content", async () => {
      const { user } = renderApp();
      await completeInitialLoad();

      await createNote(user, {
        title: "Test Note Title",
        content: "Test note content here",
      });

      expect(screen.getByText("Test Note Title")).toBeInTheDocument();
      expect(screen.getByText("Test note content here")).toBeInTheDocument();
    });

    test("created note displays correct title and content", async () => {
      const { user } = renderApp();
      await completeInitialLoad();

      await createNote(user, {
        title: "Display Title",
        content: "Display content",
      });

      expect(screen.getByText("Display Title")).toBeInTheDocument();
      expect(screen.getByText("Display content")).toBeInTheDocument();
    });

    test("All Notes count increments after creation", async () => {
      const { user } = renderApp();
      await completeInitialLoad();

      const allNotesText = screen.getByText(/All Notes \(\d+\)/).textContent;
      const initialCount = parseInt(allNotesText.match(/\((\d+)\)/)[1], 10);

      await createNote(user, {
        title: "Count Note",
        content: "Count note content",
      });

      expect(
        screen.getByText(`All Notes (${initialCount + 1})`),
      ).toBeInTheDocument();
    });

    test("creating a note with tags updates TagFilter counts after async loadTags", async () => {
      const { user } = renderApp();
      await completeInitialLoad();

      await createNote(user, {
        title: "Tagged Note",
        content: "Tagged content",
        tags: ["react"],
      });

      const sidebar = screen.getByText("🏷️ Filter by Tag").closest("div");
      expect(within(sidebar).queryByText("react")).not.toBeInTheDocument();

      await advanceTime(50);

      const tagButton = within(sidebar).getByText("react").closest("button");
      expect(within(tagButton).getByText("1")).toBeInTheDocument();
    });

    test("async ordering keeps tag list stale until loadTags finishes", async () => {
      const { user } = renderApp();
      await completeInitialLoad();

      await createNote(user, {
        title: "Ordering Note",
        content: "Ordering content",
        tags: ["ordering"],
      });

      const sidebar = screen.getByText("🏷️ Filter by Tag").closest("div");
      expect(within(sidebar).queryByText("ordering")).not.toBeInTheDocument();

      await advanceTime(50);
      expect(within(sidebar).getByText("ordering")).toBeInTheDocument();
    });
  });

  describe("Form Validation", () => {
    test("submitting with empty title triggers alert and no note is created", async () => {
      const { user } = renderApp();
      await completeInitialLoad();

      const alertMock = jest
        .spyOn(window, "alert")
        .mockImplementation(() => {});

      await user.type(
        screen.getByPlaceholderText("Enter note content"),
        "Only content",
      );
      await user.click(screen.getByRole("button", { name: /create note/i }));

      expect(alertMock).toHaveBeenCalledWith(
        "Please fill in both title and content",
      );
      expect(screen.queryByText("Only content")).not.toBeInTheDocument();
    });

    test("submitting with empty content triggers alert and no note is created", async () => {
      const { user } = renderApp();
      await completeInitialLoad();

      const alertMock = jest
        .spyOn(window, "alert")
        .mockImplementation(() => {});

      await user.type(
        screen.getByPlaceholderText("Enter note title"),
        "Only title",
      );
      await user.click(screen.getByRole("button", { name: /create note/i }));

      expect(alertMock).toHaveBeenCalledWith(
        "Please fill in both title and content",
      );
      expect(screen.queryByText("Only title")).not.toBeInTheDocument();
    });
  });

  describe("Tag Input and Management", () => {
    test("pressing Enter adds a tag chip and clears input", async () => {
      const { user } = renderApp();
      await completeInitialLoad();

      const tagInput = screen.getByPlaceholderText(/add tags/i);
      await user.type(tagInput, "entertag{enter}");

      const formSection = screen.getByText(/create new note/i).closest("div");
      expect(within(formSection).getByText("entertag")).toBeInTheDocument();
      expect(tagInput).toHaveValue("");
    });

    test("pressing comma adds a tag chip", async () => {
      const { user } = renderApp();
      await completeInitialLoad();

      const tagInput = screen.getByPlaceholderText(/add tags/i);
      await user.type(tagInput, "commatag,");

      const formSection = screen.getByText(/create new note/i).closest("div");
      expect(within(formSection).getByText("commatag")).toBeInTheDocument();
    });

    test("blurring tag input adds a tag chip", async () => {
      const { user } = renderApp();
      await completeInitialLoad();

      const tagInput = screen.getByPlaceholderText(/add tags/i);
      await user.type(tagInput, "blurtag");
      tagInput.blur();

      const formSection = screen.getByText(/create new note/i).closest("div");
      expect(within(formSection).getByText("blurtag")).toBeInTheDocument();
    });

    test("duplicate tags are not added", async () => {
      const { user } = renderApp();
      await completeInitialLoad();

      const tagInput = screen.getByPlaceholderText(/add tags/i);
      await user.type(tagInput, "dup{enter}");
      await user.type(tagInput, "dup{enter}");

      const formSection = screen.getByText(/create new note/i).closest("div");
      const tags = within(formSection).getAllByText("dup");
      expect(tags).toHaveLength(1);
    });

    test("clicking × removes a tag chip", async () => {
      const { user } = renderApp();
      await completeInitialLoad();

      const tagInput = screen.getByPlaceholderText(/add tags/i);
      await user.type(tagInput, "remove{enter}");

      const formSection = screen.getByText(/create new note/i).closest("div");
      const removeButton = within(formSection).getByRole("button", {
        name: "×",
      });
      await user.click(removeButton);

      expect(within(formSection).queryByText("remove")).not.toBeInTheDocument();
    });
  });

  describe("Tag Filter", () => {
    test("creating notes with different tags shows tags with correct counts", async () => {
      const { user } = renderApp();
      await completeInitialLoad();

      await createNote(user, {
        title: "React Note",
        content: "React content",
        tags: ["react"],
      });
      await advanceTime(50);
      await createNote(user, {
        title: "Redux Note",
        content: "Redux content",
        tags: ["redux"],
      });
      await advanceTime(50);

      const sidebar = screen.getByText("🏷️ Filter by Tag").closest("div");
      const reactButton = within(sidebar).getByText("react").closest("button");
      const reduxButton = within(sidebar).getByText("redux").closest("button");

      expect(within(reactButton).getByText("1")).toBeInTheDocument();
      expect(within(reduxButton).getByText("1")).toBeInTheDocument();
    });

    test("clicking a tag filters notes and shows loading state until resolved", async () => {
      const { user } = renderApp();
      await completeInitialLoad();

      await createNote(user, {
        title: "React Note",
        content: "React content",
        tags: ["react"],
      });
      await advanceTime(50);
      await createNote(user, {
        title: "Vue Note",
        content: "Vue content",
        tags: ["vue"],
      });
      await advanceTime(50);

      const sidebar = screen.getByText("🏷️ Filter by Tag").closest("div");
      await user.click(within(sidebar).getByText("react"));

      expect(screen.getByText(/loading notes/i)).toBeInTheDocument();
      expect(screen.queryByText("React Note")).not.toBeInTheDocument();
      expect(screen.queryByText("Vue Note")).not.toBeInTheDocument();

      await advanceTime(100);

      expect(screen.getByText("React Note")).toBeInTheDocument();
      expect(screen.queryByText("Vue Note")).not.toBeInTheDocument();
    });

    test("clicking All Notes clears tag filter and restores list", async () => {
      const { user } = renderApp();
      await completeInitialLoad();

      await createNote(user, {
        title: "React Note",
        content: "React content",
        tags: ["react"],
      });
      await advanceTime(50);
      await createNote(user, {
        title: "Vue Note",
        content: "Vue content",
        tags: ["vue"],
      });
      await advanceTime(50);

      const sidebar = screen.getByText("🏷️ Filter by Tag").closest("div");
      await user.click(within(sidebar).getByText("react"));
      await advanceTime(100);

      expect(screen.getByText("React Note")).toBeInTheDocument();
      expect(screen.queryByText("Vue Note")).not.toBeInTheDocument();

      await user.click(within(sidebar).getByText("All Notes"));
      await advanceTime(100);

      expect(screen.getByText("React Note")).toBeInTheDocument();
      expect(screen.getByText("Vue Note")).toBeInTheDocument();
    });
  });

  describe("Edit Note", () => {
    test("clicking edit enters edit mode and pre-fills form fields", async () => {
      const { user } = renderApp();
      await completeInitialLoad();

      await createNote(user, { title: "Edit Me", content: "Edit content" });

      const noteCard = screen.getByText("Edit Me").closest("div[style]");
      await user.click(within(noteCard).getByTitle("Edit note"));

      expect(screen.getByText(/edit note/i)).toBeInTheDocument();
      expect(screen.getByDisplayValue("Edit Me")).toBeInTheDocument();
      expect(screen.getByDisplayValue("Edit content")).toBeInTheDocument();
    });

    test("submitting in edit mode updates the note and timestamp", async () => {
      const { user } = renderApp();
      await completeInitialLoad();

      await createNote(user, {
        title: "Original",
        content: "Original content",
      });

      const noteCard = screen.getByText("Original").closest("div[style]");
      const updatedLabelBefore =
        within(noteCard).getByText(/Updated:/).textContent;

      await user.click(within(noteCard).getByTitle("Edit note"));

      setSystemTime(dateNowSpy, "2026-01-01T01:00:00.000Z");

      const titleInput = screen.getByDisplayValue("Original");
      await user.clear(titleInput);
      await user.type(titleInput, "Updated Title");
      await user.click(screen.getByRole("button", { name: /update note/i }));
      await advanceTime(100);

      expect(screen.getByText("Updated Title")).toBeInTheDocument();
      expect(screen.queryByText("Original")).not.toBeInTheDocument();

      const updatedLabelAfter = screen.getByText(/Updated:/).textContent;
      expect(updatedLabelAfter).not.toEqual(updatedLabelBefore);
    });

    test("clicking Cancel exits edit mode without applying changes", async () => {
      const { user } = renderApp();
      await completeInitialLoad();

      await createNote(user, { title: "Keep Title", content: "Keep content" });

      const noteCard = screen.getByText("Keep Title").closest("div[style]");
      await user.click(within(noteCard).getByTitle("Edit note"));

      const titleInput = screen.getByDisplayValue("Keep Title");
      await user.clear(titleInput);
      await user.type(titleInput, "Changed Title");

      await user.click(screen.getByRole("button", { name: /cancel/i }));

      expect(screen.getByText(/create new note/i)).toBeInTheDocument();
      expect(screen.getByText("Keep Title")).toBeInTheDocument();
      expect(screen.queryByText("Changed Title")).not.toBeInTheDocument();
    });
  });

  describe("Delete Note", () => {
    test("confirm false prevents deletion", async () => {
      const { user } = renderApp();
      await completeInitialLoad();

      await createNote(user, { title: "Keep Me", content: "Keep content" });

      const confirmMock = jest.spyOn(window, "confirm").mockReturnValue(false);
      const noteCard = screen.getByText("Keep Me").closest("div[style]");
      await user.click(within(noteCard).getByTitle("Delete note"));

      expect(confirmMock).toHaveBeenCalledWith(
        "Are you sure you want to delete this note?",
      );
      expect(screen.getByText("Keep Me")).toBeInTheDocument();
    });

    test("confirm true deletes the note and updates tag counts", async () => {
      const { user } = renderApp();
      await completeInitialLoad();

      await createNote(user, {
        title: "Delete Me",
        content: "Delete content",
        tags: ["cleanup"],
      });
      await advanceTime(50);

      const sidebar = screen.getByText("🏷️ Filter by Tag").closest("div");
      expect(within(sidebar).getByText("cleanup")).toBeInTheDocument();

      jest.spyOn(window, "confirm").mockReturnValue(true);
      const noteCard = screen.getByText("Delete Me").closest("div[style]");
      await user.click(within(noteCard).getByTitle("Delete note"));
      await advanceTime(100);
      await advanceTime(50);

      expect(screen.queryByText("Delete Me")).not.toBeInTheDocument();
      expect(within(sidebar).queryByText("cleanup")).not.toBeInTheDocument();
    });

    test("deleting last note shows empty state again", async () => {
      const { user } = renderApp();
      await completeInitialLoad();

      await createNote(user, { title: "Last Note", content: "Last content" });

      jest.spyOn(window, "confirm").mockReturnValue(true);
      const noteCard = screen.getByText("Last Note").closest("div[style]");
      await user.click(within(noteCard).getByTitle("Delete note"));
      await advanceTime(100);

      expect(screen.getByText(/no notes found/i)).toBeInTheDocument();
    });
  });
});
