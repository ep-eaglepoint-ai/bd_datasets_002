import { create } from 'zustand';
import { Contact, ContactFilterOptions, ContactSortOptions } from '../types';
import * as db from '../lib/db';

interface ContactState {
  contacts: Contact[];
  isLoading: boolean;
  error: string | null;
  filter: ContactFilterOptions;
  sort: ContactSortOptions;
  viewMode: 'list' | 'grid';
  
  // Actions
  fetchContacts: () => Promise<void>;
  addContact: (contact: any) => Promise<void>;
  editContact: (id: string, contact: any) => Promise<void>;
  removeContact: (id: string) => Promise<void>;
  removeContacts: (ids: string[]) => Promise<void>;
  toggleFavorite: (id: string) => Promise<void>;
  setFilter: (filter: Partial<ContactFilterOptions>) => void;
  setSort: (sort: ContactSortOptions) => void;
  setViewMode: (mode: 'list' | 'grid') => void;
}

export const useContactStore = create<ContactState>((set, get) => ({
  contacts: [],
  isLoading: false,
  error: null,
  filter: {},
  sort: { field: 'updatedAt', order: 'desc' },
  viewMode: 'list',

  fetchContacts: async () => {
    set({ isLoading: true, error: null });
    try {
      const contacts = await db.getContacts();
      set({ contacts, isLoading: false });
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
    }
  },

  addContact: async (data) => {
    set({ isLoading: true });
    try {
      const newContact = await db.createContact(data);
      set(state => ({ 
        contacts: [...state.contacts, newContact],
        isLoading: false 
      }));
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
    }
  },

  editContact: async (id, data) => {
    set({ isLoading: true });
    try {
      const updated = await db.updateContact(id, data);
      set(state => ({
        contacts: state.contacts.map(c => c.id === id ? updated : c),
        isLoading: false
      }));
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
    }
  },

  removeContact: async (id) => {
    try {
      await db.deleteContact(id);
      set(state => ({
        contacts: state.contacts.filter(c => c.id !== id)
      }));
    } catch (err: any) {
      set({ error: err.message });
    }
  },

  removeContacts: async (ids) => {
      try {
          await db.bulkDeleteContacts(ids);
          set(state => ({
              contacts: state.contacts.filter(c => !ids.includes(c.id))
          }));
      } catch (err: any) {
          set({ error: err.message });
      }
  },

  toggleFavorite: async (id) => {
      try {
          const updated = await db.toggleFavorite(id);
          set(state => ({
              contacts: state.contacts.map(c => c.id === id ? updated : c)
          }));
      } catch (err: any) {
          set({ error: err.message });
      }
  },

  setFilter: (newFilter) => set(state => ({ filter: { ...state.filter, ...newFilter } })),
  setSort: (newSort) => set({ sort: newSort }),
  setViewMode: (mode) => set({ viewMode: mode }),
}));
