import React, { useState, useEffect } from 'react';

const mockAPI = (() => {
  let notes = [];
  let tags = {};

  const calculateTags = () => {
    const tagCounts = {};
    notes.forEach(note => {
      (note.tags || []).forEach(tag => {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      });
    });
    return Object.entries(tagCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  };

  return {
    fetchNotes: (tag = null) => {
      return new Promise(resolve => {
        setTimeout(() => {
          let result = [...notes];
          if (tag) {
            result = result.filter(note => note.tags.includes(tag));
          }
          resolve(result);
        }, 100);
      });
    },
    
    fetchTags: () => {
      return new Promise(resolve => {
        setTimeout(() => {
          resolve(calculateTags());
        }, 50);
      });
    },
    
    createNote: (noteData) => {
      return new Promise(resolve => {
        setTimeout(() => {
          const newNote = {
            id: Date.now().toString(),
            title: noteData.title,
            content: noteData.content,
            tags: noteData.tags || [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };
          notes.push(newNote);
          resolve(newNote);
        }, 100);
      });
    },
    
    updateNote: (id, noteData) => {
      return new Promise(resolve => {
        setTimeout(() => {
          const index = notes.findIndex(n => n.id === id);
          if (index !== -1) {
            notes[index] = {
              ...notes[index],
              title: noteData.title,
              content: noteData.content,
              tags: noteData.tags || [],
              updatedAt: new Date().toISOString()
            };
            resolve(notes[index]);
          }
        }, 100);
      });
    },
    
    deleteNote: (id) => {
      return new Promise(resolve => {
        setTimeout(() => {
          notes = notes.filter(n => n.id !== id);
          resolve({ success: true });
        }, 100);
      });
    }
  };
})();

function TagFilter({ tags, selectedTag, onTagSelect }) {
  return (
    <div style={{
      background: 'white',
      padding: '20px',
      borderRadius: '12px',
      boxShadow: '0 2px 12px rgba(0,0,0,0.08)'
    }}>
      <h3 style={{ fontSize: '18px', color: '#2c3e50', marginBottom: '16px', fontWeight: '600' }}>
        🏷️ Filter by Tag
      </h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <button
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '12px 16px',
            border: '2px solid ' + (!selectedTag ? '#667eea' : '#e8e8e8'),
            background: !selectedTag ? '#667eea' : 'white',
            color: !selectedTag ? 'white' : '#2c3e50',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '500',
            transition: 'all 0.2s'
          }}
          onClick={() => onTagSelect(null)}
        >
          All Notes
        </button>
        {tags.map(tag => (
          <button
            key={tag.name}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '12px 16px',
              border: '2px solid ' + (selectedTag === tag.name ? '#667eea' : '#e8e8e8'),
              background: selectedTag === tag.name ? '#667eea' : 'white',
              color: selectedTag === tag.name ? 'white' : '#2c3e50',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500',
              transition: 'all 0.2s'
            }}
            onClick={() => onTagSelect(tag.name)}
          >
            <span>{tag.name}</span>
            <span style={{
              backgroundColor: selectedTag === tag.name ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.1)',
              padding: '2px 8px',
              borderRadius: '12px',
              fontSize: '12px',
              fontWeight: '600'
            }}>
              {tag.count}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

function NoteForm({ onSubmit, editingNote, onCancel }) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState([]);

  useEffect(() => {
    // BUG: Not pre-filling form when editing - should set title, content, tags from editingNote
    if (editingNote) {
      // Missing: setTitle(editingNote.title);
      // Missing: setContent(editingNote.content);
      // Missing: setTags(editingNote.tags || []);
    } else {
      resetForm();
    }
  }, [editingNote]);

  const resetForm = () => {
    setTitle('');
    setContent('');
    setTagInput('');
    setTags([]);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // BUG: Missing validation - should alert when title or content is empty
    if (editingNote) {
      onSubmit(editingNote.id, { title, content, tags });
    } else {
      onSubmit({ title, content, tags });
    }
    resetForm();
  };

  const addTag = () => {
    const trimmedTag = tagInput.trim();
    // BUG: Missing duplicate check - should prevent adding duplicate tags
    if (trimmedTag) {
      setTags([...tags, trimmedTag]);
      setTagInput('');
    }
  };

  const removeTag = (tagToRemove) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  return (
    <div style={{
      background: 'white',
      padding: '24px',
      borderRadius: '12px',
      boxShadow: '0 2px 12px rgba(0,0,0,0.08)'
    }}>
      <h2 style={{ marginBottom: '20px', color: '#2c3e50', fontSize: '20px' }}>
        {editingNote ? '✏️ Edit Note' : '➕ Create New Note'}
      </h2>
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '8px', color: '#555', fontWeight: '600', fontSize: '14px' }}>
            Title
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter note title"
            style={{
              width: '100%',
              padding: '12px',
              border: '2px solid #e0e0e0',
              borderRadius: '8px',
              fontSize: '14px',
              fontFamily: 'inherit'
            }}
          />
        </div>
        
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '8px', color: '#555', fontWeight: '600', fontSize: '14px' }}>
            Content
          </label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Enter note content"
            rows="6"
            style={{
              width: '100%',
              padding: '12px',
              border: '2px solid #e0e0e0',
              borderRadius: '8px',
              fontSize: '14px',
              fontFamily: 'inherit',
              resize: 'vertical'
            }}
          />
        </div>
        
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '8px', color: '#555', fontWeight: '600', fontSize: '14px' }}>
            Tags
          </label>
          <input
            type="text"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={(e) => {
              // BUG: Only handles comma, not Enter key
              if (e.key === ',') {
                e.preventDefault();
                addTag();
              }
            }}
            onBlur={addTag}
            placeholder="Add tags (press Enter or comma)"
            style={{
              width: '100%',
              padding: '12px',
              border: '2px solid #e0e0e0',
              borderRadius: '8px',
              fontSize: '14px',
              fontFamily: 'inherit',
              marginBottom: '12px'
            }}
          />
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {tags.map(tag => (
              <span
                key={tag}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  backgroundColor: '#667eea',
                  color: 'white',
                  padding: '6px 12px',
                  borderRadius: '20px',
                  fontSize: '13px',
                  fontWeight: '500'
                }}
              >
                {tag}
                <button
                  type="button"
                  onClick={() => removeTag(tag)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'white',
                    fontSize: '18px',
                    cursor: 'pointer',
                    padding: '0',
                    width: '18px',
                    height: '18px',
                    borderRadius: '50%'
                  }}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        </div>
        
        <div style={{ display: 'flex', gap: '10px', marginTop: '24px' }}>
          <button
            type="submit"
            style={{
              padding: '12px 24px',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '600',
              backgroundColor: '#667eea',
              color: 'white'
            }}
          >
            {editingNote ? 'Update Note' : 'Create Note'}
          </button>
          {editingNote && (
            <button
              type="button"
              onClick={() => { resetForm(); onCancel(); }}
              style={{
                padding: '12px 24px',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '600',
                backgroundColor: '#95a5a6',
                color: 'white'
              }}
            >
              Cancel
            </button>
          )}
        </div>
      </form>
    </div>
  );
}

function NoteItem({ note, onEdit, onDelete }) {
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div style={{
      background: '#fff',
      border: '1px solid #e8e8e8',
      borderRadius: '12px',
      padding: '20px',
      transition: 'all 0.3s ease'
    }}>
      <h3 style={{ fontSize: '18px', color: '#2c3e50', margin: '0 0 12px 0', fontWeight: '600' }}>
        {note.title}
      </h3>
      
      <p style={{
        color: '#555',
        lineHeight: '1.6',
        margin: '0 0 16px 0',
        overflow: 'hidden',
        display: '-webkit-box',
        WebkitLineClamp: 4,
        WebkitBoxOrient: 'vertical'
      }}>
        {note.content}
      </p>
      
      {note.tags && note.tags.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '16px' }}>
          {note.tags.map(tag => (
            <span
              key={tag}
              style={{
                backgroundColor: '#e3f2fd',
                color: '#1976d2',
                padding: '4px 10px',
                borderRadius: '12px',
                fontSize: '12px',
                fontWeight: '500'
              }}
            >
              {tag}
            </span>
          ))}
        </div>
      )}
      
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: '12px',
        borderTop: '1px solid #f0f0f0'
      }}>
        <small style={{ color: '#999', fontSize: '12px' }}>
          Updated: {formatDate(note.updatedAt)}
        </small>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => onEdit(note)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '6px 10px',
              fontSize: '18px',
              borderRadius: '6px'
            }}
            title="Edit note"
          >
            ✏️
          </button>
          <button
            onClick={() => {
              // BUG: Missing confirmation check - should only delete if confirm returns true
              onDelete(note.id);
            }}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '6px 10px',
              fontSize: '18px',
              borderRadius: '6px'
            }}
            title="Delete note"
          >
            🗑️
          </button>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [notes, setNotes] = useState([]);
  const [tags, setTags] = useState([]);
  const [selectedTag, setSelectedTag] = useState(null);
  const [editingNote, setEditingNote] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadNotes();
    loadTags();
  }, [selectedTag]);

  const loadNotes = async () => {
    setLoading(true);
    const data = await mockAPI.fetchNotes(selectedTag);
    setNotes(data);
    setLoading(false);
  };

  const loadTags = async () => {
    const data = await mockAPI.fetchTags();
    setTags(data);
  };

  const handleCreateNote = async (noteData) => {
    const newNote = await mockAPI.createNote(noteData);
    setNotes([...notes, newNote]);
    // BUG: Missing loadTags() call - tag counts won't update after creating note
  };

  const handleUpdateNote = async (id, noteData) => {
    const updatedNote = await mockAPI.updateNote(id, noteData);
    setNotes(notes.map(note => note.id === id ? updatedNote : note));
    setEditingNote(null);
    await loadTags();
  };

  const handleDeleteNote = async (id) => {
    await mockAPI.deleteNote(id);
    setNotes(notes.filter(note => note.id !== id));
    // BUG: Missing loadTags() call - tag counts won't update after deleting note
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <header style={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        padding: '30px 20px',
        textAlign: 'center',
        boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
      }}>
        <h1 style={{ fontSize: '32px', fontWeight: '700', marginBottom: '8px', margin: 0 }}>
          📚 Note Taker Application
        </h1>
        <p style={{ fontSize: '16px', opacity: 0.9, margin: '8px 0 0 0' }}>
          Organize your thoughts with tags
        </p>
      </header>
      
      <div style={{
        display: 'flex',
        flex: 1,
        padding: '20px',
        gap: '20px',
        maxWidth: '1600px',
        width: '100%',
        margin: '0 auto',
        flexWrap: 'wrap'
      }}>
        <aside style={{ flex: '0 0 250px', minWidth: '250px' }}>
          <TagFilter 
            tags={tags} 
            selectedTag={selectedTag}
            onTagSelect={setSelectedTag}
          />
        </aside>
        
        <main style={{ flex: 1, minWidth: '300px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <NoteForm
            onSubmit={editingNote ? handleUpdateNote : handleCreateNote}
            editingNote={editingNote}
            onCancel={() => setEditingNote(null)}
          />
          
          <div style={{
            background: 'white',
            padding: '24px',
            borderRadius: '12px',
            boxShadow: '0 2px 12px rgba(0,0,0,0.08)'
          }}>
            <h2 style={{ marginBottom: '20px', color: '#2c3e50', fontSize: '20px' }}>
              All Notes ({notes.length})
            </h2>
            {loading ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#666', fontSize: '18px' }}>
                Loading notes...
              </div>
            ) : notes.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 24px', color: '#999', fontSize: '18px' }}>
                📝 No notes found. Create your first note to get started!
              </div>
            ) : (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                gap: '20px'
              }}>
                {notes.map(note => (
                  <NoteItem
                    key={note.id}
                    note={note}
                    onEdit={setEditingNote}
                    onDelete={handleDeleteNote}
                  />
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}




