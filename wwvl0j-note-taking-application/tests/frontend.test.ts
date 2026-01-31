import { describe, it, expect, vi } from "vitest";
import { setActivePinia, createPinia } from "pinia";
import { useNotesStore } from "../repository_after/frontend/src/stores/notes";
import { mount } from "@vue/test-utils";
import Search from "../repository_after/frontend/src/components/Search.vue";

// Mock axios
vi.mock("axios", () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    defaults: { headers: { common: {} } },
  },
}));

describe("Notes Store", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it("creates a notebook", async () => {
    const store = useNotesStore();
    // Mock implementation to return data
    const axios = await import("axios");
    // @ts-ignore
    axios.default.post.mockResolvedValue({ data: { id: 1, name: "Test NB" } });

    await store.createNotebook("Test NB");
    expect(store.notebooks.length).toBe(1);
    expect(store.notebooks[0].name).toBe("Test NB");
  });
});

describe("Search Component", () => {
  // Basic rendering test
  it("renders search input", () => {
    const wrapper = mount(Search);
    expect(wrapper.find("input").exists()).toBe(true);
  });
});
