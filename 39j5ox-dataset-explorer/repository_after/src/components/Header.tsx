'use client';

import { useDatasetStore } from '../store/dataset-store';
import { Button } from '../components/ui/Button';

export function Header() {
  const { 
    currentDataset, 
    filteredData, 
    undo, 
    redo, 
    canUndo, 
    canRedo, 
    saveToStorage,
    clearCurrentDataset
  } = useDatasetStore();

  const handleSave = async () => {
    try {
      console.log('Save button clicked, attempting to save...');
      await saveToStorage();
      console.log('Save completed successfully');
      // You could add a toast notification here
      alert('Dataset saved successfully!');
    } catch (error) {
      console.error('Save failed:', error);
      alert('Failed to save dataset: ' + error);
    }
  };

  const handleBackToList = () => {
    clearCurrentDataset();
  };

  const handleExport = () => {
    if (!currentDataset || filteredData.length === 0) return;

    // Simple CSV export
    const headers = Object.keys(filteredData[0]);
    const csvContent = [
      headers.join(','),
      ...filteredData.map(row => 
        headers.map(header => {
          const value = row[header];
          const stringValue = value === null || value === undefined ? '' : String(value);
          // Escape quotes and wrap in quotes if contains comma or quote
          if (stringValue.includes(',') || stringValue.includes('"')) {
            return `"${stringValue.replace(/"/g, '""')}"`;
          }
          return stringValue;
        }).join(',')
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${currentDataset.name}_filtered.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!currentDataset) {
    return (
      <header className="border-b border-gray-200 bg-white px-6 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold">Dataset Explorer</h1>
        </div>
      </header>
    );
  }

  return (
    <header className="border-b border-gray-200 bg-white px-6 py-4">
      <div className="flex items-center justify-between">
        {/* Dataset Info */}
        <div className="flex items-center space-x-6">
          <button
            onClick={handleBackToList}
            className="text-blue-600 hover:text-blue-700 text-sm"
          >
            ← Back to datasets
          </button>
          
          <div>
            <h1 className="text-lg font-semibold">{currentDataset.name}</h1>
            <p className="text-sm text-gray-600">{currentDataset.originalFileName}</p>
          </div>

          <div className="flex items-center space-x-4 text-sm text-gray-600">
            <span>{filteredData.length.toLocaleString()} rows</span>
            <span>{(currentDataset.size / 1024).toFixed(1)} KB</span>
            <span>{currentDataset.uploadedAt.toLocaleDateString()}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={undo}
            disabled={!canUndo()}
          >
            Undo
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={redo}
            disabled={!canRedo()}
          >
            Redo
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleSave}
          >
            Save
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            disabled={filteredData.length === 0}
          >
            Export CSV
          </Button>
        </div>
      </div>
    </header>
  );
}