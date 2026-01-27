import { useContactStore } from '../repository_after/contact-manager/src/store';
import { createContact, getContacts } from '../repository_after/contact-manager/src/lib/db';

// Mock the db file because useContactStore imports it.
// Actually, with fake-indexeddb, we can use the real db implementation!
// Just need to make sure state is reset.

describe('Zustand Store', () => {
  beforeEach(async () => {
    // Clear store
    useContactStore.setState({ contacts: [], isLoading: false, error: null });
    // Clear IndexedDB
    const req = indexedDB.deleteDatabase('contact-manager-db');
    req.onsuccess = () => {};
    req.onerror = () => {};
    // Wait a bit or ensure DB is closed? idb library handles connection logic.
  });

  it('initializes with empty contacts', () => {
    const state = useContactStore.getState();
    expect(state.contacts).toEqual([]);
  });

  it('adds a contact', async () => {
    const contactData = {
      firstName: 'John',
      lastName: 'Doe',
      emails: [],
      phones: [],
      tags: [],
    };

    await useContactStore.getState().addContact(contactData);
    
    const state = useContactStore.getState();
    expect(state.contacts).toHaveLength(1);
    expect(state.contacts[0].firstName).toBe('John');
  });

  it('removes a contact', async () => {
      // Manually add one via DB first? Or use store action.
      // Let's use store action.
      await useContactStore.getState().addContact({ firstName: 'Delete', lastName: 'Me' });
      const contactId = useContactStore.getState().contacts[0].id;
      
      await useContactStore.getState().removeContact(contactId);
      
      expect(useContactStore.getState().contacts).toHaveLength(0);
  });
  
  it('updates a contact', async () => {
      await useContactStore.getState().addContact({ firstName: 'Update', lastName: 'Me' });
      const contactId = useContactStore.getState().contacts[0].id;
      
      await useContactStore.getState().editContact(contactId, { firstName: 'Updated' });
      
      expect(useContactStore.getState().contacts[0].firstName).toBe('Updated');
  });
});
