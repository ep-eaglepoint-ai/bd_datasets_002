'use client';

import { useState, useEffect } from "react";
import { FileRecord, DuplicatesResponse, BulkDeleteResponse } from "@/types";
import { 
  TrashIcon, 
  DocumentDuplicateIcon,
  ExclamationTriangleIcon,
  CheckBadgeIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ArchiveBoxIcon
} from '@heroicons/react/24/outline';

export default function DuplicatesPage() {
  const [data, setData] = useState<DuplicatesResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [selectedForDeletion, setSelectedForDeletion] = useState<Set<number>>(new Set());

  const loadDuplicates = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/duplicates?page=${page}&limit=20`);
      const responseData: DuplicatesResponse = await res.json();
      setData(responseData);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDuplicates();
  }, [page]);

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this copy? This cannot be undone.")) return;
    await fetch(`/api/files/${id}`, { method: "DELETE" });
    loadDuplicates();
    setSelectedForDeletion(prev => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const handleBulkDelete = async () => {
    if (selectedForDeletion.size === 0) return;
    
    if (!confirm(`Delete ${selectedForDeletion.size} duplicate file(s)? This cannot be undone.`)) {
      return;
    }

    try {
      const res = await fetch('/api/files/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: Array.from(selectedForDeletion) }),
      });
      
      const result: BulkDeleteResponse = await res.json();
      
      if (result.summary.failed > 0) {
        alert(`Deleted ${result.summary.success} file(s). ${result.summary.failed} failed.`);
      }
      
      loadDuplicates();
      setSelectedForDeletion(new Set());
    } catch (e) {
      console.error(e);
      alert('Bulk delete failed');
    }
  };

  const toggleSelect = (id: number) => {
    setSelectedForDeletion(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Auto-select all duplicates except the first in each group
  const autoSelectDuplicates = () => {
    if (!data) return;
    const idsToSelect: number[] = [];
    data.groups.forEach(group => {
      // Skip the first file (keep it), select the rest for deletion
      group.slice(1).forEach(file => {
        idsToSelect.push(file.id);
      });
    });
    setSelectedForDeletion(new Set(idsToSelect));
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

  const groups = data?.groups || [];
  const totalGroups = data?.totalGroups || 0;
  const stats = data?.stats;
  const pagination = data?.pagination;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Duplicate Files</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Review and clean up exact duplicates to save space.
          </p>
        </div>
        {stats && totalGroups > 0 && (
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-xs text-gray-500 uppercase tracking-wider">Potential Savings</p>
              <p className="text-lg font-bold text-green-600 dark:text-green-400">
                {formatSize(stats.potentialSpaceSaved)}
              </p>
            </div>
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm">
           <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600 mb-4"></div>
           <p className="text-gray-500 font-medium">Analyzing file hashes...</p>
        </div>
      ) : (
        <div className="space-y-6">
          {totalGroups > 0 && (
            <>
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-400 p-4 rounded-r-lg">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <ExclamationTriangleIcon className="h-5 w-5 text-yellow-400" aria-hidden="true" />
                  </div>
                  <div className="ml-3 flex-1">
                    <p className="text-sm text-yellow-700 dark:text-yellow-200">
                      Found {totalGroups} groups of duplicate files ({stats?.totalDuplicateFiles} total files). Deleting files is permanent.
                    </p>
                  </div>
                  <div className="ml-4 flex gap-2">
                    <button
                      onClick={autoSelectDuplicates}
                      className="text-sm font-medium text-yellow-700 hover:text-yellow-800 dark:text-yellow-300 dark:hover:text-yellow-200 underline"
                    >
                      Auto-select duplicates
                    </button>
                  </div>
                </div>
              </div>

              {selectedForDeletion.size > 0 && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 flex items-center justify-between">
                  <span className="text-sm font-medium text-red-700 dark:text-red-300">
                    {selectedForDeletion.size} file(s) selected for deletion
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setSelectedForDeletion(new Set())}
                      className="px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900"
                    >
                      Clear
                    </button>
                    <button
                      onClick={handleBulkDelete}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md transition-colors"
                    >
                      <TrashIcon className="w-4 h-4" />
                      Delete Selected
                    </button>
                  </div>
                </div>
              )}
            </>
          )}

          {groups.map((group, i) => (
            <div
              key={i}
              className="bg-white dark:bg-gray-800 shadow-sm rounded-xl overflow-hidden border border-gray-100 dark:border-gray-700 hover:shadow-md transition-shadow"
            >
              <div className="bg-gray-50 dark:bg-gray-700/30 px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-indigo-100 dark:bg-indigo-900/50 rounded-lg">
                    <DocumentDuplicateIcon className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Duplicate Group #{(page - 1) * 20 + i + 1}</h3>
                    <p className="text-xs text-gray-500">
                       Hash: <span className="font-mono">{group[0]?.hash?.substring(0, 12)}...</span>
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <span className="block text-xs text-gray-400 uppercase tracking-wider font-semibold">Size</span>
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-200">
                      {formatSize(group[0]?.size)}
                    </span>
                  </div>
                   <div className="text-right border-l pl-4 dark:border-gray-600">
                    <span className="block text-xs text-gray-400 uppercase tracking-wider font-semibold">Count</span>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300">
                      {group.length} copies
                    </span>
                  </div>
                  <div className="text-right border-l pl-4 dark:border-gray-600">
                    <span className="block text-xs text-gray-400 uppercase tracking-wider font-semibold">Waste</span>
                    <span className="text-sm font-medium text-amber-600 dark:text-amber-400">
                      {formatSize((parseInt(group[0]?.size || '0') * (group.length - 1)).toString())}
                    </span>
                  </div>
                </div>
              </div>

              <div className="divide-y divide-gray-100 dark:divide-gray-700">
                {group.map((file, fileIdx) => (
                  <div key={file.id} className={`p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors ${selectedForDeletion.has(file.id) ? 'bg-red-50 dark:bg-red-900/20' : ''}`}>
                    <div className="flex items-center gap-3 min-w-0 flex-1 pr-4">
                      <input
                        type="checkbox"
                        checked={selectedForDeletion.has(file.id)}
                        onChange={() => toggleSelect(file.id)}
                        className="rounded border-gray-300 text-red-600 focus:ring-red-500"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          {fileIdx === 0 && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                              Original
                            </span>
                          )}
                          <p className="text-sm font-medium text-gray-900 dark:text-gray-200 truncate" title={file.filename}>
                            {file.filename}
                          </p>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate font-mono mt-0.5" title={file.path}>
                          {file.path}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400">
                        {new Date(file.updatedAt).toLocaleDateString()}
                      </span>
                      <button
                        onClick={() => handleDelete(file.id)}
                        className="group inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/40 rounded-lg transition-colors border border-transparent hover:border-red-200 dark:hover:border-red-800"
                      >
                        <TrashIcon className="w-4 h-4" />
                        <span>Delete</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {!loading && groups.length === 0 && (
             <div className="text-center py-20 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 border-dashed">
                <div className="mx-auto h-12 w-12 text-gray-300 dark:text-gray-600 bg-gray-50 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
                  <CheckBadgeIcon className="h-8 w-8" />
                </div>
                <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">No duplicates found</h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Great job! Your file collection is clean.</p>
              </div>
          )}

          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-between bg-white dark:bg-gray-800 px-6 py-4 rounded-lg border border-gray-100 dark:border-gray-700">
              <div className="text-sm text-gray-500">
                Page {page} of {pagination.totalPages} ({totalGroups} groups)
              </div>
              <div className="flex gap-2">
                <button
                  disabled={page === 1}
                  onClick={() => setPage(p => p - 1)}
                  className="inline-flex items-center px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeftIcon className="w-4 h-4 mr-1" />
                  Previous
                </button>
                <button
                  disabled={page >= pagination.totalPages}
                  onClick={() => setPage(p => p + 1)}
                  className="inline-flex items-center px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                  <ChevronRightIcon className="w-4 h-4 ml-1" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
