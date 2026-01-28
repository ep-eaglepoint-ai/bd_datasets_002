import { useEffect, useState } from "react";
import { getNotes, getTags, createNote, updateNote, deleteNote } from "./api/notesApi";
import TagFilter from "./components/TagFilter";
import NoteForm from "./components/NoteForm";
import NoteList from "./components/NoteList";

export default function App() {
  const [notes, setNotes] = useState([]);
  const [tags, setTags] = useState([]);
  const [activeTag, setActiveTag] = useState("");

  async function loadData(tag = "") {
    const [notesData, tagsData] = await Promise.all([getNotes(tag), getTags()]);
    setNotes(notesData);
    setTags(tagsData);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadData(activeTag);
  }, [activeTag]);

  async function handleCreate(note) {
    await createNote(note);
    await loadData(activeTag);
  }

  async function handleUpdate(id, note) {
    await updateNote(id, note);
    await loadData(activeTag);
  }

  async function handleDelete(id) {
    await deleteNote(id);
    await loadData(activeTag);
  }

  return (
    <div className="container">
      <h1>Notes App</h1>

      <TagFilter tags={tags} activeTag={activeTag} onSelectTag={setActiveTag} onClear={() => setActiveTag("")} />

      <NoteList notes={notes} onUpdate={handleUpdate} onDelete={handleDelete} />

      <NoteForm onCreate={handleCreate} />
    </div>
  );
}
