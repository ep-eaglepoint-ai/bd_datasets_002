import { defineStore } from "pinia";
import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

interface Note {
  id: number;
  title: string;
  content: string;
  notebook_id: number;
  updated_at: string;
}

interface Notebook {
  id: number;
  name: string;
  notes?: Note[];
}

export const useNotesStore = defineStore("notes", {
  state: () => ({
    notebooks: [] as Notebook[],
    notes: [] as Note[], // Notes for currently selected notebook or search
    currentNote: null as Note | null,
    currentNotebookId: null as number | null,
    searchQuery: "",
    loading: false,
    saving: false,
  }),
  actions: {
    async fetchNotebooks() {
      try {
        const response = await axios.get(`${API_URL}/notebooks/`);
        this.notebooks = response.data;
      } catch (error) {
        console.error("Error fetching notebooks", error);
      }
    },
    async createNotebook(name: string) {
      try {
        const response = await axios.post(`${API_URL}/notebooks/`, { name });
        this.notebooks.push(response.data);
        return response.data;
      } catch (error) {
        throw error;
      }
    },
    async deleteNotebook(id: number) {
      try {
        await axios.delete(`${API_URL}/notebooks/${id}`);
        this.notebooks = this.notebooks.filter((n) => n.id !== id);
        if (this.currentNotebookId === id) {
          this.currentNotebookId = null;
          this.notes = [];
          this.currentNote = null;
        }
      } catch (error) {
        throw error;
      }
    },
    async fetchNotes(notebookId: number | null = null, search: string = "") {
      this.loading = true;
      try {
        let url = `${API_URL}/notes/?`;
        if (notebookId) url += `notebook_id=${notebookId}&`;
        if (search) url += `search=${search}&`;

        const response = await axios.get(url);
        this.notes = response.data;
      } catch (error) {
        console.error("Error fetching notes", error);
      } finally {
        this.loading = false;
      }
    },
    async createNote(notebookId: number, title: string = "Untitled") {
      try {
        const response = await axios.post(`${API_URL}/notes/`, {
          title,
          content: "",
          notebook_id: notebookId,
        });
        this.notes.unshift(response.data);
        this.currentNote = response.data;
        return response.data;
      } catch (error) {
        throw error;
      }
    },
    async updateNote(id: number, updates: Partial<Note>) {
      this.saving = true;
      try {
        const response = await axios.put(`${API_URL}/notes/${id}`, updates);
        // Update local state
        const index = this.notes.findIndex((n) => n.id === id);
        if (index !== -1) {
          this.notes[index] = { ...this.notes[index], ...response.data };
        }
        if (this.currentNote && this.currentNote.id === id) {
          this.currentNote = { ...this.currentNote, ...response.data };
        }
      } catch (error) {
        console.error("Error updating note", error);
      } finally {
        setTimeout(() => {
          this.saving = false;
        }, 1000);
      }
    },
    async deleteNote(id: number) {
      try {
        await axios.delete(`${API_URL}/notes/${id}`);
        this.notes = this.notes.filter((n) => n.id !== id);
        if (this.currentNote && this.currentNote.id === id) {
          this.currentNote = null;
        }
      } catch (error) {
        throw error;
      }
    },
    selectNotebook(id: number | null) {
      this.currentNotebookId = id;
      this.currentNote = null;
      this.fetchNotes(id);
    },
    selectNote(note: Note) {
      this.currentNote = note;
    },
  },
});
