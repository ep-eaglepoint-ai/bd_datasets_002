import { Contact, ContactSortOptions, ContactFilterOptions } from "@/types";

export function filterAndSortContacts(
  contacts: Contact[],
  filters: ContactFilterOptions,
  sort: ContactSortOptions
): Contact[] {
  let result = [...contacts];

  // Filtering
  if (filters.search) {
    const lower = String(filters.search).toLowerCase();
    result = result.filter(
      (c) =>
        c.firstName.toLowerCase().includes(lower) ||
        c.lastName.toLowerCase().includes(lower) ||
        c.company?.toLowerCase().includes(lower) ||
        c.emails.some((e) => e.value.toLowerCase().includes(lower)) ||
        c.phones.some((p) => p.value.includes(lower)) ||
        c.tags.some((t) => t.toLowerCase().includes(lower))
    );
  }

  if (filters.tags && filters.tags.length > 0) {
    result = result.filter(c => 
      filters.tags!.some(tag => c.tags.includes(tag))
    );
  }

  if (filters.isFavorite) {
    result = result.filter(c => c.isFavorite);
  }

  // Sorting
  result.sort((a, b) => {
    // Handle date fields separately
    if (sort.field === "updatedAt") {
      return sort.order === "asc"
        ? a.updatedAt - b.updatedAt
        : b.updatedAt - a.updatedAt;
    }

    const valA = a[sort.field];
    const valB = b[sort.field];

    // Handle undefined/null (push to end usually, or beginning?)
    // Let's push empty/undefined to the end for ascending, beginning for descending (or consistently end)
    // Standard UX: Empty is usually last.
    const strA = (valA || "").toString().toLowerCase();
    const strB = (valB || "").toString().toLowerCase();

    if (strA === strB) return 0;
    
    // If one is empty and custom logic needed:
    if (!valA && valB) return 1; // A (empty) > B (value) -> A comes last (if asc)
    if (valA && !valB) return -1; // A (value) < B (empty) -> B comes last

    // Standard string compare
    if (strA < strB) return sort.order === "asc" ? -1 : 1;
    if (strA > strB) return sort.order === "asc" ? 1 : -1;
    return 0;
  });

  return result;
}
