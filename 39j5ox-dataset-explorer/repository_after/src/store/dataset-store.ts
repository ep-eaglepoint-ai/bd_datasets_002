import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { Dataset, DatasetVersion, Filter, Transformation, Column } from '@/types/dataset';
import { storageManager } from '../lib/storage';
import { generateId, calculateChecksum } from '../lib/utils';

interface DatasetState {
  // Current dataset
  currentDataset: Dataset | null;
  
  // UI state
  isLoading: boolean;
  error: string | null;
  
  // Data processing
  filteredData: Record<string, any>[];
  
  // History management
  undoStack: string[];
  redoStack: string[];
  
  // Saved datasets list
  savedDatasets: Dataset[];
  
  // Actions
  loadDataset: (id: string) => Promise<void>;
  setCurrentDataset: (dataset: Dataset) => void;
  updateDataset: (updates: Partial<Dataset>) => void;
  
  // Dataset management
  loadSavedDatasets: () => Promise<void>;
  deleteDataset: (id: string) => Promise<void>;
  clearCurrentDataset: () => void;
  
  // Version management
  createVersion: (name: string, description?: string) => void;
  restoreVersion: (versionId: string) => void;
  
  // Filters
  addFilter: (filter: Omit<Filter, 'id'>) => void;
  updateFilter: (id: string, updates: Partial<Filter>) => void;
  removeFilter: (id: string) => void;
  clearFilters: () => void;
  
  // Transformations
  addTransformation: (transformation: Omit<Transformation, 'id'>) => void;
  updateTransformation: (id: string, updates: Partial<Transformation>) => void;
  removeTransformation: (id: string) => void;
  clearTransformations: () => void;
  
  // Columns
  updateColumn: (id: string, updates: Partial<Column>) => void;
  
  // History
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
  saveStateToHistory: () => void;
  
  // Persistence
  saveToStorage: () => Promise<void>;
  
  // Utilities
  applyFiltersAndTransformations: () => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useDatasetStore = create<DatasetState>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    currentDataset: null,
    isLoading: false,
    error: null,
    filteredData: [],
    undoStack: [],
    redoStack: [],
    savedDatasets: [],

    // Load dataset from storage
    loadDataset: async (id: string) => {
      set({ isLoading: true, error: null });
      
      try {
        const dataset = await storageManager.loadDataset(id);
        if (dataset) {
          set({ 
            currentDataset: dataset,
            filteredData: dataset.processedData,
            undoStack: [],
            redoStack: [],
          });
          get().applyFiltersAndTransformations();
        } else {
          set({ error: 'Dataset not found' });
        }
      } catch (error) {
        set({ error: `Failed to load dataset: ${error}` });
      } finally {
        set({ isLoading: false });
      }
    },

    // Set current dataset
    setCurrentDataset: (dataset: Dataset) => {
      set({ 
        currentDataset: dataset,
        filteredData: dataset.processedData,
        undoStack: [],
        redoStack: [],
        error: null,
      });
      get().applyFiltersAndTransformations();
    },

    // Update dataset
    updateDataset: (updates: Partial<Dataset>) => {
      const { currentDataset } = get();
      if (!currentDataset) return;

      const updatedDataset = { ...currentDataset, ...updates };
      set({ currentDataset: updatedDataset });
      get().applyFiltersAndTransformations();
    },

    // Load saved datasets list
    loadSavedDatasets: async () => {
      set({ isLoading: true, error: null });
      
      try {
        const datasets = await storageManager.listDatasets();
        console.log('Loaded saved datasets:', datasets.length);
        set({ savedDatasets: datasets });
      } catch (error) {
        console.error('Failed to load saved datasets:', error);
        set({ error: `Failed to load saved datasets: ${error}` });
      } finally {
        set({ isLoading: false });
      }
    },

    // Clear current dataset
    clearCurrentDataset: () => {
      set({
        currentDataset: null,
        filteredData: [],
        undoStack: [],
        redoStack: [],
        error: null,
      });
    },

    // Delete dataset
    deleteDataset: async (id: string) => {
      set({ isLoading: true, error: null });
      
      try {
        await storageManager.deleteDataset(id);
        console.log('Dataset deleted:', id);
        
        // Remove from saved datasets list
        const { savedDatasets, currentDataset } = get();
        set({ 
          savedDatasets: savedDatasets.filter(d => d.id !== id),
          // Clear current dataset if it was deleted
          currentDataset: currentDataset?.id === id ? null : currentDataset,
          filteredData: currentDataset?.id === id ? [] : get().filteredData
        });
      } catch (error) {
        console.error('Failed to delete dataset:', error);
        set({ error: `Failed to delete dataset: ${error}` });
      } finally {
        set({ isLoading: false });
      }
    },

    // Create new version
    createVersion: (name: string, description?: string) => {
      const { currentDataset } = get();
      if (!currentDataset) return;

      const currentVersion = currentDataset.versions.find((v: DatasetVersion) => v.id === currentDataset.currentVersion);
      if (!currentVersion) return;

      // Save current state to undo stack
      get().saveStateToHistory();

      const newVersion: DatasetVersion = {
        id: generateId(),
        timestamp: new Date(),
        name,
        description,
        columns: [...currentVersion.columns],
        rowCount: get().filteredData.length,
        filters: [...currentVersion.filters],
        transformations: [...currentVersion.transformations],
        checksum: calculateChecksum({
          columns: currentVersion.columns,
          filters: currentVersion.filters,
          transformations: currentVersion.transformations,
        }),
      };

      const updatedDataset = {
        ...currentDataset,
        currentVersion: newVersion.id,
        versions: [...currentDataset.versions, newVersion],
      };

      set({ currentDataset: updatedDataset });
    },

    // Restore version
    restoreVersion: (versionId: string) => {
      const { currentDataset } = get();
      if (!currentDataset) return;

      const version = currentDataset.versions.find((v:any) => v.id === versionId);
      if (!version) return;

      // Save current state to undo stack
      get().saveStateToHistory();

      const updatedDataset = {
        ...currentDataset,
        currentVersion: versionId,
      };

      set({ currentDataset: updatedDataset });
      get().applyFiltersAndTransformations();
    },

    // Add filter
    addFilter: (filter: Omit<Filter, 'id'>) => {
      const { currentDataset } = get();
      if (!currentDataset) return;

      get().saveStateToHistory();

      const newFilter: Filter = {
        ...filter,
        id: generateId(),
      };

      const currentVersion = currentDataset.versions.find((v:any) => v.id === currentDataset.currentVersion);
      if (!currentVersion) return;

      const updatedVersion = {
        ...currentVersion,
        filters: [...currentVersion.filters, newFilter],
      };

      const updatedDataset = {
        ...currentDataset,
        versions: currentDataset.versions.map((v:any) => 
          v.id === currentDataset.currentVersion ? updatedVersion : v
        ),
      };

      set({ currentDataset: updatedDataset });
      get().applyFiltersAndTransformations();
    },

    // Update filter
    updateFilter: (id: string, updates: Partial<Filter>) => {
      const { currentDataset } = get();
      if (!currentDataset) return;

      get().saveStateToHistory();

      const currentVersion = currentDataset.versions.find((v:any) => v.id === currentDataset.currentVersion);
      if (!currentVersion) return;

      const updatedVersion = {
        ...currentVersion,
        filters: currentVersion.filters.map((f:any) => 
          f.id === id ? { ...f, ...updates } : f
        ),
      };

      const updatedDataset = {
        ...currentDataset,
        versions: currentDataset.versions.map((v:any) => 
          v.id === currentDataset.currentVersion ? updatedVersion : v
        ),
      };

      set({ currentDataset: updatedDataset });
      get().applyFiltersAndTransformations();
    },

    // Remove filter
    removeFilter: (id: string) => {
      const { currentDataset } = get();
      if (!currentDataset) return;

      get().saveStateToHistory();

      const currentVersion = currentDataset.versions.find(v => v.id === currentDataset.currentVersion);
      if (!currentVersion) return;

      const updatedVersion = {
        ...currentVersion,
        filters: currentVersion.filters.filter(f => f.id !== id),
      };

      const updatedDataset = {
        ...currentDataset,
        versions: currentDataset.versions.map(v => 
          v.id === currentDataset.currentVersion ? updatedVersion : v
        ),
      };

      set({ currentDataset: updatedDataset });
      get().applyFiltersAndTransformations();
    },

    // Clear filters
    clearFilters: () => {
      const { currentDataset } = get();
      if (!currentDataset) return;

      get().saveStateToHistory();

      const currentVersion = currentDataset.versions.find(v => v.id === currentDataset.currentVersion);
      if (!currentVersion) return;

      const updatedVersion = {
        ...currentVersion,
        filters: [],
      };

      const updatedDataset = {
        ...currentDataset,
        versions: currentDataset.versions.map(v => 
          v.id === currentDataset.currentVersion ? updatedVersion : v
        ),
      };

      set({ currentDataset: updatedDataset });
      get().applyFiltersAndTransformations();
    },

    // Add transformation
    addTransformation: (transformation: Omit<Transformation, 'id'>) => {
      const { currentDataset } = get();
      if (!currentDataset) return;

      get().saveStateToHistory();

      const newTransformation: Transformation = {
        ...transformation,
        id: generateId(),
      };

      const currentVersion = currentDataset.versions.find(v => v.id === currentDataset.currentVersion);
      if (!currentVersion) return;

      const updatedVersion = {
        ...currentVersion,
        transformations: [...currentVersion.transformations, newTransformation],
      };

      const updatedDataset = {
        ...currentDataset,
        versions: currentDataset.versions.map(v => 
          v.id === currentDataset.currentVersion ? updatedVersion : v
        ),
      };

      set({ currentDataset: updatedDataset });
      get().applyFiltersAndTransformations();
    },

    // Update transformation
    updateTransformation: (id: string, updates: Partial<Transformation>) => {
      const { currentDataset } = get();
      if (!currentDataset) return;

      get().saveStateToHistory();

      const currentVersion = currentDataset.versions.find(v => v.id === currentDataset.currentVersion);
      if (!currentVersion) return;

      const updatedVersion = {
        ...currentVersion,
        transformations: currentVersion.transformations.map(t => 
          t.id === id ? { ...t, ...updates } : t
        ),
      };

      const updatedDataset = {
        ...currentDataset,
        versions: currentDataset.versions.map(v => 
          v.id === currentDataset.currentVersion ? updatedVersion : v
        ),
      };

      set({ currentDataset: updatedDataset });
      get().applyFiltersAndTransformations();
    },

    // Remove transformation
    removeTransformation: (id: string) => {
      const { currentDataset } = get();
      if (!currentDataset) return;

      get().saveStateToHistory();

      const currentVersion = currentDataset.versions.find(v => v.id === currentDataset.currentVersion);
      if (!currentVersion) return;

      const updatedVersion = {
        ...currentVersion,
        transformations: currentVersion.transformations.filter(t => t.id !== id),
      };

      const updatedDataset = {
        ...currentDataset,
        versions: currentDataset.versions.map(v => 
          v.id === currentDataset.currentVersion ? updatedVersion : v
        ),
      };

      set({ currentDataset: updatedDataset });
      get().applyFiltersAndTransformations();
    },

    // Clear transformations
    clearTransformations: () => {
      const { currentDataset } = get();
      if (!currentDataset) return;

      get().saveStateToHistory();

      const currentVersion = currentDataset.versions.find(v => v.id === currentDataset.currentVersion);
      if (!currentVersion) return;

      const updatedVersion = {
        ...currentVersion,
        transformations: [],
      };

      const updatedDataset = {
        ...currentDataset,
        versions: currentDataset.versions.map(v => 
          v.id === currentDataset.currentVersion ? updatedVersion : v
        ),
      };

      set({ currentDataset: updatedDataset });
      get().applyFiltersAndTransformations();
    },

    // Update column
    updateColumn: (id: string, updates: Partial<Column>) => {
      const { currentDataset } = get();
      if (!currentDataset) return;

      get().saveStateToHistory();

      const currentVersion = currentDataset.versions.find(v => v.id === currentDataset.currentVersion);
      if (!currentVersion) return;

      const updatedVersion = {
        ...currentVersion,
        columns: currentVersion.columns.map(c => 
          c.id === id ? { ...c, ...updates } : c
        ),
      };

      const updatedDataset = {
        ...currentDataset,
        versions: currentDataset.versions.map(v => 
          v.id === currentDataset.currentVersion ? updatedVersion : v
        ),
      };

      set({ currentDataset: updatedDataset });
      get().applyFiltersAndTransformations();
    },

    // History management
    saveStateToHistory: () => {
      const { currentDataset, undoStack } = get();
      if (!currentDataset) return;

      const state = JSON.stringify({
        currentVersion: currentDataset.currentVersion,
        versions: currentDataset.versions,
      });

      set({
        undoStack: [...undoStack, state],
        redoStack: [], // Clear redo stack on new action
      });
    },

    undo: () => {
      const { currentDataset, undoStack, redoStack } = get();
      if (!currentDataset || undoStack.length === 0) return;

      const currentState = JSON.stringify({
        currentVersion: currentDataset.currentVersion,
        versions: currentDataset.versions,
      });

      const previousState = undoStack[undoStack.length - 1];
      const parsedState = JSON.parse(previousState);

      const updatedDataset = {
        ...currentDataset,
        currentVersion: parsedState.currentVersion,
        versions: parsedState.versions,
      };

      set({
        currentDataset: updatedDataset,
        undoStack: undoStack.slice(0, -1),
        redoStack: [...redoStack, currentState],
      });

      get().applyFiltersAndTransformations();
    },

    redo: () => {
      const { currentDataset, undoStack, redoStack } = get();
      if (!currentDataset || redoStack.length === 0) return;

      const currentState = JSON.stringify({
        currentVersion: currentDataset.currentVersion,
        versions: currentDataset.versions,
      });

      const nextState = redoStack[redoStack.length - 1];
      const parsedState = JSON.parse(nextState);

      const updatedDataset = {
        ...currentDataset,
        currentVersion: parsedState.currentVersion,
        versions: parsedState.versions,
      };

      set({
        currentDataset: updatedDataset,
        undoStack: [...undoStack, currentState],
        redoStack: redoStack.slice(0, -1),
      });

      get().applyFiltersAndTransformations();
    },

    canUndo: () => get().undoStack.length > 0,
    canRedo: () => get().redoStack.length > 0,

    // Apply filters and transformations
    applyFiltersAndTransformations: () => {
      const { currentDataset } = get();
      if (!currentDataset) return;

      const currentVersion = currentDataset.versions.find(v => v.id === currentDataset.currentVersion);
      if (!currentVersion) return;

      let data = [...currentDataset.processedData];

      // Apply filters
      const enabledFilters = currentVersion.filters.filter(f => f.enabled);
      for (const filter of enabledFilters) {
        data = applyFilter(data, filter, currentVersion.columns);
      }

      // Apply transformations would go here
      // For now, we'll just set the filtered data
      set({ filteredData: data });
    },

    // Save to storage
    saveToStorage: async () => {
      const { currentDataset } = get();
      if (!currentDataset) {
        console.log('No current dataset to save');
        return;
      }

      console.log('Attempting to save dataset:', currentDataset.name);
      set({ isLoading: true, error: null });

      try {
        await storageManager.saveDataset(currentDataset);
        console.log('Dataset saved successfully');
        
        // Refresh the saved datasets list
        await get().loadSavedDatasets();
      } catch (error) {
        console.error('Failed to save dataset:', error);
        set({ error: `Failed to save dataset: ${error}` });
        throw error; // Re-throw so the UI can handle it
      } finally {
        set({ isLoading: false });
      }
    },

    // Utility setters
    setLoading: (loading: boolean) => set({ isLoading: loading }),
    setError: (error: string | null) => set({ error }),
  }))
);

// Helper function to apply a single filter
function applyFilter(data: Record<string, any>[], filter: Filter, columns: Column[]): Record<string, any>[] {
  return data.filter(row => {
    // Find the column to get the column name
    const column = columns.find(c => c.id === filter.columnId);
    if (!column) return true;
    
    // Use column name to access the row data
    const value = row[column.name];
    
    switch (filter.operator) {
      case 'equals':
        return value === filter.value;
      case 'not_equals':
        return value !== filter.value;
      case 'contains':
        return String(value).toLowerCase().includes(String(filter.value).toLowerCase());
      case 'not_contains':
        return !String(value).toLowerCase().includes(String(filter.value).toLowerCase());
      case 'starts_with':
        return String(value).toLowerCase().startsWith(String(filter.value).toLowerCase());
      case 'ends_with':
        return String(value).toLowerCase().endsWith(String(filter.value).toLowerCase());
      case 'greater_than':
        return Number(value) > Number(filter.value);
      case 'less_than':
        return Number(value) < Number(filter.value);
      case 'greater_equal':
        return Number(value) >= Number(filter.value);
      case 'less_equal':
        return Number(value) <= Number(filter.value);
      case 'is_null':
        return value === null || value === undefined || value === '';
      case 'is_not_null':
        return value !== null && value !== undefined && value !== '';
      case 'regex':
        try {
          const regex = new RegExp(String(filter.value), 'i');
          return regex.test(String(value));
        } catch {
          return false;
        }
      default:
        return true;
    }
  });
}