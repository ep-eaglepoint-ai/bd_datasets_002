export type ContactId = string;

export type LabelType = 'home' | 'work' | 'mobile' | 'other' | string;

export interface ContactMethod {
  id: string;
  type: LabelType;
  value: string;
}

export interface Address {
  street?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
}

export interface Contact {
  id: ContactId;
  firstName: string;
  lastName: string;
  company?: string;
  jobTitle?: string;
  emails: ContactMethod[];
  phones: ContactMethod[];
  address?: Address;
  tags: string[];
  notes?: string;
  avatarUrl?: string; // Blob URL or base64
  isFavorite: boolean;
  createdAt: number;
  updatedAt: number;
}

export type ContactFormData = Omit<Contact, 'id' | 'createdAt' | 'updatedAt'>;

export interface ContactFilterOptions {
  search?: string;
  tags?: string[];
  isFavorite?: boolean;
}

export type SortField = 'firstName' | 'lastName' | 'company' | 'updatedAt';
export type SortOrder = 'asc' | 'desc';

export interface ContactSortOptions {
  field: SortField;
  order: SortOrder;
}

export interface PaginationOptions {
  page: number;
  limit: number;
}
