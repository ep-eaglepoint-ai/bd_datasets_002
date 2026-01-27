'use client';

import { useState } from 'react';
import { Document, AnalyticsResult } from '@/lib/types';

interface FilterCriteria {
  sentimentRange: [number, number];
  readabilityRange: [number, number];
  wordCountRange: [number, number];
  dateRange: [number | null, number | null];
  project: string;
  tags: string[];
}

interface AdvancedFiltersProps {
  documents: Document[];
  analytics: Map<string, AnalyticsResult>;
  onFilterChange: (filteredDocs: Document[]) => void;
}

export default function AdvancedFilters({
  documents,
  analytics,
  onFilterChange,
}: AdvancedFiltersProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [filters, setFilters] = useState<FilterCriteria>({
    sentimentRange: [-1, 1],
    readabilityRange: [0, 100],
    wordCountRange: [0, 100000],
    dateRange: [null, null],
    project: '',
    tags: [],
  });

  const allProjects = [...new Set(documents.map(d => d.project).filter(Boolean))];
  const allTags = [...new Set(documents.flatMap(d => d.tags || []))];

  const applyFilters = () => {
    const filtered = documents.filter(doc => {
      const docAnalytics = analytics.get(doc.id);

      // Sentiment filter
      if (docAnalytics) {
        const sentiment = docAnalytics.sentiment.score;
        if (sentiment < filters.sentimentRange[0] || sentiment > filters.sentimentRange[1]) {
          return false;
        }

        // Readability filter
        const readability = docAnalytics.readability.fleschReadingEase;
        if (readability < filters.readabilityRange[0] || readability > filters.readabilityRange[1]) {
          return false;
        }

        // Word count filter
        const wordCount = docAnalytics.wordCount;
        if (wordCount < filters.wordCountRange[0] || wordCount > filters.wordCountRange[1]) {
          return false;
        }
      }

      // Date filter
      if (filters.dateRange[0] && doc.createdAt < filters.dateRange[0]) {
        return false;
      }
      if (filters.dateRange[1] && doc.createdAt > filters.dateRange[1]) {
        return false;
      }

      // Project filter
      if (filters.project && doc.project !== filters.project) {
        return false;
      }

      // Tags filter
      if (filters.tags.length > 0) {
        const docTags = doc.tags || [];
        if (!filters.tags.some(tag => docTags.includes(tag))) {
          return false;
        }
      }

      return true;
    });

    onFilterChange(filtered);
  };

  const resetFilters = () => {
    setFilters({
      sentimentRange: [-1, 1],
      readabilityRange: [0, 100],
      wordCountRange: [0, 100000],
      dateRange: [null, null],
      project: '',
      tags: [],
    });
    onFilterChange(documents);
  };

  const getSentimentLabel = (value: number): string => {
    if (value < -0.3) return 'Very Negative';
    if (value < 0) return 'Negative';
    if (value === 0) return 'Neutral';
    if (value < 0.3) return 'Positive';
    return 'Very Positive';
  };

  const getReadabilityLabel = (value: number): string => {
    if (value < 30) return 'Very Difficult';
    if (value < 50) return 'Difficult';
    if (value < 60) return 'Fairly Difficult';
    if (value < 70) return 'Standard';
    if (value < 80) return 'Fairly Easy';
    if (value < 90) return 'Easy';
    return 'Very Easy';
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-4">
      <div
        className="flex justify-between items-center cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <span>🔍</span> Advanced Filters
        </h3>
        <button className="text-gray-500 hover:text-gray-700">
          {isExpanded ? '▼' : '▶'}
        </button>
      </div>

      {isExpanded && (
        <div className="mt-4 space-y-4">
          {/* Sentiment Range */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Sentiment Range
            </label>
            <div className="flex items-center gap-4">
              <input
                type="range"
                min="-1"
                max="1"
                step="0.1"
                value={filters.sentimentRange[0]}
                onChange={(e) => setFilters({
                  ...filters,
                  sentimentRange: [parseFloat(e.target.value), filters.sentimentRange[1]]
                })}
                className="flex-1"
              />
              <input
                type="range"
                min="-1"
                max="1"
                step="0.1"
                value={filters.sentimentRange[1]}
                onChange={(e) => setFilters({
                  ...filters,
                  sentimentRange: [filters.sentimentRange[0], parseFloat(e.target.value)]
                })}
                className="flex-1"
              />
            </div>
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>{getSentimentLabel(filters.sentimentRange[0])} ({filters.sentimentRange[0].toFixed(1)})</span>
              <span>{getSentimentLabel(filters.sentimentRange[1])} ({filters.sentimentRange[1].toFixed(1)})</span>
            </div>
          </div>

          {/* Readability Range */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Readability Range (Flesch Reading Ease)
            </label>
            <div className="flex items-center gap-4">
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={filters.readabilityRange[0]}
                onChange={(e) => setFilters({
                  ...filters,
                  readabilityRange: [parseInt(e.target.value), filters.readabilityRange[1]]
                })}
                className="flex-1"
              />
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={filters.readabilityRange[1]}
                onChange={(e) => setFilters({
                  ...filters,
                  readabilityRange: [filters.readabilityRange[0], parseInt(e.target.value)]
                })}
                className="flex-1"
              />
            </div>
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>{getReadabilityLabel(filters.readabilityRange[0])} ({filters.readabilityRange[0]})</span>
              <span>{getReadabilityLabel(filters.readabilityRange[1])} ({filters.readabilityRange[1]})</span>
            </div>
          </div>

          {/* Word Count Range */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Word Count Range
            </label>
            <div className="flex items-center gap-4">
              <input
                type="number"
                min="0"
                value={filters.wordCountRange[0]}
                onChange={(e) => setFilters({
                  ...filters,
                  wordCountRange: [parseInt(e.target.value) || 0, filters.wordCountRange[1]]
                })}
                className="w-24 p-2 border border-gray-300 rounded"
                placeholder="Min"
              />
              <span className="text-gray-500">to</span>
              <input
                type="number"
                min="0"
                value={filters.wordCountRange[1]}
                onChange={(e) => setFilters({
                  ...filters,
                  wordCountRange: [filters.wordCountRange[0], parseInt(e.target.value) || 100000]
                })}
                className="w-24 p-2 border border-gray-300 rounded"
                placeholder="Max"
              />
            </div>
          </div>

          {/* Project Filter */}
          {allProjects.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Project
              </label>
              <select
                value={filters.project}
                onChange={(e) => setFilters({ ...filters, project: e.target.value })}
                className="w-full p-2 border border-gray-300 rounded"
              >
                <option value="">All Projects</option>
                {allProjects.map(project => (
                  <option key={project} value={project}>{project}</option>
                ))}
              </select>
            </div>
          )}

          {/* Tags Filter */}
          {allTags.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tags
              </label>
              <div className="flex flex-wrap gap-2">
                {allTags.map(tag => (
                  <button
                    key={tag}
                    onClick={() => {
                      const newTags = filters.tags.includes(tag)
                        ? filters.tags.filter(t => t !== tag)
                        : [...filters.tags, tag];
                      setFilters({ ...filters, tags: newTags });
                    }}
                    className={`px-3 py-1 text-sm rounded-full transition ${
                      filters.tags.includes(tag)
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2 pt-2">
            <button
              onClick={applyFilters}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Apply Filters
            </button>
            <button
              onClick={resetFilters}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
            >
              Reset
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
