import { exportContactsJSON, exportContactsCSV, parseContactsJSON, parseContactsCSV } from '../repository_after/contact-manager/src/lib/import-export';
import { Contact } from '../repository_after/contact-manager/src/types';

// Mock creating object URL
global.URL.createObjectURL = jest.fn(() => 'mock-url');
global.URL.revokeObjectURL = jest.fn();

describe('Import/Export Utils', () => {
  const mockContacts: Contact[] = [
    {
      id: '1',
      firstName: 'Test',
      lastName: 'User',
      emails: [{ type: 'home', value: 'test@example.com', id: '1' }],
      phones: [],
      tags: ['tag1'],
      isFavorite: false,
      createdAt: 1000,
      updatedAt: 1000,
    },
  ];

  it('exports to JSON correctly', () => {
    expect(() => exportContactsJSON(mockContacts)).not.toThrow();
  });

  it('parses imported JSON correctly', async () => {
    const jsonStr = JSON.stringify(mockContacts);
    const file = new File([jsonStr], "contacts.json", { type: "application/json" });
    const result = await parseContactsJSON(file);
    expect(result).toHaveLength(1);
    expect(result[0].firstName).toBe('Test');
  });

  it('parses imported CSV correctly', async () => {
    const csvStr = `firstName,lastName,email1,phone1,tags,notes
Test,User,test@example.com,,tag1,`;
    const file = new File([csvStr], "contacts.csv", { type: "text/csv" });
    const result = await parseContactsCSV(file);
    expect(result).toHaveLength(1);
    expect(result[0].firstName).toBe('Test');
    expect(result[0].emails[0].value).toBe('test@example.com');
  });
});
