import { z } from 'zod';
import { Bookmark, BookmarkFormData } from '../types';

// Schemas for validation
const BookmarkImportSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title too long'),
  url: z.string().url('Invalid URL format'),
  description: z.string().optional(),
  tags: z.array(z.string()).optional().default([]),
  category: z.string().optional(),
  isFavorite: z.boolean().optional().default(false),
  clickCount: z.number().int().min(0).optional().default(0),
  visitTimestamps: z.array(z.string().datetime()).optional().default([]),
  lastVisited: z.string().datetime().optional(),
});

const CSVBookmarkSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  url: z.string().url('Invalid URL format'),
  description: z.string().optional(),
  tags: z.string().optional(), // CSV: comma-separated string
  category: z.string().optional(),
  isFavorite: z.string().optional().transform(val => val?.toLowerCase() === 'true'),
});

type BookmarkImport = z.infer<typeof BookmarkImportSchema>;
type CSVBookmark = z.infer<typeof CSVBookmarkSchema>;

// URL normalization
const normalizeUrl = (url: string): string => {
  try {
    const urlObj = new URL(url);
    // Ensure protocol is present
    if (!urlObj.protocol) {
      return `https://${url}`;
    }
    return urlObj.href;
  } catch {
    // If URL parsing fails, try adding https://
    try {
      const urlObj = new URL(`https://${url}`);
      return urlObj.href;
    } catch {
      throw new Error(`Invalid URL: ${url}`);
    }
  }
};

// Tag normalization
const normalizeTag = (tag: string): string => {
  return tag.toLowerCase().trim().replace(/\s+/g, ' ');
};

// Parse CSV tags string to array
const parseCSVTags = (tagsString?: string): string[] => {
  if (!tagsString) return [];
  return tagsString
    .split(',')
    .map(tag => normalizeTag(tag.trim()))
    .filter(tag => tag.length > 0);
};

// Convert CSV bookmark to full bookmark format
const csvToBookmarkImport = (csvBookmark: CSVBookmark): BookmarkImport => {
  return {
    ...csvBookmark,
    tags: parseCSVTags(csvBookmark.tags),
    clickCount: 0,
    visitTimestamps: [],
  };
};

// Check for duplicate URLs
const findDuplicateByUrl = (bookmarks: Bookmark[], url: string): Bookmark | undefined => {
  const normalizedUrl = normalizeUrl(url);
  return bookmarks.find(bookmark => normalizeUrl(bookmark.url) === normalizedUrl);
};

// Export functions
export const exportToJSON = (bookmarks: Bookmark[]): string => {
  try {
    return JSON.stringify(bookmarks, null, 2);
  } catch {
    throw new Error('Failed to serialize bookmarks to JSON');
  }
};

export const exportToCSV = (bookmarks: Bookmark[]): string => {
  try {
    const headers = ['title', 'url', 'description', 'tags', 'category', 'isFavorite'];
    const rows = bookmarks.map(bookmark => [
      `"${bookmark.title.replace(/"/g, '""')}"`, // Escape quotes
      `"${bookmark.url}"`,
      `"${(bookmark.description || '').replace(/"/g, '""')}"`,
      `"${bookmark.tags.join(', ')}"`,
      `"${bookmark.category || ''}"`,
      bookmark.isFavorite ? 'true' : 'false',
    ]);
    
    return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
  } catch {
    throw new Error('Failed to export bookmarks to CSV');
  }
};

// Import functions
export const importFromJSON = (
  jsonData: string,
  existingBookmarks: Bookmark[],
  options: {
    duplicateStrategy: 'skip' | 'merge';
  } = { duplicateStrategy: 'skip' }
): { success: boolean; bookmarks: Bookmark[]; errors: string[]; imported: number; skipped: number } => {
  const result = {
    success: true,
    bookmarks: [] as Bookmark[],
    errors: [] as string[],
    imported: 0,
    skipped: 0,
  };

  try {
    let parsedData: unknown;
    try {
      parsedData = JSON.parse(jsonData);
    } catch {
      return {
        ...result,
        success: false,
        errors: ['Invalid JSON format'],
      };
    }

    const bookmarksArray = Array.isArray(parsedData) ? parsedData : [parsedData];
    
    for (let i = 0; i < bookmarksArray.length; i++) {
      try {
        const validation = BookmarkImportSchema.safeParse(bookmarksArray[i]);
        if (!validation.success) {
          result.errors.push(`Row ${i + 1}: ${validation.error.issues.map(issue => issue.message).join(', ')}`);
          continue;
        }

        const bookmarkData = validation.data;
        const normalizedUrl = normalizeUrl(bookmarkData.url);
        const existingDuplicate = findDuplicateByUrl(existingBookmarks, normalizedUrl);

        if (existingDuplicate) {
          if (options.duplicateStrategy === 'skip') {
            result.skipped++;
            continue;
          } else if (options.duplicateStrategy === 'merge') {
            // Merge strategy: update existing bookmark with new data
            const mergedBookmark: Bookmark = {
              ...existingDuplicate,
              title: bookmarkData.title || existingDuplicate.title,
              description: bookmarkData.description || existingDuplicate.description,
              tags: Array.from(new Set([...existingDuplicate.tags, ...bookmarkData.tags])),
              isFavorite: bookmarkData.isFavorite ?? existingDuplicate.isFavorite,
              category: bookmarkData.category || existingDuplicate.category,
              updatedAt: new Date(),
            };
            result.bookmarks.push(mergedBookmark);
            result.imported++;
            continue;
          }
        }

        // Create new bookmark
        const newBookmark: Bookmark = {
          id: `import_${Date.now()}_${Math.random().toString(36).slice(2)}`,
          title: bookmarkData.title,
          url: normalizedUrl,
          description: bookmarkData.description,
          tags: bookmarkData.tags.map(normalizeTag),
          category: bookmarkData.category,
          isFavorite: bookmarkData.isFavorite,
          clickCount: bookmarkData.clickCount,
          visitTimestamps: bookmarkData.visitTimestamps.map(ts => new Date(ts)),
          lastVisited: bookmarkData.lastVisited ? new Date(bookmarkData.lastVisited) : undefined,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        result.bookmarks.push(newBookmark);
        result.imported++;
      } catch (error) {
        result.errors.push(`Row ${i + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return result;
  } catch (error) {
    return {
      ...result,
      success: false,
      errors: [`Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`],
    };
  }
};

export const importFromCSV = (
  csvData: string,
  existingBookmarks: Bookmark[],
  options: {
    duplicateStrategy: 'skip' | 'merge';
  } = { duplicateStrategy: 'skip' }
): { success: boolean; bookmarks: Bookmark[]; errors: string[]; imported: number; skipped: number } => {
  const result = {
    success: true,
    bookmarks: [] as Bookmark[],
    errors: [] as string[],
    imported: 0,
    skipped: 0,
  };

  try {
    const lines = csvData.split('\n').filter(line => line.trim());
    
    if (lines.length === 0) {
      return {
        ...result,
        success: false,
        errors: ['CSV file is empty'],
      };
    }

    // Parse header
    const headerLine = lines[0];
    const headers = headerLine.split(',').map(h => h.trim().replace(/^"|"$/g, ''));
    
    const expectedHeaders = ['title', 'url', 'description', 'tags', 'category', 'isFavorite'];
    const missingHeaders = expectedHeaders.filter(h => !headers.includes(h));
    
    if (missingHeaders.length > 0) {
      return {
        ...result,
        success: false,
        errors: [`Missing required columns: ${missingHeaders.join(', ')}`],
      };
    }

    // Parse data rows
    for (let i = 1; i < lines.length; i++) {
      try {
        const line = lines[i];
        const values = parseCSVLine(line);
        
        if (values.length !== headers.length) {
          result.errors.push(`Row ${i + 1}: Column count mismatch`);
          continue;
        }

        const rowObject: Record<string, string> = {};
        headers.forEach((header, index) => {
          rowObject[header] = values[index] || '';
        });

        const validation = CSVBookmarkSchema.safeParse(rowObject);
        if (!validation.success) {
          result.errors.push(`Row ${i + 1}: ${validation.error.issues.map(issue => issue.message).join(', ')}`);
          continue;
        }

        const csvBookmark = validation.data;
        const bookmarkData = csvToBookmarkImport(csvBookmark);
        const normalizedUrl = normalizeUrl(bookmarkData.url);
        const existingDuplicate = findDuplicateByUrl(existingBookmarks, normalizedUrl);

        if (existingDuplicate) {
          if (options.duplicateStrategy === 'skip') {
            result.skipped++;
            continue;
          } else if (options.duplicateStrategy === 'merge') {
            // Merge strategy: update existing bookmark with new data
            const mergedBookmark: Bookmark = {
              ...existingDuplicate,
              title: bookmarkData.title || existingDuplicate.title,
              description: bookmarkData.description || existingDuplicate.description,
              tags: Array.from(new Set([...existingDuplicate.tags, ...bookmarkData.tags])),
              isFavorite: bookmarkData.isFavorite ?? existingDuplicate.isFavorite,
              category: bookmarkData.category || existingDuplicate.category,
              updatedAt: new Date(),
            };
            result.bookmarks.push(mergedBookmark);
            result.imported++;
            continue;
          }
        }

        // Create new bookmark
        const newBookmark: Bookmark = {
          id: `import_${Date.now()}_${Math.random().toString(36).slice(2)}`,
          title: bookmarkData.title,
          url: normalizedUrl,
          description: bookmarkData.description,
          tags: bookmarkData.tags.map(normalizeTag),
          category: bookmarkData.category,
          isFavorite: bookmarkData.isFavorite,
          clickCount: bookmarkData.clickCount,
          visitTimestamps: [], // CSV doesn't preserve visit timestamps
          lastVisited: undefined, // CSV doesn't preserve last visited
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        result.bookmarks.push(newBookmark);
        result.imported++;
      } catch (error) {
        result.errors.push(`Row ${i + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return result;
  } catch (error) {
    return {
      ...result,
      success: false,
      errors: [`CSV import failed: ${error instanceof Error ? error.message : 'Unknown error'}`],
    };
  }
};

// Helper function to parse CSV line handling quoted values
const parseCSVLine = (line: string): string[] => {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        // Escaped quote
        current += '"';
        i++; // Skip next quote
      } else {
        // Toggle quote mode
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      // End of field
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  
  // Add last field
  result.push(current.trim());
  
  return result.map(field => field.replace(/^"|"$/g, ''));
};

// Utility function to detect file format
export const detectImportFormat = (data: string): 'json' | 'csv' | 'unknown' => {
  const trimmed = data.trim();
  
  // Try parsing as JSON first
  try {
    JSON.parse(trimmed);
    return 'json';
  } catch {
    // Not JSON, check if it looks like CSV
    if (trimmed.includes(',') && trimmed.includes('\n')) {
      return 'csv';
    }
  }
  
  return 'unknown';
};

// Universal import function that auto-detects format
export const importBookmarks = (
  data: string,
  existingBookmarks: Bookmark[],
  options: {
    duplicateStrategy: 'skip' | 'merge';
  } = { duplicateStrategy: 'skip' }
) => {
  const format = detectImportFormat(data);
  
  switch (format) {
    case 'json':
      return importFromJSON(data, existingBookmarks, options);
    case 'csv':
      return importFromCSV(data, existingBookmarks, options);
    default:
      return {
        success: false,
        bookmarks: [],
        errors: ['Unable to detect file format. Expected JSON or CSV.'],
        imported: 0,
        skipped: 0,
      };
  }
};
