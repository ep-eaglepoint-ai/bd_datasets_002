import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { setActivePinia, createPinia } from "pinia";
import { useNotesStore } from "@/stores/notes";
import { useAuthStore } from "@/stores/auth";
import { mount } from "@vue/test-utils";
import Search from "@/components/Search.vue";
import Editor from "@/components/Editor.vue";
import NoteList from "@/components/NoteList.vue";
import Sidebar from "@/components/Sidebar.vue";
import Login from "@/views/Login.vue";
import Register from "@/views/Register.vue";

// Mock axios
// Mock axios
const mockAxios = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
  defaults: { headers: { common: {} } },
}));

vi.mock("axios", () => ({
  default: mockAxios,
}));

// Mock lodash debounce to execute immediately in tests
vi.mock("lodash", () => ({
  debounce: (fn: any) => fn,
}));

// ===== REQUIREMENT 1: Authentication & Security =====

describe("Authentication UI", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  it("renders login form with email and password fields", () => {
    const wrapper = mount(Login, {
      global: {
        stubs: {
          RouterLink: true,
        },
      },
    });

    expect(wrapper.find('input[type="email"]').exists()).toBe(true);
    expect(wrapper.find('input[type="password"]').exists()).toBe(true);
    expect(wrapper.find('button[type="submit"]').exists()).toBe(true);
  });

  it("renders registration form", () => {
    const wrapper = mount(Register, {
      global: {
        stubs: {
          RouterLink: true,
        },
      },
    });

    expect(wrapper.find('input[type="email"]').exists()).toBe(true);
    expect(wrapper.find('input[type="password"]').exists()).toBe(true);
    expect(wrapper.find('button[type="submit"]').exists()).toBe(true);
  });

  it("stores JWT token in axios headers after login", async () => {
    const authStore = useAuthStore();
    const mockToken = "test-jwt-token";

    mockAxios.post.mockResolvedValue({
      data: { access_token: mockToken, token_type: "bearer" },
    });
    mockAxios.get.mockResolvedValue({
      data: { id: 1, email: "test@example.com" },
    });

    const formData = new FormData();
    formData.append("username", "test@example.com");
    formData.append("password", "password123");

    await authStore.login(formData);

    expect(authStore.token).toBe(mockToken);
    expect(mockAxios.defaults.headers.common["Authorization"]).toBe(
      `Bearer ${mockToken}`,
    );
  });
});

// ===== REQUIREMENT 2: Split-pane Markdown Editor =====

describe("Markdown Editor", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  it("renders split-pane editor with textarea and preview", () => {
    const store = useNotesStore();
    store.currentNote = {
      id: 1,
      title: "Test Note",
      content: "# Hello",
      notebook_id: 1,
      updated_at: new Date().toISOString(),
    };

    const wrapper = mount(Editor);

    expect(wrapper.find("textarea").exists()).toBe(true);
    expect(wrapper.find(".prose").exists()).toBe(true); // Preview pane
  });

  it("renders markdown headings in preview", async () => {
    const store = useNotesStore();
    store.currentNote = {
      id: 1,
      title: "Test",
      content: "# Heading 1\n## Heading 2",
      notebook_id: 1,
      updated_at: new Date().toISOString(),
    };

    const wrapper = mount(Editor);
    await wrapper.vm.$nextTick();

    const preview = wrapper.find(".prose").html();
    expect(preview).toContain("<h1");
    expect(preview).toContain("<h2");
  });

  it("renders markdown lists in preview", async () => {
    const store = useNotesStore();
    store.currentNote = {
      id: 1,
      title: "Test",
      content: "- Item 1\n- Item 2\n- Item 3",
      notebook_id: 1,
      updated_at: new Date().toISOString(),
    };

    const wrapper = mount(Editor);
    await wrapper.vm.$nextTick();

    const preview = wrapper.find(".prose").html();
    expect(preview).toContain("<ul");
    expect(preview).toContain("<li");
  });

  it("renders markdown code blocks in preview", async () => {
    const store = useNotesStore();
    store.currentNote = {
      id: 1,
      title: "Test",
      content: "```python\nprint('hello')\n```",
      notebook_id: 1,
      updated_at: new Date().toISOString(),
    };

    const wrapper = mount(Editor);
    await wrapper.vm.$nextTick();

    const preview = wrapper.find(".prose").html();
    expect(preview).toContain("<pre");
    expect(preview).toContain("<code");
  });

  it("renders markdown links in preview", async () => {
    const store = useNotesStore();
    store.currentNote = {
      id: 1,
      title: "Test",
      content: "[Google](https://google.com)",
      notebook_id: 1,
      updated_at: new Date().toISOString(),
    };

    const wrapper = mount(Editor);
    await wrapper.vm.$nextTick();

    const preview = wrapper.find(".prose").html();
    expect(preview).toContain('<a href="https://google.com"');
  });

  it("updates preview in real-time as user types", async () => {
    const store = useNotesStore();
    store.currentNote = {
      id: 1,
      title: "Test",
      content: "",
      notebook_id: 1,
      updated_at: new Date().toISOString(),
    };

    const wrapper = mount(Editor);
    const textarea = wrapper.find("textarea");

    await textarea.setValue("# New Content");
    await wrapper.vm.$nextTick();

    const preview = wrapper.find(".prose").html();
    expect(preview).toContain("<h1");
    expect(preview).toContain("New Content");
  });
});

// ===== REQUIREMENT 3: Auto-save with Debouncing =====

describe("Auto-save Functionality", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    setActivePinia(createPinia());
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  it("triggers save after content changes", async () => {
    const store = useNotesStore();
    store.currentNote = {
      id: 1,
      title: "Test",
      content: "Original",
      notebook_id: 1,
      updated_at: new Date().toISOString(),
    };

    mockAxios.put.mockResolvedValue({
      data: {
        id: 1,
        title: "Test",
        content: "Updated",
        notebook_id: 1,
        updated_at: new Date().toISOString(),
      },
    });

    const wrapper = mount(Editor);
    const textarea = wrapper.find("textarea");

    await textarea.setValue("Updated content");
    await wrapper.vm.$nextTick();

    // Since debounce is mocked to execute immediately, the update should be called
    expect(mockAxios.put).toHaveBeenCalled();
  });

  it("displays saving indicator", async () => {
    const store = useNotesStore();
    store.currentNote = {
      id: 1,
      title: "Test",
      content: "Content",
      notebook_id: 1,
      updated_at: new Date().toISOString(),
    };
    store.saving = true;

    const wrapper = mount(Editor);
    await wrapper.vm.$nextTick();

    expect(wrapper.text()).toContain("Saving...");
  });

  it("displays saved indicator when not saving", async () => {
    const store = useNotesStore();
    store.currentNote = {
      id: 1,
      title: "Test",
      content: "Content",
      notebook_id: 1,
      updated_at: new Date().toISOString(),
    };
    store.saving = false;

    const wrapper = mount(Editor);
    await wrapper.vm.$nextTick();

    expect(wrapper.text()).toContain("Saved");
  });

  it("handles offline scenario gracefully", async () => {
    const store = useNotesStore();

    // Mock network error
    mockAxios.put.mockRejectedValue(new Error("Network error"));

    await store.updateNote(1, { content: "Updated" });

    // Should not throw error, should handle gracefully
    // Advance timers because updateNote uses setTimeout in finally
    vi.runAllTimers();
    expect(store.saving).toBe(false);
    expect(store.saving).toBe(false);
  });

  afterEach(() => {
    vi.useRealTimers();
  });
});

// ===== REQUIREMENT 4: Notebook Organization =====

describe("Notebook Organization", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  it("creates notebooks via store", async () => {
    const store = useNotesStore();

    mockAxios.post.mockResolvedValue({
      data: { id: 1, name: "Test Notebook" },
    });

    await store.createNotebook("Test Notebook");

    expect(store.notebooks.length).toBe(1);
    expect(store.notebooks[0].name).toBe("Test Notebook");
  });

  it("displays notebooks in sidebar", () => {
    const store = useNotesStore();
    store.notebooks = [
      { id: 1, name: "Work" },
      { id: 2, name: "Personal" },
    ];

    const wrapper = mount(Sidebar);

    expect(wrapper.text()).toContain("Work");
    expect(wrapper.text()).toContain("Personal");
  });

  it("supports moving notes between notebooks", async () => {
    const store = useNotesStore();
    store.currentNote = {
      id: 1,
      title: "Test",
      content: "Content",
      notebook_id: 1,
      updated_at: new Date().toISOString(),
    };
    store.notebooks = [
      { id: 1, name: "Notebook 1" },
      { id: 2, name: "Notebook 2" },
    ];

    mockAxios.put.mockResolvedValue({
      data: {
        id: 1,
        title: "Test",
        content: "Content",
        notebook_id: 2,
        updated_at: new Date().toISOString(),
      },
    });

    const wrapper = mount(Editor);
    const select = wrapper.find("select");

    await select.setValue(2);
    await wrapper.vm.$nextTick();

    expect(mockAxios.put).toHaveBeenCalledWith(
      expect.stringContaining("/notes/1"),
      expect.objectContaining({ notebook_id: 2 }),
    );
  });

  it("provides All Notes view", async () => {
    const store = useNotesStore();

    mockAxios.get.mockResolvedValue({
      data: [
        { id: 1, title: "Note 1", notebook_id: 1 },
        { id: 2, title: "Note 2", notebook_id: 2 },
      ],
    });

    // Fetch all notes without notebook filter
    await store.fetchNotes(null);

    expect(store.notes.length).toBe(2);
  });
});

// ===== REQUIREMENT 5: Search Functionality =====

describe("Search Component", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  it("renders search input", () => {
    const wrapper = mount(Search);
    expect(wrapper.find("input").exists()).toBe(true);
  });

  it("updates search query on input", async () => {
    const store = useNotesStore();
    const wrapper = mount(Search);
    const input = wrapper.find("input");

    await input.setValue("test query");
    await wrapper.vm.$nextTick();

    expect(store.searchQuery).toBe("test query");
  });

  it("triggers search on query change", async () => {
    const store = useNotesStore();

    mockAxios.get.mockResolvedValue({
      data: [{ id: 1, title: "Python Tutorial", content: "Learn Python" }],
    });

    store.searchQuery = "Python";
    await store.fetchNotes(null, "Python");

    expect(mockAxios.get).toHaveBeenCalledWith(
      expect.stringContaining("search=Python"),
    );
  });

  it("filters search by notebook", async () => {
    const store = useNotesStore();

    mockAxios.get.mockResolvedValue({
      data: [{ id: 1, title: "Note 1" }],
    });

    await store.fetchNotes(1, "test");

    expect(mockAxios.get).toHaveBeenCalledWith(
      expect.stringContaining("notebook_id=1"),
    );
    expect(mockAxios.get).toHaveBeenCalledWith(
      expect.stringContaining("search=test"),
    );
  });
});

// ===== REQUIREMENT 6: Note List Display =====

describe("Note List Sidebar", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  it("renders note list with titles", () => {
    const store = useNotesStore();
    store.notes = [
      {
        id: 1,
        title: "First Note",
        content: "Content",
        notebook_id: 1,
        updated_at: new Date().toISOString(),
      },
      {
        id: 2,
        title: "Second Note",
        content: "Content",
        notebook_id: 1,
        updated_at: new Date().toISOString(),
      },
    ];

    const wrapper = mount(NoteList);

    expect(wrapper.text()).toContain("First Note");
    expect(wrapper.text()).toContain("Second Note");
  });

  it("displays last modified date for each note", () => {
    const store = useNotesStore();
    const now = new Date();
    store.notes = [
      {
        id: 1,
        title: "Test Note",
        content: "Content",
        notebook_id: 1,
        updated_at: now.toISOString(),
      },
    ];

    const wrapper = mount(NoteList);

    // Should display relative time (e.g., "less than a minute ago")
    expect(wrapper.text()).toContain("ago");
  });

  it("supports clicking notes to select them", async () => {
    const store = useNotesStore();
    const note = {
      id: 1,
      title: "Test Note",
      content: "Content",
      notebook_id: 1,
      updated_at: new Date().toISOString(),
    };
    store.notes = [note];

    const wrapper = mount(NoteList);
    const noteItem = wrapper.find(".cursor-pointer");

    await noteItem.trigger("click");
    await wrapper.vm.$nextTick();

    expect(store.currentNote?.id).toBe(1);
  });

  it("displays note count", () => {
    const store = useNotesStore();
    store.notes = [
      {
        id: 1,
        title: "Note 1",
        content: "",
        notebook_id: 1,
        updated_at: new Date().toISOString(),
      },
      {
        id: 2,
        title: "Note 2",
        content: "",
        notebook_id: 1,
        updated_at: new Date().toISOString(),
      },
      {
        id: 3,
        title: "Note 3",
        content: "",
        notebook_id: 1,
        updated_at: new Date().toISOString(),
      },
    ];

    const wrapper = mount(NoteList);

    // Should render 3 note items
    const noteItems = wrapper.findAll(".cursor-pointer");
    expect(noteItems.length).toBe(3);
  });

  it("shows empty state when no notes", () => {
    const store = useNotesStore();
    store.notes = [];
    store.loading = false;

    const wrapper = mount(NoteList);

    expect(wrapper.text()).toContain("No notes found");
  });

  it("notes are sorted by most recently modified", async () => {
    const store = useNotesStore();

    mockAxios.get.mockResolvedValue({
      data: [
        {
          id: 2,
          title: "Newer Note",
          updated_at: new Date(Date.now() + 1000).toISOString(),
        },
        {
          id: 1,
          title: "Older Note",
          updated_at: new Date(Date.now()).toISOString(),
        },
      ],
    });

    await store.fetchNotes();

    // First note should be the newer one
    expect(store.notes[0].title).toBe("Newer Note");
    expect(store.notes[1].title).toBe("Older Note");
  });
});
