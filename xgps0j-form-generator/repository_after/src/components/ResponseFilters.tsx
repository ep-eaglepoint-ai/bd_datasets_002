'use client';

import { useState } from 'react';
import { Survey } from '@/types/survey';
import { FilterIcon, XIcon, CalendarIcon, SearchIcon } from 'lucide-react';

interface ResponseFiltersProps {
  filters: {
    dateRange: { start: Date; end: Date } | null;
    completionStatus: 'all' | 'completed' | 'partial';
    textSearch: string;
  };
  onFiltersChange: (filters: any) => void;
  survey: Survey;
}

export default function ResponseFilters({ filters, onFiltersChange, survey }: ResponseFiltersProps) {
  const [showFilters, setShowFilters] = useState(false);
  const [startDate, setStartDate] = useState(
    filters.dateRange?.start.toISOString().split('T')[0] || ''
  );
  const [endDate, setEndDate] = useState(
    filters.dateRange?.end.toISOString().split('T')[0] || ''
  );

  const handleDateRangeChange = () => {
    if (startDate && endDate) {
      onFiltersChange({
        ...filters,
        dateRange: {
          start: new Date(startDate),
          end: new Date(endDate + 'T23:59:59')
        }
      });
    } else {
      onFiltersChange({
        ...filters,
        dateRange: null
      });
    }
  };

  const handleCompletionStatusChange = (status: 'all' | 'completed' | 'partial') => {
    onFiltersChange({
      ...filters,
      completionStatus: status
    });
  };

  const handleTextSearchChange = (search: string) => {
    onFiltersChange({
      ...filters,
      textSearch: search
    });
  };

  const clearFilters = () => {
    setStartDate('');
    setEndDate('');
    onFiltersChange({
      dateRange: null,
      completionStatus: 'all',
      textSearch: ''
    });
  };

  const hasActiveFilters = filters.dateRange || filters.completionStatus !== 'all' || filters.textSearch;

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          <FilterIcon className="h-5 w-5 text-gray-600 mr-2" />
          <h3 className="text-lg font-medium text-gray-900">Filters</h3>
          {hasActiveFilters && (
            <span className="ml-2 bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
              Active
            </span>
          )}
        </div>
        <div className="flex items-center space-x-2">
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="text-sm text-gray-600 hover:text-gray-800"
            >
              Clear all
            </button>
          )}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="btn-secondary"
          >
            {showFilters ? 'Hide' : 'Show'} Filters
          </button>
        </div>
      </div>

      {showFilters && (
        <div className="space-y-6">
          {/* Date Range Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <CalendarIcon className="h-4 w-4 inline mr-1" />
              Date Range
            </label>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1">From</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    setTimeout(handleDateRangeChange, 100);
                  }}
                  className="input"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">To</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => {
                    setEndDate(e.target.value);
                    setTimeout(handleDateRangeChange, 100);
                  }}
                  className="input"
                />
              </div>
            </div>
          </div>

          {/* Completion Status Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Completion Status
            </label>
            <div className="flex space-x-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="completionStatus"
                  value="all"
                  checked={filters.completionStatus === 'all'}
                  onChange={(e) => handleCompletionStatusChange(e.target.value as any)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                />
                <span className="ml-2 text-sm text-gray-700">All</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="completionStatus"
                  value="completed"
                  checked={filters.completionStatus === 'completed'}
                  onChange={(e) => handleCompletionStatusChange(e.target.value as any)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                />
                <span className="ml-2 text-sm text-gray-700">Completed</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="completionStatus"
                  value="partial"
                  checked={filters.completionStatus === 'partial'}
                  onChange={(e) => handleCompletionStatusChange(e.target.value as any)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                />
                <span className="ml-2 text-sm text-gray-700">Partial</span>
              </label>
            </div>
          </div>

          {/* Text Search Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <SearchIcon className="h-4 w-4 inline mr-1" />
              Search in Text Responses
            </label>
            <div className="relative">
              <input
                type="text"
                value={filters.textSearch}
                onChange={(e) => handleTextSearchChange(e.target.value)}
                className="input pl-10"
                placeholder="Search for keywords in text responses..."
              />
              <SearchIcon className="h-4 w-4 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
              {filters.textSearch && (
                <button
                  onClick={() => handleTextSearchChange('')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <XIcon className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          {/* Active Filters Summary */}
          {hasActiveFilters && (
            <div className="pt-4 border-t border-gray-200">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Active Filters:</h4>
              <div className="flex flex-wrap gap-2">
                {filters.dateRange && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    Date: {filters.dateRange.start.toLocaleDateString()} - {filters.dateRange.end.toLocaleDateString()}
                    <button
                      onClick={() => {
                        setStartDate('');
                        setEndDate('');
                        onFiltersChange({ ...filters, dateRange: null });
                      }}
                      className="ml-1 text-blue-600 hover:text-blue-800"
                    >
                      <XIcon className="h-3 w-3" />
                    </button>
                  </span>
                )}
                {filters.completionStatus !== 'all' && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    Status: {filters.completionStatus}
                    <button
                      onClick={() => handleCompletionStatusChange('all')}
                      className="ml-1 text-green-600 hover:text-green-800"
                    >
                      <XIcon className="h-3 w-3" />
                    </button>
                  </span>
                )}
                {filters.textSearch && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                    Search: "{filters.textSearch}"
                    <button
                      onClick={() => handleTextSearchChange('')}
                      className="ml-1 text-purple-600 hover:text-purple-800"
                    >
                      <XIcon className="h-3 w-3" />
                    </button>
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}