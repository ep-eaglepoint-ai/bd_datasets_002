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
  addContact: (contact: any) => Promise<Contact>;
  editContact: (id: string, contact: any) => Promise<void>;
  removeContact: (id: string) => Promise<void>;
  removeContacts: (ids: string[]) => Promise<void>;
  toggleFavorite: (id: string) => Promise<void>;
  applyBulkTag: (ids: string[], tags: string[]) => Promise<void>;
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
    // Optimistic: create temp contact immediately
    const tempId = `temp-${Date.now()}`;
    const now = Date.now();
    const optimisticContact: Contact = {
      ...data,
      id: tempId,
      createdAt: now,
      updatedAt: now,
    };
    
    set(state => ({ 
      contacts: [...state.contacts, optimisticContact],
    }));
    
    try {
      const newContact = await db.createContact(data);
      // Replace temp contact with real one
      set(state => ({ 
        contacts: state.contacts.map(c => c.id === tempId ? newContact : c),
      }));
      return newContact;
    } catch (err: any) {
      // Rollback on error
      set(state => ({ 
        contacts: state.contacts.filter(c => c.id !== tempId),
        error: err.message 
      }));
      throw err;
    }
  },

  editContact: async (id, data) => {
    const prevContacts = get().contacts;
    const oldContact = prevContacts.find(c => c.id === id);
    if (!oldContact) return;
    
    // Optimistic update
    const optimisticContact: Contact = {
      ...oldContact,
      ...data,
      updatedAt: Date.now(),
    };
    
    set(state => ({
      contacts: state.contacts.map(c => c.id === id ? optimisticContact : c),
    }));
    
    try {
      const updated = await db.updateContact(id, data);
      set(state => ({
        contacts: state.contacts.map(c => c.id === id ? updated : c),
      }));
    } catch (err: any) {
      // Rollback on error
      set({ contacts: prevContacts, error: err.message });
      throw err;
    }
  },

  removeContact: async (id) => {
    const prevContacts = get().contacts;
    
    // Optimistic removal
    set(state => ({
      contacts: state.contacts.filter(c => c.id !== id)
    }));
    
    try {
      await db.deleteContact(id);
    } catch (err: any) {
      // Rollback on error
      set({ contacts: prevContacts, error: err.message });
      throw err;
    }
  },

  removeContacts: async (ids) => {
    const prevContacts = get().contacts;
    
    // Optimistic removal
    set(state => ({
      contacts: state.contacts.filter(c => !ids.includes(c.id))
    }));
    
    try {
      await db.bulkDeleteContacts(ids);
    } catch (err: any) {
      // Rollback on error
      set({ contacts: prevContacts, error: err.message });
      throw err;
    }
  },

  toggleFavorite: async (id) => {
    const prevContacts = get().contacts;
    const contact = prevContacts.find(c => c.id === id);
    if (!contact) return;
    
    // Optimistic update
    set(state => ({
      contacts: state.contacts.map(c => 
        c.id === id ? { ...c, isFavorite: !c.isFavorite, updatedAt: Date.now() } : c
      )
    }));
    
    try {
      await db.toggleFavorite(id);
    } catch (err: any) {
      // Rollback on error
      set({ contacts: prevContacts, error: err.message });
      throw err;
    }
  },

  applyBulkTag: async (ids, tags) => {
    const prevContacts = get().contacts;
    
    // Optimistic update for bulk tags
    set(state => ({
      contacts: state.contacts.map(c => {
        if (ids.includes(c.id)) {
          const newTags = Array.from(new Set([...c.tags, ...tags]));
          return { ...c, tags: newTags, updatedAt: Date.now() };
        }
        return c;
      })
    }));
    
    try {
      await db.bulkAddTags(ids, tags);
    } catch (err: any) {
      // Rollback on error
      set({ contacts: prevContacts, error: err.message });
      throw err;
    }
  },

  setFilter: (newFilter) => set(state => ({ filter: { ...state.filter, ...newFilter } })),
  setSort: (newSort) => set({ sort: newSort }),
  setViewMode: (mode) => set({ viewMode: mode }),
}));

