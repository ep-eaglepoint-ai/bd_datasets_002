'use client';

import { useState, useEffect, useCallback } from "react";
import { FileRecord, Pagination, Tag, BulkDeleteResponse } from "@/types";
import { 
  MagnifyingGlassIcon, 
  TrashIcon, 
  TagIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  FunnelIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  XMarkIcon,
  DocumentIcon,
  PhotoIcon,
  FilmIcon,
  MusicalNoteIcon,
  CodeBracketIcon,
  DocumentTextIcon,
  ArchiveBoxIcon
} from '@heroicons/react/24/outline';

// File type icon mapping
const getFileIcon = (extension: string, mimeType?: string) => {
  const ext = extension.toLowerCase();
  
  if (['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.svg', '.webp', '.ico'].includes(ext)) {
    return <PhotoIcon className="w-5 h-5 text-green-500" />;
  }
  if (['.mp4', '.webm', '.avi', '.mov', '.mkv'].includes(ext)) {
    return <FilmIcon className="w-5 h-5 text-purple-500" />;
  }
  if (['.mp3', '.wav', '.ogg', '.flac'].includes(ext)) {
    return <MusicalNoteIcon className="w-5 h-5 text-pink-500" />;
  }
  if (['.js', '.ts', '.jsx', '.tsx', '.py', '.rb', '.java', '.c', '.cpp', '.h', '.css', '.html'].includes(ext)) {
    return <CodeBracketIcon className="w-5 h-5 text-blue-500" />;
  }
  if (['.txt', '.md', '.doc', '.docx', '.pdf', '.rtf'].includes(ext)) {
    return <DocumentTextIcon className="w-5 h-5 text-orange-500" />;
  }
  if (['.zip', '.rar', '.7z', '.tar', '.gz'].includes(ext)) {
    return <ArchiveBoxIcon className="w-5 h-5 text-amber-500" />;
  }
  return <DocumentIcon className="w-5 h-5 text-gray-400" />;
};

export default function FilesPage() {
  const [files, setFiles] = useState<FileRecord[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  
  // Search and filters
  const [search, setSearch] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [extension, setExtension] = useState("");
  const [minSize, setMinSize] = useState("");
  const [maxSize, setMaxSize] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [tagFilter, setTagFilter] = useState("");
  
  // Sorting
  const [sortBy, setSortBy] = useState("filename");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  
  // Selection for bulk operations
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);

  const loadFiles = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "25",
        search,
        sortBy,
        sortOrder,
      });
      
      if (extension) params.set("extension", extension);
      if (minSize) params.set("minSize", minSize);
      if (maxSize) params.set("maxSize", maxSize);
      if (fromDate) params.set("fromDate", fromDate);
      if (toDate) params.set("toDate", toDate);
      if (tagFilter) params.set("tags", tagFilter);

      const res = await fetch(`/api/files?${params}`);
      const data = await res.json();
      setFiles(data.data || []);
      setPagination(data.pagination);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [page, search, extension, minSize, maxSize, fromDate, toDate, tagFilter, sortBy, sortOrder]);

  useEffect(() => {
    const timeout = setTimeout(loadFiles, 300);
    return () => clearTimeout(timeout);
  }, [loadFiles]);

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this file? This cannot be undone.")) return;
    await fetch(`/api/files/${id}`, { method: "DELETE" });
    loadFiles();
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const handleBulkDelete = async (dryRun: boolean = false) => {
    if (selectedIds.size === 0) return;
    
    if (!dryRun && !confirm(`Are you sure you want to delete ${selectedIds.size} file(s)? This cannot be undone.`)) {
      return;
    }
    
    setBulkDeleting(true);
    try {
      const res = await fetch('/api/files/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: Array.from(selectedIds), dryRun }),
      });
      
      const data: BulkDeleteResponse = await res.json();
      
      if (dryRun) {
        const failed = data.results.filter(r => !r.success);
        if (failed.length > 0) {
          alert(`${failed.length} file(s) cannot be deleted:\n${failed.map(f => `- ${f.path}: ${f.error}`).join('\n')}`);
        } else {
          alert(`${data.results.length} file(s) can be safely deleted.`);
        }
      } else {
        if (data.summary.failed > 0) {
          alert(`Deleted ${data.summary.success} file(s). ${data.summary.failed} failed.`);
        }
        loadFiles();
        setSelectedIds(new Set());
      }
    } catch (e) {
      console.error(e);
      alert('Bulk delete failed');
    } finally {
      setBulkDeleting(false);
    }
  };

  const handleTag = async (file: FileRecord) => {
    const currentTagNames = file.tags?.map((t) => t.name).join(", ") || "";
    const newTagsStr = prompt("Enter tags (comma separated):", currentTagNames);
    if (newTagsStr === null) return;

    const tags = newTagsStr
      .split(",")
      .map((t) => t.trim())
      .filter((t) => t);

    await fetch(`/api/files/${file.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tags }),
    });
    loadFiles();
  };

  const formatSize = (bytesStr: string) => {
    const bytes = parseInt(bytesStr);
    if (isNaN(bytes)) return "0 B";
    const units = ["B", "KB", "MB", "GB", "TB"];
    let i = 0;
    let s = bytes;
    while (s >= 1024 && i < units.length - 1) {
      s /= 1024;
      i++;
    }
    return `${s.toFixed(1)} ${units[i]}`;
  };

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(prev => prev === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder("asc");
    }
    setPage(1);
  };

  const SortIcon = ({ field }: { field: string }) => {
    if (sortBy !== field) return null;
    return sortOrder === "asc" 
      ? <ChevronUpIcon className="w-4 h-4" />
      : <ChevronDownIcon className="w-4 h-4" />;
  };

  const toggleSelect = (id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === files.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(files.map(f => f.id)));
    }
  };

  const clearFilters = () => {
    setExtension("");
    setMinSize("");
    setMaxSize("");
    setFromDate("");
    setToDate("");
    setTagFilter("");
    setPage(1);
  };

  const hasActiveFilters = extension || minSize || maxSize || fromDate || toDate || tagFilter;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Files</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Browse and manage your indexed files.
          </p>
        </div>
        {pagination && (
          <div className="text-sm text-gray-500">
            {pagination.total.toLocaleString()} total files
          </div>
        )}
      </div>

      {/* Search and Filter Bar */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search files by name..."
              className="block w-full pl-10 pr-3 py-2.5 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 shadow-sm sm:text-sm"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border text-sm font-medium transition-colors ${
              showFilters || hasActiveFilters
                ? 'bg-indigo-50 border-indigo-200 text-indigo-700 dark:bg-indigo-900/30 dark:border-indigo-800 dark:text-indigo-300'
                : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300'
            }`}
          >
            <FunnelIcon className="w-4 h-4" />
            Filters
            {hasActiveFilters && (
              <span className="bg-indigo-600 text-white text-xs rounded-full px-1.5 py-0.5">!</span>
            )}
          </button>
        </div>

        {/* Advanced Filters */}
        {showFilters && (
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-gray-900 dark:text-white">Advanced Filters</h3>
              {hasActiveFilters && (
                <button onClick={clearFilters} className="text-sm text-indigo-600 hover:text-indigo-700">
                  Clear all
                </button>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Extension</label>
                <input
                  type="text"
                  placeholder=".pdf, .docx"
                  value={extension}
                  onChange={(e) => { setExtension(e.target.value); setPage(1); }}
                  className="block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Min Size (bytes)</label>
                <input
                  type="number"
                  placeholder="0"
                  value={minSize}
                  onChange={(e) => { setMinSize(e.target.value); setPage(1); }}
                  className="block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Max Size (bytes)</label>
                <input
                  type="number"
                  placeholder="1000000"
                  value={maxSize}
                  onChange={(e) => { setMaxSize(e.target.value); setPage(1); }}
                  className="block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Tags</label>
                <input
                  type="text"
                  placeholder="tag1, tag2"
                  value={tagFilter}
                  onChange={(e) => { setTagFilter(e.target.value); setPage(1); }}
                  className="block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">From Date</label>
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => { setFromDate(e.target.value); setPage(1); }}
                  className="block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">To Date</label>
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => { setToDate(e.target.value); setPage(1); }}
                  className="block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bulk Actions */}
      {selectedIds.size > 0 && (
        <div className="bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-800 rounded-lg p-4 flex items-center justify-between">
          <span className="text-sm font-medium text-indigo-700 dark:text-indigo-300">
            {selectedIds.size} file(s) selected
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => handleBulkDelete(true)}
              disabled={bulkDeleting}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-amber-700 bg-amber-100 hover:bg-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:hover:bg-amber-900/50 rounded-md transition-colors disabled:opacity-50"
            >
              Preview Delete
            </button>
            <button
              onClick={() => handleBulkDelete(false)}
              disabled={bulkDeleting}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-red-700 bg-red-100 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-300 dark:hover:bg-red-900/50 rounded-md transition-colors disabled:opacity-50"
            >
              <TrashIcon className="w-4 h-4" />
              Delete Selected
            </button>
            <button
              onClick={() => setSelectedIds(new Set())}
              className="p-1.5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 shadow-sm rounded-xl border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700/50">
              <tr>
                <th className="px-4 py-3 w-12">
                  <input
                    type="checkbox"
                    checked={files.length > 0 && selectedIds.size === files.length}
                    onChange={toggleSelectAll}
                    className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                </th>
                <th 
                  onClick={() => handleSort('filename')}
                  className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:text-gray-700 dark:hover:text-gray-200"
                >
                  <div className="flex items-center gap-1">
                    Filename
                    <SortIcon field="filename" />
                  </div>
                </th>
                <th 
                  onClick={() => handleSort('path')}
                  className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:text-gray-700 dark:hover:text-gray-200"
                >
                  <div className="flex items-center gap-1">
                    Path
                    <SortIcon field="path" />
                  </div>
                </th>
                <th 
                  onClick={() => handleSort('size')}
                  className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:text-gray-700 dark:hover:text-gray-200"
                >
                  <div className="flex items-center gap-1">
                    Size
                    <SortIcon field="size" />
                  </div>
                </th>
                <th 
                  onClick={() => handleSort('updatedAt')}
                  className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:text-gray-700 dark:hover:text-gray-200"
                >
                  <div className="flex items-center gap-1">
                    Modified
                    <SortIcon field="updatedAt" />
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Tags
                </th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {loading && files.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-gray-500">
                    <div className="flex justify-center mb-2">
                       <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                    </div>
                    Loading files...
                  </td>
                </tr>
              ) : files.length === 0 ? (
                 <tr>
                  <td colSpan={7} className="p-12 text-center text-gray-500">
                    No files found matching your criteria.
                  </td>
                </tr>
              ) : (
                files.map((file) => (
                  <tr key={file.id} className={`hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${selectedIds.has(file.id) ? 'bg-indigo-50 dark:bg-indigo-900/20' : ''}`}>
                    <td className="px-4 py-4">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(file.id)}
                        onChange={() => toggleSelect(file.id)}
                        className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        {getFileIcon(file.extension, file.mimeType)}
                        <span className="font-medium text-gray-900 dark:text-gray-200 max-w-[200px] truncate" title={file.filename}>
                          {file.filename}
                        </span>
                      </div>
                    </td>
                    <td
                      className="px-6 py-4 whitespace-nowrap overflow-hidden text-ellipsis max-w-[300px] text-gray-500 dark:text-gray-400 text-sm"
                      title={file.path}
                    >
                      {file.path}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 font-mono">
                      {formatSize(file.size)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {new Date(file.updatedAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex flex-wrap gap-1 max-w-[150px]">
                        {file.tags &&
                          file.tags.slice(0, 3).map((t) => (
                            <span
                              key={t.id}
                              className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-indigo-100 text-indigo-800 dark:bg-indigo-900/50 dark:text-indigo-300"
                            >
                              {t.name}
                            </span>
                          ))}
                        {file.tags && file.tags.length > 3 && (
                          <span className="text-xs text-gray-400">+{file.tags.length - 3}</span>
                        )}
                        {(!file.tags || file.tags.length === 0) && (
                          <span className="text-gray-400 dark:text-gray-600">-</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleTag(file)}
                          className="p-1 text-gray-400 hover:text-indigo-600 dark:text-gray-500 dark:hover:text-indigo-400 transition-colors"
                          title="Edit Tags"
                        >
                          <TagIcon className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handleDelete(file.id)}
                          className="p-1 text-gray-400 hover:text-red-600 dark:text-gray-500 dark:hover:text-red-400 transition-colors"
                          title="Delete"
                        >
                           <TrashIcon className="w-5 h-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination && (
          <div className="bg-gray-50 dark:bg-gray-700/30 px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Page <span className="font-medium">{page}</span> of <span className="font-medium">{pagination.totalPages || 1}</span>
              <span className="ml-2">
                (Showing {((page - 1) * 25) + 1}-{Math.min(page * 25, pagination.total)} of {pagination.total})
              </span>
            </div>
            <div className="flex gap-2">
              <button
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
                className="inline-flex items-center px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeftIcon className="w-4 h-4 mr-1" />
                Previous
              </button>
              <button
                disabled={page >= pagination.totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="inline-flex items-center px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Next
                <ChevronRightIcon className="w-4 h-4 ml-1" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
