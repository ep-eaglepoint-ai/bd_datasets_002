const API_BASE_URL = process.env.API_BASE_URL || "http://localhost:3001";
const API_PREFIX = process.env.API_PREFIX ?? "/api";

function normalizePrefix(prefix) {
  if (!prefix || prefix === "/") return "";
  return prefix.startsWith("/") ? prefix.replace(/\/$/, "") : `/${prefix.replace(/\/$/, "")}`;
}

const PREFIX = normalizePrefix(API_PREFIX);

function endpoint(path) {
  return `${API_BASE_URL}${PREFIX}${path}`;
}

async function request(url, options = {}) {
  const response = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  });

  const text = await response.text();
  let json = null;
  if (text) {
    try {
      json = JSON.parse(text);
    } catch (err) {
      json = null;
    }
  }

  return { response, json, text };
}

describe("Notes API lifecycle", () => {
  test("create, retrieve, filter, update, delete, and tag counts", async () => {
    const unique = `jest-${Date.now()}`;
    const tags = [`${unique}-work`, `${unique}-personal`];

    // Create
    const createPayload = {
      title: "Jest Note",
      content: "Hello from Jest",
      tags,
    };

    const createRes = await request(endpoint("/notes"), {
      method: "POST",
      body: JSON.stringify(createPayload),
    });

    expect(createRes.response.ok).toBe(true);
    expect(createRes.json).toBeTruthy();
    expect(createRes.json.id).toBeDefined();

    const noteId = createRes.json.id;
    const returnedTags = (createRes.json.tags || []).map((t) => String(t).toLowerCase());

    tags.forEach((tag) => {
      expect(returnedTags).toContain(tag.toLowerCase());
    });

    // Get by id
    const getRes = await request(endpoint(`/notes/${noteId}`));
    expect(getRes.response.ok).toBe(true);
    expect(getRes.json.id).toBe(noteId);

    // Get all
    const allRes = await request(endpoint("/notes"));
    expect(allRes.response.ok).toBe(true);
    expect(Array.isArray(allRes.json)).toBe(true);

    // Filter by tag
    const filterRes = await request(endpoint(`/notes?tag=${encodeURIComponent(tags[0])}`));
    expect(filterRes.response.ok).toBe(true);
    expect(Array.isArray(filterRes.json)).toBe(true);
    const found = filterRes.json.find((n) => n.id === noteId);
    expect(found).toBeTruthy();

    // Tag counts
    const tagsRes = await request(endpoint("/tags"));
    expect(tagsRes.response.ok).toBe(true);
    expect(Array.isArray(tagsRes.json)).toBe(true);

    const tagEntry = tagsRes.json.find((t) => String(t.name).toLowerCase() === tags[0].toLowerCase());
    expect(tagEntry).toBeTruthy();
    expect(Number(tagEntry.count)).toBeGreaterThanOrEqual(1);

    // Update note and tags
    const updatePayload = {
      title: "Updated Jest Note",
      content: "Updated content",
      tags: [tags[0]],
    };

    const updateRes = await request(endpoint(`/notes/${noteId}`), {
      method: "PUT",
      body: JSON.stringify(updatePayload),
    });
    expect(updateRes.response.ok).toBe(true);

    const updatedTags = (updateRes.json.tags || []).map((t) => String(t).toLowerCase());
    expect(updatedTags).toContain(tags[0].toLowerCase());
    expect(updatedTags).not.toContain(tags[1].toLowerCase());

    // Delete
    const deleteRes = await request(endpoint(`/notes/${noteId}`), {
      method: "DELETE",
    });
    expect(deleteRes.response.ok).toBe(true);

    // Ensure note is gone
    const afterDeleteRes = await request(endpoint(`/notes/${noteId}`));
    expect(afterDeleteRes.response.ok).toBe(false);
  });
});

describe("Notes API edge cases", () => {
  test("create note with empty tags array", async () => {
    const createRes = await request(endpoint("/notes"), {
      method: "POST",
      body: JSON.stringify({
        title: "Note with no tags",
        content: "Content here",
        tags: [],
      }),
    });

    expect(createRes.response.ok).toBe(true);
    expect(createRes.json.id).toBeDefined();
    expect(Array.isArray(createRes.json.tags)).toBe(true);
    expect(createRes.json.tags.length).toBe(0);

    // Cleanup
    await request(endpoint(`/notes/${createRes.json.id}`), { method: "DELETE" });
  });

  test("create note without tags field", async () => {
    const createRes = await request(endpoint("/notes"), {
      method: "POST",
      body: JSON.stringify({
        title: "Note without tags field",
        content: "Content here",
      }),
    });

    expect(createRes.response.ok).toBe(true);
    expect(createRes.json.id).toBeDefined();

    // Cleanup
    await request(endpoint(`/notes/${createRes.json.id}`), { method: "DELETE" });
  });

  test("filter by non-existent tag returns empty array", async () => {
    const nonExistentTag = `nonexistent-${Date.now()}`;
    const filterRes = await request(endpoint(`/notes?tag=${encodeURIComponent(nonExistentTag)}`));

    expect(filterRes.response.ok).toBe(true);
    expect(Array.isArray(filterRes.json)).toBe(true);
    expect(filterRes.json.length).toBe(0);
  });

  test("get note with invalid ID format returns 400", async () => {
    const invalidRes = await request(endpoint("/notes/invalid-id"));
    expect(invalidRes.response.status).toBe(400);
  });

  test("get note with non-existent ID returns 404", async () => {
    const notFoundRes = await request(endpoint("/notes/999999999"));
    expect(notFoundRes.response.status).toBe(404);
  });

  test("create note without title returns 400", async () => {
    const createRes = await request(endpoint("/notes"), {
      method: "POST",
      body: JSON.stringify({
        content: "Content without title",
      }),
    });

    expect(createRes.response.status).toBe(400);
  });

  test("create note without content returns 400", async () => {
    const createRes = await request(endpoint("/notes"), {
      method: "POST",
      body: JSON.stringify({
        title: "Title without content",
      }),
    });

    expect(createRes.response.status).toBe(400);
  });

  test("update non-existent note returns 404", async () => {
    const updateRes = await request(endpoint("/notes/999999999"), {
      method: "PUT",
      body: JSON.stringify({ title: "Updated" }),
    });

    expect(updateRes.response.status).toBe(404);
  });

  test("delete non-existent note returns 404", async () => {
    const deleteRes = await request(endpoint("/notes/999999999"), {
      method: "DELETE",
    });

    expect(deleteRes.response.status).toBe(404);
  });
});
