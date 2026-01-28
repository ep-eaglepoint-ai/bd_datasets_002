import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { StorageSnapshot, InspectionLog, ComparisonResult, PageHeatmap } from '@/types/storage'

interface StorageState {
  snapshots: StorageSnapshot[]
  currentSnapshot: StorageSnapshot | null
  selectedPage: number | null
  selectedTuple: number | null
  inspectionLogs: InspectionLog[]
  heatmaps: PageHeatmap[]
  comparisons: ComparisonResult[]
  isLoading: boolean
  error: string | null
  
  // Actions
  addSnapshot: (snapshot: StorageSnapshot) => void
  removeSnapshot: (id: string) => void
  setCurrentSnapshot: (id: string) => void
  setSelectedPage: (pageNumber: number | null) => void
  setSelectedTuple: (tupleNumber: number | null) => void
  addInspectionLog: (log: InspectionLog) => void
  addHeatmap: (heatmap: PageHeatmap) => void
  addComparison: (comparison: ComparisonResult) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  clearError: () => void
  clearAll: () => void
}

export const useStorageStore = create<StorageState>()(
  persist(
    (set, get) => ({
      snapshots: [],
      currentSnapshot: null,
      selectedPage: null,
      selectedTuple: null,
      inspectionLogs: [],
      heatmaps: [],
      comparisons: [],
      isLoading: false,
      error: null,

      addSnapshot: (snapshot) => set((state) => ({
        snapshots: [...state.snapshots, snapshot],
        currentSnapshot: state.currentSnapshot || snapshot,
        error: null
      })),

      removeSnapshot: (id) => set((state) => {
        const newSnapshots = state.snapshots.filter(s => s.id !== id)
        const newCurrent = state.currentSnapshot?.id === id 
          ? (newSnapshots.length > 0 ? newSnapshots[0] : null)
          : state.currentSnapshot
        
        return {
          snapshots: newSnapshots,
          currentSnapshot: newCurrent
        }
      }),

      setCurrentSnapshot: (id) => set((state) => ({
        currentSnapshot: state.snapshots.find(s => s.id === id) || null,
        selectedPage: null,
        selectedTuple: null
      })),

      setSelectedPage: (pageNumber) => set({ selectedPage: pageNumber, selectedTuple: null }),

      setSelectedTuple: (tupleNumber) => set({ selectedTuple: tupleNumber }),

      addInspectionLog: (log) => set((state) => ({
        inspectionLogs: [...state.inspectionLogs, log]
      })),

      addHeatmap: (heatmap) => set((state) => ({
        heatmaps: [...state.heatmaps, heatmap]
      })),

      addComparison: (comparison) => set((state) => ({
        comparisons: [...state.comparisons, comparison]
      })),

      setLoading: (loading) => set({ isLoading: loading }),

      setError: (error) => set({ error, isLoading: false }),

      clearError: () => set({ error: null }),

      clearAll: () => set({
        snapshots: [],
        currentSnapshot: null,
        selectedPage: null,
        selectedTuple: null,
        inspectionLogs: [],
        heatmaps: [],
        comparisons: [],
        isLoading: false,
        error: null
      })
    }),
    {
      name: 'db-storage-explorer-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        snapshots: state.snapshots,
        inspectionLogs: state.inspectionLogs,
        heatmaps: state.heatmaps,
        comparisons: state.comparisons
      })
    }
  )
)
