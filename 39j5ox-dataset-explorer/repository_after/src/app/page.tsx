'use client';

import { useState, useEffect, useCallback } from 'react';
import { useDatasetStore } from '../store/dataset-store';
import { FileUpload } from '../components/FileUpload';
import { DatasetTable } from '../components/DatasetTable';
import { FilterPanel } from '../components/FilterPanel';
import { StatsPanel } from '../components/StatsPanel';
import { VisualizationPanel } from '../components/VisualizationPanel';
import { Header } from '../components/Header';
import { DatasetList } from '../components/DatasetList';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';

export default function Home() {
  const { currentDataset, isLoading, error, loadDataset, loadSavedDatasets } = useDatasetStore();
  const [activePanel, setActivePanel] = useState<'filters' | 'stats' | 'visualizations'>('stats');
  const [showUpload, setShowUpload] = useState(false);

  // Load saved datasets on startup - only run once
  useEffect(() => {
    let mounted = true;
    
    const loadData = async () => {
      if (mounted) {
        await loadSavedDatasets();
      }
    };
    
    loadData();
    
    return () => {
      mounted = false;
    };
  }, []); // Empty dependency array - only run once on mount

  const handleSelectDataset = useCallback(async (id: string) => {
    await loadDataset(id);
  }, [loadDataset]);

  const handleNewDataset = useCallback(() => {
    setShowUpload(true);
  }, []);

  const handleBackToList = useCallback(() => {
    setShowUpload(false);
  }, []);

  return (
    <div className="flex h-full bg-gray-50">
      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <Header />

        {/* Content Area */}
        <div className="flex-1 flex overflow-hidden">
          {/* Dataset View */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md m-4">
                <p className="font-medium">Error</p>
                <p className="text-sm">{error}</p>
              </div>
            )}

            {isLoading && (
              <div className="flex-1 flex items-center justify-center">
                <LoadingSpinner size="lg" />
              </div>
            )}

            {/* Show dataset list, upload, or dataset table based on state */}
            {!currentDataset && !isLoading && !error && (
              <div className="flex-1 overflow-auto">
                {showUpload ? (
                  <div className="flex-1 flex flex-col items-center justify-center">
                    <div className="mb-4">
                      <button
                        onClick={handleBackToList}
                        className="text-blue-600 hover:text-blue-700 text-sm"
                      >
                        ← Back to datasets
                      </button>
                    </div>
                    <FileUpload />
                  </div>
                ) : (
                  <DatasetList
                    onSelectDataset={handleSelectDataset}
                    onNewDataset={handleNewDataset}
                  />
                )}
              </div>
            )}

            {currentDataset && !isLoading && (
              <div className="flex-1 overflow-hidden">
                <DatasetTable />
              </div>
            )}
          </div>

          {/* Right Panel */}
          {currentDataset && (
            <div className="w-80 border-l border-gray-200 bg-white overflow-hidden">
              {/* Panel Tabs */}
              <div className="border-b border-gray-200 p-4">
                <div className="flex space-x-2">
                  <button
                    onClick={() => setActivePanel('stats')}
                    className={`px-3 py-1 text-sm rounded ${
                      activePanel === 'stats' 
                        ? 'bg-blue-100 text-blue-700' 
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    Statistics
                  </button>
                  <button
                    onClick={() => setActivePanel('filters')}
                    className={`px-3 py-1 text-sm rounded ${
                      activePanel === 'filters' 
                        ? 'bg-blue-100 text-blue-700' 
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    Filters
                  </button>
                  <button
                    onClick={() => setActivePanel('visualizations')}
                    className={`px-3 py-1 text-sm rounded ${
                      activePanel === 'visualizations' 
                        ? 'bg-blue-100 text-blue-700' 
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    Charts
                  </button>
                </div>
              </div>

              {/* Panel Content */}
              <div className="flex-1 overflow-hidden">
                {activePanel === 'filters' && <FilterPanel />}
                {activePanel === 'stats' && <StatsPanel />}
                {activePanel === 'visualizations' && <VisualizationPanel />}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}