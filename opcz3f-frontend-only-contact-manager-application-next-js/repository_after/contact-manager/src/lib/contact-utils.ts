import { Contact, ContactSortOptions } from "@/types";

export function filterAndSortContacts(
  contacts: Contact[],
  searchTerm: string,
  sort: ContactSortOptions
): Contact[] {
  let result = [...contacts];

  if (searchTerm) {
    const lower = searchTerm.toLowerCase();
    result = result.filter(
      (c) =>
        c.firstName.toLowerCase().includes(lower) ||
        c.lastName.toLowerCase().includes(lower) ||
        c.emails.some((e) => e.value.toLowerCase().includes(lower)) ||
        c.tags.some((t) => t.toLowerCase().includes(lower))
    );
  }

  result.sort((a, b) => {
    const fieldA = (a[sort.field] || "").toString().toLowerCase();
    const fieldB = (b[sort.field] || "").toString().toLowerCase();

    if (sort.field === "updatedAt") {
      return sort.order === "asc"
        ? a.updatedAt - b.updatedAt
        : b.updatedAt - a.updatedAt;
    }

    if (fieldA < fieldB) return sort.order === "asc" ? -1 : 1;
    if (fieldA > fieldB) return sort.order === "asc" ? 1 : -1;
    return 0;
  });

  return result;
}
