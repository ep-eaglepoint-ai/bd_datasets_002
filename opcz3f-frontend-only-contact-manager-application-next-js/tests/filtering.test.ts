import { filterAndSortContacts } from '../repository_after/contact-manager/src/lib/contact-utils';
import { Contact } from '../repository_after/contact-manager/src/types';

describe('filterAndSortContacts', () => {
  const mockContacts: Contact[] = [
    {
      id: '1',
      firstName: 'Alice',
      lastName: 'Wonderland',
      emails: [{ type: 'home', value: 'alice@example.com', id: '1' }],
      phones: [],
      tags: ['friend'],
      isFavorite: false,
      createdAt: 1000,
      updatedAt: 1000,
    },
    {
      id: '2',
      firstName: 'Bob',
      lastName: 'Builder',
      emails: [],
      phones: [{ type: 'mobile', value: '1234567890', id: '2' }],
      tags: ['work'],
      isFavorite: true,
      createdAt: 2000,
      updatedAt: 2000,
    },
    {
      id: '3',
      firstName: 'Charlie',
      lastName: 'Chocolate',
      emails: [{ type: 'work', value: 'charlie@factory.com', id: '3' }],
      phones: [],
      tags: [],
      isFavorite: false,
      createdAt: 3000,
      updatedAt: 3000,
    },
  ];

  it('filters by name', () => {
    const result = filterAndSortContacts(mockContacts, { search: 'alice' }, { field: 'updatedAt', order: 'desc' });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('1');
  });

  it('filters by email', () => {
    const result = filterAndSortContacts(mockContacts, { search: 'factory' }, { field: 'updatedAt', order: 'desc' });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('3');
  });

  it('filters by tag', () => {
    const result = filterAndSortContacts(mockContacts, { search: 'work' }, { field: 'updatedAt', order: 'desc' });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('2');
  });

  it('sorts by firstName ASC', () => {
    const result = filterAndSortContacts(mockContacts, { search: '' }, { field: 'firstName', order: 'asc' });
    expect(result[0].firstName).toBe('Alice');
    expect(result[1].firstName).toBe('Bob');
    expect(result[2].firstName).toBe('Charlie');
  });

  it('sorts by firstName DESC', () => {
    const result = filterAndSortContacts(mockContacts, { search: '' }, { field: 'firstName', order: 'desc' });
    expect(result[0].firstName).toBe('Charlie');
    expect(result[1].firstName).toBe('Bob');
    expect(result[2].firstName).toBe('Alice');
  });

  it('sorts by updatedAt DESC', () => {
    const result = filterAndSortContacts(mockContacts, { search: '' }, { field: 'updatedAt', order: 'desc' });
    expect(result[0].id).toBe('3');
    expect(result[1].id).toBe('2');
    expect(result[2].id).toBe('1');
  });
});
