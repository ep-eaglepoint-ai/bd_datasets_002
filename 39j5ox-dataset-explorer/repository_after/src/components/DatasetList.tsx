'use client';

import { useEffect, useCallback } from 'react';
import { useDatasetStore } from '../store/dataset-store';
import { Button } from '../components/ui/Button';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';

interface DatasetListProps {
  onSelectDataset: (id: string) => void;
  onNewDataset: () => void;
}

export function DatasetList({ onSelectDataset, onNewDataset }: DatasetListProps) {
  const { savedDatasets, isLoading, error, loadSavedDatasets, deleteDataset } = useDatasetStore();

  // Load datasets only once when component mounts
  useEffect(() => {
    let mounted = true;
    
    const loadData = async () => {
      if (mounted) {
        await loadSavedDatasets();
      }
    };
    
    // Only load if we don't have datasets already
    if (savedDatasets.length === 0 && !isLoading) {
      // loadData();
    }
    console.log('Loaded datasets:', savedDatasets);
    return () => {
      mounted = false;
    };
  }, []); // Empty dependency array

  const handleDelete = useCallback(async (id: string, name: string) => {
    if (confirm(`Are you sure you want to delete "${name}"?`)) {
      await deleteDataset(id);
    }
  }, [deleteDataset]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Your Datasets</h1>
        <Button onClick={onNewDataset}>
          Upload New Dataset
        </Button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-6">
          <p className="font-medium">Error</p>
          <p className="text-sm">{error}</p>
        </div>
      )}

      {savedDatasets.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-gray-500 mb-4">
            <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No datasets found</h3>
          <p className="text-gray-500 mb-4">Get started by uploading your first CSV file</p>
          <Button onClick={onNewDataset}>
            Upload Dataset
          </Button>
        </div>
      ) : (
        <div className="grid gap-4">
          {savedDatasets.map((dataset) => (
            <div
              key={dataset.id}
              className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h3 className="text-lg font-medium text-gray-900 mb-1">
                    {dataset.name}
                  </h3>
                  <p className="text-sm text-gray-600 mb-2">
                    {dataset.originalFileName}
                  </p>
                  <div className="flex items-center space-x-4 text-sm text-gray-500">
                    <span>{dataset.versions[0].rowCount.toLocaleString()} rows</span>
                    <span>{(dataset.size / 1024).toFixed(1)} KB</span>
                    <span>Uploaded {dataset.uploadedAt.toLocaleDateString()}</span>
                    <span>{dataset.versions.length} version{dataset.versions.length !== 1 ? 's' : ''}</span>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onSelectDataset(dataset.id)}
                  >
                    Open
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(dataset.id, dataset.name)}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    Delete
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}