'use client';

import React, { useMemo, useState } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
  createColumnHelper,
  SortingState,
  ColumnFiltersState,
} from '@tanstack/react-table';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useDatasetStore } from '../store/dataset-store';
import { Button } from '../components/ui/Button';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { cn } from '../lib/utils';

// Simple icons as SVG components
const ArrowUpDown = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
  </svg>
);

const ArrowUp = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
  </svg>
);

const ArrowDown = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
  </svg>
);

const Search = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
);

const X = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
);

export function DatasetTable() {
  const { currentDataset, filteredData, isLoading } = useDatasetStore();
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState('');

  const columnHelper = createColumnHelper<Record<string, any>>();

  const columns = useMemo(() => {
    if (!currentDataset) return [];

    interface DatasetColumn {
      id: string;
      name: string;
      type: string;
    }

    interface DatasetVersion {
      id: string;
      columns: DatasetColumn[];
    }

    interface Dataset {
      id: string;
      currentVersion: string;
      versions: DatasetVersion[];
    }

    const currentVersion = currentDataset.versions.find(
      (v: DatasetVersion) => v.id === (currentDataset as Dataset).currentVersion
    );
    if (!currentVersion) return [];

    return currentVersion.columns.map((col:any) =>
      columnHelper.accessor(col.name, {
        id: col.id,
        header: ({ column }) => (
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 p-0 font-medium text-gray-700 hover:text-gray-900"
              onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            >
              <span className="truncate">{col.name}</span>
              {column.getIsSorted() === 'asc' ? (
                <ArrowUp className="ml-2 h-3 w-3" />
              ) : column.getIsSorted() === 'desc' ? (
                <ArrowDown className="ml-2 h-3 w-3" />
              ) : (
                <ArrowUpDown className="ml-2 h-3 w-3" />
              )}
            </Button>
          </div>
        ),
        cell: ({ getValue }) => {
          const value = getValue();
          
          if (value === null || value === undefined) {
            return <span className="text-gray-400 italic">null</span>;
          }
          
          if (col.type === 'number') {
            return <span className="font-mono text-right">{Number(value).toLocaleString()}</span>;
          }
          
          if (col.type === 'date' && value instanceof Date) {
            return <span className="font-mono">{value.toLocaleDateString()}</span>;
          }
          
          if (col.type === 'boolean') {
            return (
              <span className={cn(
                'px-2 py-1 rounded text-xs font-medium',
                value 
                  ? 'bg-green-100 text-green-800'
                  : 'bg-red-100 text-red-800'
              )}>
                {String(value)}
              </span>
            );
          }
          
          const stringValue = String(value);
          return (
            <span className="truncate block" title={stringValue}>
              {stringValue}
            </span>
          );
        },
        meta: {
          type: col.type,
        },
      })
    );
  }, [currentDataset, columnHelper]);

  const table = useReactTable({
    data: filteredData,
    columns,
    state: {
      sorting,
      columnFilters,
      globalFilter,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  const { rows } = table.getRowModel();

  // Virtualization
  const parentRef = React.useRef<HTMLDivElement>(null);
  
  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 40,
    overscan: 10,
  });

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!currentDataset || filteredData.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center space-y-2">
          <p className="text-lg font-medium text-gray-600">No data to display</p>
          <p className="text-sm text-gray-500">
            {!currentDataset 
              ? 'Upload a CSV file to get started'
              : 'Try adjusting your filters'
            }
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Search Bar */}
      <div className="p-4 border-b border-gray-200 bg-gray-50">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search across all columns..."
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          {globalFilter && (
            <button
              className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1 hover:bg-gray-100 rounded"
              onClick={() => setGlobalFilter('')}
            >
              <X className="h-4 w-4 text-gray-400" />
            </button>
          )}
        </div>
      </div>

      {/* Table Info */}
      <div className="px-4 py-2 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between text-sm text-gray-600">
          <span>
            Showing {rows.length.toLocaleString()} of {filteredData.length.toLocaleString()} rows
          </span>
          <span>
            {columns.length} columns
          </span>
        </div>
      </div>

      {/* Virtual Table */}
      <div className="flex-1 overflow-hidden">
        <div ref={parentRef} className="h-full overflow-auto scrollbar-thin">
          <div style={{ height: `${virtualizer.getTotalSize()}px` }} className="relative">
            {/* Header */}
            <div className="sticky top-0 z-10 bg-white border-b border-gray-200 shadow-sm">
              {table.getHeaderGroups().map((headerGroup) => (
                <div key={headerGroup.id} className="flex">
                  {headerGroup.headers.map((header) => (
                    <div
                      key={header.id}
                      className="flex-1 min-w-30 max-w-75 px-4 py-3 text-left font-medium bg-gray-50 border-r border-gray-200 last:border-r-0"
                      style={{ width: header.getSize() }}
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())
                      }
                    </div>
                  ))}
                </div>
              ))}
            </div>

            {/* Virtual Rows */}
            {virtualizer.getVirtualItems().map((virtualRow) => {
              const row = rows[virtualRow.index];
              return (
                <div
                  key={row.id}
                  className={cn(
                    "absolute top-16 left-0 w-full flex hover:bg-blue-50 transition-colors",
                    virtualRow.index % 2 === 0 ? "bg-white" : "bg-gray-50"
                  )}
                  style={{
                    height: `${virtualRow.size}px`,
                    transform: `translateY(${virtualRow.start}px)`,
                  }}
                >
                  {row.getVisibleCells().map((cell) => (
                    <div
                      key={cell.id}
                      className="flex-1 min-w-30 max-w-75 px-4 py-2 border-r border-gray-200 last:border-r-0 flex items-center text-sm"
                      style={{ width: cell.column.getSize() }}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}