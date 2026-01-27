import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { Contact, ContactId, ContactFormData } from '../types';
import { v4 as uuidv4 } from 'uuid';

interface ContactDB extends DBSchema {
  contacts: {
    key: string;
    value: Contact;
    indexes: {
      'by-name': string;
      'by-company': string;
      'by-tags': string[];
      'by-favorite': number; // boolean 0/1 for sorting/filtering ease? or just iterate
      'by-updated': number;
    };
  };
}

const DB_NAME = 'contact-manager-db';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<ContactDB>>;

export const initDB = () => {
  if (!dbPromise) {
    dbPromise = openDB<ContactDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        const store = db.createObjectStore('contacts', { keyPath: 'id' });
        store.createIndex('by-name', 'lastName'); // Secondary sort by first name manually? Or compound index?
        store.createIndex('by-company', 'company');
        store.createIndex('by-tags', 'tags', { multiEntry: true });
        store.createIndex('by-favorite', 'isFavorite');
        store.createIndex('by-updated', 'updatedAt');
      },
    });
  }
  return dbPromise;
};

export const closeDB = async () => {
    if (dbPromise) {
        const db = await dbPromise;
        db.close();
        dbPromise = null as any;
    }
};

export const getContacts = async (): Promise<Contact[]> => {
  const db = await initDB();
  return db.getAll('contacts');
};

export const getContact = async (id: ContactId): Promise<Contact | undefined> => {
  const db = await initDB();
  return db.get('contacts', id);
};

export const createContact = async (data: ContactFormData): Promise<Contact> => {
  const db = await initDB();
  const now = Date.now();
  const newContact: Contact = {
    ...data,
    id: uuidv4(),
    createdAt: now,
    updatedAt: now,
  };
  await db.add('contacts', newContact);
  return newContact;
};

export const updateContact = async (id: ContactId, data: ContactFormData): Promise<Contact> => {
  const db = await initDB();
  const oldContact = await db.get('contacts', id);
  if (!oldContact) throw new Error('Contact not found');

  const updatedContact: Contact = {
    ...oldContact,
    ...data,
    updatedAt: Date.now(),
  };
  await db.put('contacts', updatedContact);
  return updatedContact;
};

export const deleteContact = async (id: ContactId): Promise<void> => {
  const db = await initDB();
  await db.delete('contacts', id);
};

export const bulkDeleteContacts = async (ids: ContactId[]): Promise<void> => {
  const db = await initDB();
  const tx = db.transaction('contacts', 'readwrite');
  await Promise.all(ids.map(id => tx.store.delete(id)));
  await tx.done;
};

export const toggleFavorite = async (id: ContactId): Promise<Contact> => {
    const db = await initDB();
    const contact = await db.get('contacts', id);
    if (!contact) throw new Error("Contact not found");
    
    const updated = { ...contact, isFavorite: !contact.isFavorite, updatedAt: Date.now() };
    await db.put('contacts', updated);
    return updated;
}
