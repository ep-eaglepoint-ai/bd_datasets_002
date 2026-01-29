const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

export async function getNotes(tag) {
  const url = tag ? `${API_URL}/api/notes?tag=${encodeURIComponent(tag)}` : `${API_URL}/api/notes`;
  const res = await fetch(url);
  return res.json();
}

export async function getNoteById(id) {
  const res = await fetch(`${API_URL}/api/notes/${id}`);
  if (!res.ok) {
    throw new Error("Note not found");
  }
  return res.json();
}

export async function getTags() {
  const res = await fetch(`${API_URL}/api/tags`);
  return res.json();
}

export async function createNote(note) {
  await fetch(`${API_URL}/api/notes`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(note),
  });
}

export async function updateNote(id, note) {
  await fetch(`${API_URL}/api/notes/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(note),
  });
}

export async function deleteNote(id) {
  await fetch(`${API_URL}/api/notes/${id}`, {
    method: "DELETE",
  });
}
