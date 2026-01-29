import { useState } from "react";

export default function NoteList({ notes, onUpdate, onDelete, onView }) {
  if (notes.length === 0) {
    return <p className="empty">No notes found.</p>;
  }

  return (
    <div className="note-list">
      <h2>Notes</h2>
      {notes.map((note) => (
        <NoteItem key={note.id} note={note} onUpdate={onUpdate} onDelete={onDelete} onView={onView} />
      ))}
    </div>
  );
}

function NoteItem({ note, onUpdate, onDelete, onView }) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(note.title);
  const [content, setContent] = useState(note.content);
  const [tags, setTags] = useState(note.tags.join(", "));

  function handleSave() {
    const tagList = tags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    onUpdate(note.id, { title, content, tags: tagList });
    setEditing(false);
  }

  return (
    <div className="note">
      {editing ? (
        <>
          <input value={title} onChange={(e) => setTitle(e.target.value)} />
          <textarea value={content} onChange={(e) => setContent(e.target.value)} />
          <input value={tags} onChange={(e) => setTags(e.target.value)} />
          <div className="note-actions">
            <button onClick={handleSave}>Save</button>
            <button onClick={() => setEditing(false)} className="secondary">
              Cancel
            </button>
          </div>
        </>
      ) : (
        <>
          <h3>{note.title}</h3>
          <p>{note.content}</p>
          <div className="tags">
            {note.tags.map((t) => (
              <span key={t} className="tag-label">
                {t}
              </span>
            ))}
          </div>
          <div className="note-actions">
            <button onClick={() => onView(note.id)}>View</button>
            <button onClick={() => setEditing(true)}>Edit</button>
            <button onClick={() => onDelete(note.id)} className="danger">
              Delete
            </button>
          </div>
        </>
      )}
    </div>
  );
}
