import { useState } from "react";

export default function NoteForm({ onCreate }) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [tags, setTags] = useState("");

  function handleSubmit(e) {
    e.preventDefault();
    const tagList = tags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    onCreate({ title, content, tags: tagList });
    setTitle("");
    setContent("");
    setTags("");
  }

  return (
    <form className="note-form" onSubmit={handleSubmit}>
      <h2>Create Note</h2>
      <input type="text" placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} required />
      <textarea placeholder="Content" value={content} onChange={(e) => setContent(e.target.value)} required />
      <input type="text" placeholder="Tags (comma separated)" value={tags} onChange={(e) => setTags(e.target.value)} />
      <button type="submit">Add Note</button>
    </form>
  );
}
