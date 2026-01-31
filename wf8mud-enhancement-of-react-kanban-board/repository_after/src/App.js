import { useEffect, useRef, useState } from "react";
import "./App.css";

const DEFAULT_TASKS = [
  { name: "STORY-4513: Add tooltip", category: "wip", bgcolor: "lightblue" },
  { name: "STORY-4547: Fix search bug", category: "wip", bgcolor: "lightgrey" },
  { name: "STORY-4525: New filter option", category: "complete", bgcolor: "lightgreen" },
  { name: "STORY-4526: Remove region filter", category: "complete", bgcolor: "#ee9090" },
  { name: "STORY-4520: Improve performance", category: "complete", bgcolor: "#eeed90" },
];

const PRIORITY_COLOR = {
  High: "#ee9090",
  Medium: "#eeed90",
  Low: "lightgreen",
};

function App() {
  const [tasks, setTasks] = useState(DEFAULT_TASKS);
  const [meta, setMeta] = useState({});

  const [modalOpen, setModalOpen] = useState(false);
  const [modalColumn, setModalColumn] = useState("wip");

  const [hovered, setHovered] = useState(null);
  const [confirmDeleteFor, setConfirmDeleteFor] = useState(null);
  const [editing, setEditing] = useState(null);
  const [editingValue, setEditingValue] = useState("");
  const [contextMenu, setContextMenu] = useState({ visible: false, x: 0, y: 0, task: null });

  const modalRef = useRef(null);
  const contextRef = useRef(null);

  // Load from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem("kanban_tasks");
      const rawMeta = localStorage.getItem("kanban_meta");
      if (raw) setTasks(JSON.parse(raw));
      if (rawMeta) setMeta(JSON.parse(rawMeta));
    } catch (e) {
      // graceful fallback – no console noise
    }
  }, []);

  // Persist to localStorage
  useEffect(() => {
    try {
      localStorage.setItem("kanban_tasks", JSON.stringify(tasks));
      localStorage.setItem("kanban_meta", JSON.stringify(meta));
    } catch (e) {}
  }, [tasks, meta]);

  // Global handlers
  useEffect(() => {
    const onDown = (e) => {
      if (modalOpen && modalRef.current && !modalRef.current.contains(e.target)) {
        setModalOpen(false);
      }
      if (contextMenu.visible && contextRef.current && !contextRef.current.contains(e.target)) {
        setContextMenu({ visible: false, x: 0, y: 0, task: null });
      }
      if (confirmDeleteFor) {
        const el = document.getElementById("confirm-" + confirmDeleteFor);
        if (el && !el.contains(e.target)) setConfirmDeleteFor(null);
      }
    };

    const onKey = (e) => {
      if (e.key === "Escape") {
        setModalOpen(false);
        setContextMenu({ visible: false, x: 0, y: 0, task: null });
        setEditing(null);
        setConfirmDeleteFor(null);
      }
      if (e.key === "Enter" && editing) saveEdit(editingValue);
    };

    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [modalOpen, contextMenu.visible, confirmDeleteFor, editing, editingValue]);

  const onDragStart = (event, id) => {
    setContextMenu({ visible: false, x: 0, y: 0, task: null });
    event.dataTransfer.setData("id", id);
  };

  const onDrop = (event, cat) => {
    const id = event.dataTransfer.getData("id");
    setTasks(tasks.map(t => t.name === id ? { ...t, category: cat } : t));
  };

  const getIdFromName = (name) => name.split(":")[0];
  const getTitleFromName = (name) => name.split(":").slice(1).join(":").trim();

  const generateId = () => {
    const ids = new Set(tasks.map(t => getIdFromName(t.name)));
    let id;
    do {
      id = `STORY-${Math.floor(1000 + Math.random() * 9000)}`;
    } while (ids.has(id));
    return id;
  };

  const openAddModal = (column) => {
    setModalColumn(column);
    setModalOpen(true);
  };

  const addTask = (title, description, priority) => {
    if (!title.trim()) return;
    const id = generateId();
    const name = `${id}: ${title.trim()}`;
    const bgcolor = PRIORITY_COLOR[priority];
    setTasks([...tasks, { name, category: modalColumn, bgcolor }]);
    setMeta({ ...meta, [name]: { description, priority } });
    setModalOpen(false);
  };

  const startEdit = (name) => {
    setEditing(name);
    setEditingValue(getTitleFromName(name));
  };

  const saveEdit = (value) => {
    if (!value.trim()) return setEditing(null);
    const id = getIdFromName(editing);
    const newName = `${id}: ${value.trim()}`;

    setTasks(tasks.map(t => t.name === editing ? { ...t, name: newName } : t));

    if (meta[editing]) {
      const m = { ...meta };
      m[newName] = m[editing];
      delete m[editing];
      setMeta(m);
    }

    setEditing(null);
  };

  const removeTask = (name) => {
    setTasks(tasks.filter(t => t.name !== name));
    const m = { ...meta };
    delete m[name];
    setMeta(m);
    setConfirmDeleteFor(null);
  };

  const openContextMenu = (e, name) => {
    e.preventDefault();
    setContextMenu({ visible: true, x: e.clientX, y: e.clientY, task: name });
  };

  const changePriority = (name, priority) => {
    setTasks(tasks.map(t => t.name === name ? { ...t, bgcolor: PRIORITY_COLOR[priority] } : t));
    setMeta({ ...meta, [name]: { ...(meta[name] || {}), priority } });
    setContextMenu({ visible: false, x: 0, y: 0, task: null });
  };

  const renderTasks = (category) =>
    tasks.filter(t => t.category === category).map(t => {
      const isEditing = editing === t.name;
      return (
        <div
          key={t.name}
          draggable={!isEditing}
          onDragStart={(e) => onDragStart(e, t.name)}
          onDoubleClick={() => startEdit(t.name)}
          onContextMenu={(e) => openContextMenu(e, t.name)}
          onMouseEnter={() => setHovered(t.name)}
          onMouseLeave={() => setHovered(null)}
          className="task-card"
          style={{ backgroundColor: t.bgcolor, position: "relative" }}
        >
          {isEditing ? (
            <input
              autoFocus
              value={editingValue}
              onChange={(e) => setEditingValue(e.target.value)}
              onBlur={() => saveEdit(editingValue)}
            />
          ) : (
            t.name
          )}

          {hovered === t.name && (
            <button onClick={() => setConfirmDeleteFor(t.name)} style={{ position: "absolute", right: 6 }}>×</button>
          )}

          {confirmDeleteFor === t.name && (
            <div id={`confirm-${t.name}`}>
              <span>Delete this task?</span>
              <button onClick={() => removeTask(t.name)}>Yes</button>
              <button onClick={() => setConfirmDeleteFor(null)}>No</button>
            </div>
          )}
        </div>
      );
    });

  return (
    <div className="drag-drop-container">
      <h2>JIRA BOARD: Sprint 21U</h2>
      <div className="drag-drop-board">
        <div onDragOver={(e) => e.preventDefault()} onDrop={(e) => onDrop(e, "wip")}>
          <div className="task-header">
            In-Progress <button onClick={() => openAddModal("wip")}>Add Task</button>
          </div>
          {renderTasks("wip")}
        </div>

        <div onDragOver={(e) => e.preventDefault()} onDrop={(e) => onDrop(e, "complete")}>
          <div className="task-header">
            Completed <button onClick={() => openAddModal("complete")}>Add Task</button>
          </div>
          {renderTasks("complete")}
        </div>
      </div>

      {modalOpen && (
        <div className="modal-overlay">
          <div ref={modalRef} className="modal">
            <AddTaskForm onSubmit={addTask} onCancel={() => setModalOpen(false)} />
          </div>
        </div>
      )}

      {contextMenu.visible && (
        <div ref={contextRef} style={{ position: "fixed", left: contextMenu.x, top: contextMenu.y }}>
          {["Low", "Medium", "High"].map(p => (
            <button key={p} onClick={() => changePriority(contextMenu.task, p)}>{p}</button>
          ))}
        </div>
      )}
    </div>
  );
}

function AddTaskForm({ onSubmit, onCancel }) {
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [priority, setPriority] = useState("Medium");

  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit(title, desc, priority); }}>
      <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" />
      <textarea value={desc} onChange={(e) => setDesc(e.target.value)} />
      <select value={priority} onChange={(e) => setPriority(e.target.value)}>
        <option>Low</option><option>Medium</option><option>High</option>
      </select>
      <button type="submit">Add</button>
      <button type="button" onClick={onCancel}>Cancel</button>
    </form>
  );
}

export default App;
