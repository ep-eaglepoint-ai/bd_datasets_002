'use client';

import { useState, useEffect, useCallback } from 'react';
import { useBookmarkStore } from '../store/bookmarkStore';

export default function BookmarkManager() {
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState('');
  const [category, setCategory] = useState('');
  const [isFavorite, setIsFavorite] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [successMessage, setSuccessMessage] = useState('');

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');

  // Sorting state
  const [sortField, setSortField] = useState<'dateAdded' | 'lastVisited' | 'title' | 'domain' | 'favorite'>('dateAdded');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const {
    bookmarks,
    addBookmark,
    deleteBookmark,
    editBookmark,
    getAllBookmarks,
    searchBookmarksAdvanced,
    sortBookmarks,
  } = useBookmarkStore();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editUrl, setEditUrl] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editTags, setEditTags] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editIsFavorite, setEditIsFavorite] = useState(false);

  // Debounced search effect
  useEffect(() => {
    try {
      const timer = setTimeout(() => {
        setDebouncedSearchQuery(searchQuery);
      }, 300); // 300ms debounce delay

      return () => clearTimeout(timer);
    } catch {
      // Silently handle any errors in debouncing
    }
  }, [searchQuery]);

  // Get search results using the store selector
  const searchResults = debouncedSearchQuery 
    ? searchBookmarksAdvanced(debouncedSearchQuery, {
        fields: ['title', 'url', 'description', 'tags'],
        caseSensitive: false,
        exactMatch: false,
      })
    : bookmarks;

  // Get sorted results for all bookmarks (when not searching)
  const sortedBookmarks = sortBookmarks({
    field: sortField,
    direction: sortDirection,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrors([]);
    setSuccessMessage('');

    const bookmarkData = {
      title,
      url,
      description: description || undefined,
      tags: tags ? tags.split(',').map((tag: string) => tag.trim()).filter((tag: string) => tag) : [],
      category: category || undefined,
      isFavorite,
    };

    const result = addBookmark(bookmarkData);
    
    if (result.success) {
      setSuccessMessage('Bookmark added successfully!');
      setTitle('');
      setUrl('');
      setDescription('');
      setTags('');
      setCategory('');
      setIsFavorite(false);
    } else {
      setErrors(result.error);
    }
  };

  const handleDelete = (id: string) => {
    setErrors([]);
    setSuccessMessage('');

    const result = deleteBookmark(id);
    
    if (result.success) {
      setSuccessMessage('Bookmark deleted successfully!');
    } else {
      setErrors([result.error]);
    }
  };

  const handleEdit = (bookmark: any) => {
    setEditingId(bookmark.id);
    setEditTitle(bookmark.title);
    setEditUrl(bookmark.url);
    setEditDescription(bookmark.description || '');
    setEditTags(bookmark.tags.join(', '));
    setEditCategory(bookmark.category || '');
    setEditIsFavorite(bookmark.isFavorite);
    setErrors([]);
    setSuccessMessage('');
  };

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    setErrors([]);
    setSuccessMessage('');

    const updateData = {
      id: editingId,
      title: editTitle,
      url: editUrl,
      description: editDescription || undefined,
      tags: editTags ? editTags.split(',').map((tag: string) => tag.trim()).filter((tag: string) => tag) : [],
      category: editCategory || undefined,
      isFavorite: editIsFavorite,
    };

    const result = editBookmark(updateData) as any;
    
    if (result.success) {
      setSuccessMessage('Bookmark updated successfully!');
      setEditingId(null);
      setEditTitle('');
      setEditUrl('');
      setEditDescription('');
      setEditTags('');
      setEditCategory('');
      setEditIsFavorite(false);
    } else {
      const error = result.error as string[] | 'not_found';
      if (error === 'not_found') {
        setErrors(['Bookmark not found']);
      } else {
        setErrors(error);
      }
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditTitle('');
    setEditUrl('');
    setEditDescription('');
    setEditTags('');
    setEditCategory('');
    setEditIsFavorite(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Bookmark Manager</h1>
        
        {/* Add Bookmark Form */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Add Bookmark</h2>
          
          {/* Error Display */}
          {errors.length > 0 && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm font-medium text-red-800">Errors:</p>
              <ul className="mt-1 text-sm text-red-700 list-disc list-inside">
                {errors.map((error: string, index: number) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Success Message */}
          {successMessage && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md">
              <p className="text-sm text-green-800">{successMessage}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
                Title *
              </label>
              <input
                type="text"
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter bookmark title"
              />
            </div>

            <div>
              <label htmlFor="url" className="block text-sm font-medium text-gray-700 mb-1">
                URL *
              </label>
              <input
                type="text"
                id="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="https://example.com"
              />
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Optional description"
              />
            </div>

            <div>
              <label htmlFor="tags" className="block text-sm font-medium text-gray-700 mb-1">
                Tags
              </label>
              <input
                type="text"
                id="tags"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="tag1, tag2, tag3"
              />
              <p className="mt-1 text-xs text-gray-500">Separate tags with commas</p>
            </div>

            <div>
              <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
                Category
              </label>
              <input
                type="text"
                id="category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Optional category"
              />
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="favorite"
                checked={isFavorite}
                onChange={(e) => setIsFavorite(e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="favorite" className="ml-2 block text-sm text-gray-700">
                Mark as favorite
              </label>
            </div>

            <button
              type="submit"
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
            >
              Add Bookmark
            </button>
          </form>
        </div>

        {/* Edit Bookmark Form */}
        {editingId && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-8 border-2 border-blue-200">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Edit Bookmark</h2>
            
            <form onSubmit={handleUpdate} className="space-y-4">
              <div>
                <label htmlFor="edit-title" className="block text-sm font-medium text-gray-700 mb-1">
                  Title *
                </label>
                <input
                  type="text"
                  id="edit-title"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter bookmark title"
                />
              </div>

              <div>
                <label htmlFor="edit-url" className="block text-sm font-medium text-gray-700 mb-1">
                  URL *
                </label>
                <input
                  type="text"
                  id="edit-url"
                  value={editUrl}
                  onChange={(e) => setEditUrl(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="https://example.com"
                />
              </div>

              <div>
                <label htmlFor="edit-description" className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  id="edit-description"
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Optional description"
                />
              </div>

              <div>
                <label htmlFor="edit-tags" className="block text-sm font-medium text-gray-700 mb-1">
                  Tags
                </label>
                <input
                  type="text"
                  id="edit-tags"
                  value={editTags}
                  onChange={(e) => setEditTags(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="tag1, tag2, tag3"
                />
                <p className="mt-1 text-xs text-gray-500">Separate tags with commas</p>
              </div>

              <div>
                <label htmlFor="edit-category" className="block text-sm font-medium text-gray-700 mb-1">
                  Category
                </label>
                <input
                  type="text"
                  id="edit-category"
                  value={editCategory}
                  onChange={(e) => setEditCategory(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Optional category"
                />
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="edit-favorite"
                  checked={editIsFavorite}
                  onChange={(e) => setEditIsFavorite(e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="edit-favorite" className="ml-2 block text-sm text-gray-700">
                  Mark as favorite
                </label>
              </div>

              <div className="flex gap-3">
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
                >
                  Update Bookmark
                </button>
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Search Bar */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Search Bookmarks</h2>
          
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Search bookmarks by title, URL, description, or tags..."
            />
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>
          
          {debouncedSearchQuery && (
            <div className="mt-2 text-sm text-gray-600">
              Found {searchResults.length} result{searchResults.length !== 1 ? 's' : ''} for "{debouncedSearchQuery}"
            </div>
          )}
        </div>

        {/* Bookmarks List */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-800">
              {debouncedSearchQuery ? 'Search Results' : 'All Bookmarks'} ({debouncedSearchQuery ? searchResults.length : sortedBookmarks.length})
            </h2>
            
            {/* Sorting Bar - Only show for All Bookmarks */}
            {!debouncedSearchQuery && (
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <label htmlFor="sort-field" className="text-sm font-medium text-gray-700">
                    Sort:
                  </label>
                  <select
                    id="sort-field"
                    value={sortField}
                    onChange={(e) => setSortField(e.target.value as any)}
                    className="px-2 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  >
                    <option value="dateAdded">Date Added</option>
                    <option value="lastVisited">Last Visited</option>
                    <option value="title">Title</option>
                    <option value="domain">Domain</option>
                    <option value="favorite">Favorite</option>
                  </select>
                </div>
                
                <div className="flex items-center gap-2">
                  <label htmlFor="sort-direction" className="text-sm font-medium text-gray-700">
                    Order:
                  </label>
                  <select
                    id="sort-direction"
                    value={sortDirection}
                    onChange={(e) => setSortDirection(e.target.value as 'asc' | 'desc')}
                    className="px-2 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  >
                    <option value="desc">↓</option>
                    <option value="asc">↑</option>
                  </select>
                </div>
              </div>
            )}
          </div>
          
          {(debouncedSearchQuery ? searchResults : sortedBookmarks).length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              {debouncedSearchQuery ? 'No bookmarks found matching your search.' : 'No bookmarks yet. Add your first bookmark above!'}
            </div>
          ) : (
            <div className="space-y-4">
              {(debouncedSearchQuery ? searchResults : sortedBookmarks).map((bookmark) => (
                <div
                  key={bookmark.id}
                  className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="text-lg font-medium text-gray-900">
                          {bookmark.title}
                        </h3>
                        {bookmark.isFavorite && (
                          <span className="text-yellow-500 text-sm">★</span>
                        )}
                      </div>
                      
                      <a
                        href={bookmark.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 text-sm mb-2 inline-block"
                      >
                        {bookmark.url}
                      </a>

                      {bookmark.description && (
                        <p className="text-gray-600 text-sm mb-2">{bookmark.description}</p>
                      )}

                      <div className="flex flex-wrap gap-2 mb-2">
                        {bookmark.tags.map((tag, index) => (
                          <span
                            key={index}
                            className="inline-block bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>

                      {bookmark.category && (
                        <div className="text-xs text-gray-500">
                          Category: {bookmark.category}
                        </div>
                      )}

                      <div className="text-xs text-gray-400 mt-2">
                        Added: {new Date(bookmark.createdAt).toLocaleDateString()}
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEdit(bookmark)}
                        className="text-blue-600 hover:text-blue-800 text-sm font-medium transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(bookmark.id)}
                        className="text-red-600 hover:text-red-800 text-sm font-medium transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
