'use client'

import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import { TrackMetadata, Playlist, ListeningEvent, DuplicateGroup, ViewState, ImportProgress, LibraryStats } from '@/lib/types/music'
import { dbManager } from '@/lib/db/indexed-db'
import { searchService } from '@/lib/services/search-service'
import { duplicateDetectionService } from '@/lib/services/duplicate-detection-service'
import { playlistService } from '@/lib/services/playlist-service'
import { analyticsService } from '@/lib/services/analytics-service'

interface MusicStoreState {
  // Core data
  tracks: TrackMetadata[]
  playlists: Playlist[]
  listeningEvents: ListeningEvent[]
  duplicateGroups: DuplicateGroup[]
  
  // UI state
  viewState: ViewState
  importProgress: ImportProgress
  libraryStats: LibraryStats | null
  
  // Loading states
  isInitialized: boolean
  isLoading: boolean
  
  // Modals and UI
  showImportModal: boolean
  selectedPlaylistId: string | null
  
  // Actions
  initialize: () => Promise<void>
  
  // Track operations
  addTracks: (tracks: TrackMetadata[]) => Promise<void>
  updateTrack: (track: TrackMetadata) => Promise<void>
  deleteTrack: (id: string) => Promise<void>
  
  // Playlist operations
  createPlaylist: (playlist: Omit<Playlist, 'id' | 'dateCreated' | 'dateModified'>) => Promise<void>
  updatePlaylist: (playlist: Playlist) => Promise<void>
  deletePlaylist: (id: string) => Promise<void>
  
  // Tag-based playlist management
  syncTagBasedPlaylists: () => Promise<void>
  createTagBasedPlaylist: (tag: string) => Promise<void>
  
  // Listening events
  recordListeningEvent: (event: Omit<ListeningEvent, 'id'>) => Promise<void>
  
  // Search and filtering
  searchTracks: (query: string) => TrackMetadata[]
  setFilters: (filters: Partial<ViewState['filters']>) => void
  setSorting: (sortBy: keyof TrackMetadata, sortOrder: 'asc' | 'desc') => void
  
  // UI actions
  setCurrentView: (view: ViewState['currentView']) => void
  setSelectedTracks: (trackIds: string[]) => void
  toggleImportModal: () => void
  setSelectedPlaylist: (playlistId: string | null) => void
  
  // Import operations
  startImport: () => void
  updateImportProgress: (progress: Partial<ImportProgress>) => void
  
  // Analytics
  refreshStats: () => Promise<void>
  
  // Duplicate detection
  detectDuplicates: () => Promise<void>
  resolveDuplicateGroup: (groupId: string, preferredTrackId: string) => Promise<void>
}

export const useMusicStore = create<MusicStoreState>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    tracks: [],
    playlists: [],
    listeningEvents: [],
    duplicateGroups: [],
    
    viewState: {
      currentView: 'library',
      selectedTrackIds: [],
      searchQuery: '',
      filters: {},
      sortBy: 'dateAdded',
      sortOrder: 'desc',
    },
    
    importProgress: {
      isImporting: false,
      currentFile: '',
      processedFiles: 0,
      totalFiles: 0,
      errors: [],
    },
    
    libraryStats: null,
    isInitialized: false,
    isLoading: false,
    showImportModal: false,
    selectedPlaylistId: null,
    
    // Initialize the store
    initialize: async () => {
      set({ isLoading: true })
      
      try {
        await dbManager.initialize()
        
        // Load all data from IndexedDB
        const [tracks, playlists, duplicateGroups] = await Promise.all([
          dbManager.getAllTracks(),
          dbManager.getAllPlaylists(),
          dbManager.getAllDuplicateGroups(),
        ])
        
        // Initialize search service
        searchService.initialize(tracks)
        
        set({
          tracks,
          playlists,
          duplicateGroups,
          isInitialized: true,
          isLoading: false,
        })
        
        // Refresh stats
        get().refreshStats()
        
      } catch (error) {
        console.error('Failed to initialize music store:', error)
        set({ isLoading: false })
      }
    },
    
    // Track operations
    addTracks: async (newTracks) => {
      const { tracks } = get()
      
      try {
        // Add tracks to database
        await Promise.all(newTracks.map(track => dbManager.addTrack(track)))
        
        // Update store
        const updatedTracks = [...tracks, ...newTracks]
        set({ tracks: updatedTracks })
        
        // Update search index
        searchService.addTracks(newTracks)
        
        // Sync tag-based playlists for new tracks with tags
        const hasTaggedTracks = newTracks.some(track => track.customTags.length > 0)
        if (hasTaggedTracks) {
          get().syncTagBasedPlaylists()
        }
        
        // Refresh stats
        get().refreshStats()
        
      } catch (error) {
        console.error('Failed to add tracks:', error)
        throw error
      }
    },
    
    updateTrack: async (updatedTrack) => {
      const { tracks } = get()
      
      try {
        await dbManager.updateTrack(updatedTrack)
        
        const updatedTracks = tracks.map(track => 
          track.id === updatedTrack.id ? updatedTrack : track
        )
        set({ tracks: updatedTracks })
        
        // Update search index
        searchService.updateTrack(updatedTrack)
        
        // Sync tag-based playlists when track tags change
        get().syncTagBasedPlaylists()
        
      } catch (error) {
        console.error('Failed to update track:', error)
        throw error
      }
    },
    
    deleteTrack: async (id) => {
      const { tracks, playlists } = get()
      
      try {
        await dbManager.deleteTrack(id)
        
        // Remove from tracks
        const updatedTracks = tracks.filter(track => track.id !== id)
        
        // Remove from playlists
        const updatedPlaylists = playlists.map(playlist => ({
          ...playlist,
          trackIds: playlist.trackIds.filter(trackId => trackId !== id)
        }))
        
        set({ tracks: updatedTracks, playlists: updatedPlaylists })
        
        // Update search index
        searchService.removeTrack(id)
        
        // Update playlists in database
        await Promise.all(
          updatedPlaylists
            .filter(playlist => playlist.trackIds.length !== playlists.find(p => p.id === playlist.id)?.trackIds.length)
            .map(playlist => dbManager.updatePlaylist(playlist))
        )
        
        get().refreshStats()
        
      } catch (error) {
        console.error('Failed to delete track:', error)
        throw error
      }
    },
    
    // Playlist operations
    createPlaylist: async (playlistData) => {
      const { playlists } = get()
      
      const newPlaylist: Playlist = {
        ...playlistData,
        id: crypto.randomUUID(),
        dateCreated: new Date(),
        dateModified: new Date(),
      }
      
      try {
        await dbManager.addPlaylist(newPlaylist)
        set({ playlists: [...playlists, newPlaylist] })
      } catch (error) {
        console.error('Failed to create playlist:', error)
        throw error
      }
    },
    
    updatePlaylist: async (updatedPlaylist) => {
      const { playlists } = get()
      
      const playlistWithUpdatedDate = {
        ...updatedPlaylist,
        dateModified: new Date(),
      }
      
      try {
        await dbManager.updatePlaylist(playlistWithUpdatedDate)
        
        const updatedPlaylists = playlists.map(playlist =>
          playlist.id === updatedPlaylist.id ? playlistWithUpdatedDate : playlist
        )
        set({ playlists: updatedPlaylists })
      } catch (error) {
        console.error('Failed to update playlist:', error)
        throw error
      }
    },
    
    deletePlaylist: async (id) => {
      const { playlists } = get()
      
      try {
        await dbManager.deletePlaylist(id)
        set({ playlists: playlists.filter(playlist => playlist.id !== id) })
      } catch (error) {
        console.error('Failed to delete playlist:', error)
        throw error
      }
    },
    
    // Tag-based playlist management
    syncTagBasedPlaylists: async () => {
      const { tracks, playlists } = get()
      
      try {
        // Create or update tag-based playlists
        const tagBasedPlaylists = await playlistService.createTagBasedPlaylists(tracks, playlists)
        
        // Update existing playlists or create new ones
        for (const playlist of tagBasedPlaylists) {
          const existingIndex = playlists.findIndex(p => p.id === playlist.id)
          if (existingIndex >= 0) {
            // Update existing playlist
            await dbManager.updatePlaylist(playlist)
          } else {
            // Create new playlist
            await dbManager.addPlaylist(playlist)
          }
        }
        
        // Clean up orphaned tag playlists
        const orphanedIds = playlistService.cleanupOrphanedTagPlaylists(tracks, playlists)
        for (const id of orphanedIds) {
          await dbManager.deletePlaylist(id)
        }
        
        // Update store with all playlists
        const updatedPlaylists = await dbManager.getAllPlaylists()
        set({ playlists: updatedPlaylists })
        
      } catch (error) {
        console.error('Failed to sync tag-based playlists:', error)
      }
    },
    
    createTagBasedPlaylist: async (tag: string) => {
      const { tracks } = get()
      
      try {
        const tracksWithTag = tracks.filter(track => track.customTags.includes(tag))
        
        const newPlaylist: Playlist = {
          id: crypto.randomUUID(),
          name: `🏷️ ${tag}`,
          description: `Automatically generated playlist for tracks tagged with "${tag}"`,
          type: 'smart',
          rules: [{
            field: 'customTags',
            operator: 'contains',
            value: tag
          }],
          trackIds: tracksWithTag.map(track => track.id),
          dateCreated: new Date(),
          dateModified: new Date(),
          sortBy: 'dateAdded',
          sortOrder: 'desc'
        }
        
        await get().createPlaylist(newPlaylist)
        
      } catch (error) {
        console.error('Failed to create tag-based playlist:', error)
        throw error
      }
    },
    
    // Listening events
    recordListeningEvent: async (eventData) => {
      const event: ListeningEvent = {
        ...eventData,
        id: crypto.randomUUID(),
      }
      
      try {
        await dbManager.addListeningEvent(event)
        
        // Update track play count
        const { tracks } = get()
        const track = tracks.find(t => t.id === event.trackId)
        if (track) {
          const updatedTrack = {
            ...track,
            playCount: track.playCount + 1,
            lastPlayed: event.timestamp,
          }
          get().updateTrack(updatedTrack)
        }
        
      } catch (error) {
        console.error('Failed to record listening event:', error)
      }
    },
    
    // Search and filtering
    searchTracks: (query) => {
      const { tracks, viewState } = get()
      
      if (!query.trim()) {
        return tracks
      }
      
      return searchService.search(query, viewState.filters)
    },
    
    setFilters: (filters) => {
      set(state => ({
        viewState: {
          ...state.viewState,
          filters: { ...state.viewState.filters, ...filters }
        }
      }))
    },
    
    setSorting: (sortBy, sortOrder) => {
      set(state => ({
        viewState: {
          ...state.viewState,
          sortBy,
          sortOrder,
        }
      }))
    },
    
    // UI actions
    setCurrentView: (currentView) => {
      set(state => ({
        viewState: { ...state.viewState, currentView }
      }))
    },
    
    setSelectedTracks: (selectedTrackIds) => {
      set(state => ({
        viewState: { ...state.viewState, selectedTrackIds }
      }))
    },
    
    toggleImportModal: () => {
      set(state => ({ showImportModal: !state.showImportModal }))
    },
    
    setSelectedPlaylist: (selectedPlaylistId) => {
      set({ selectedPlaylistId })
    },
    
    // Import operations
    startImport: () => {
      set({
        importProgress: {
          isImporting: true,
          currentFile: '',
          processedFiles: 0,
          totalFiles: 0,
          errors: [],
        }
      })
    },
    
    updateImportProgress: (progress) => {
      set(state => ({
        importProgress: { ...state.importProgress, ...progress }
      }))
    },
    
    // Analytics
    refreshStats: async () => {
      const { tracks } = get()
      const stats = analyticsService.calculateLibraryStats(tracks)
      set({ libraryStats: stats })
    },
    
    // Duplicate detection
    detectDuplicates: async () => {
      const { tracks } = get()
      
      try {
        const duplicateGroups = await duplicateDetectionService.detectDuplicates(tracks)
        
        // Save to database
        await Promise.all(duplicateGroups.map(group => dbManager.addDuplicateGroup(group)))
        
        set({ duplicateGroups })
      } catch (error) {
        console.error('Failed to detect duplicates:', error)
      }
    },
    
    resolveDuplicateGroup: async (groupId, preferredTrackId) => {
      const { duplicateGroups } = get()
      
      const group = duplicateGroups.find(g => g.id === groupId)
      if (!group) return
      
      const resolvedGroup = {
        ...group,
        resolved: true,
        preferredTrackId,
      }
      
      try {
        await dbManager.updateDuplicateGroup(resolvedGroup)
        
        const updatedGroups = duplicateGroups.map(g =>
          g.id === groupId ? resolvedGroup : g
        )
        set({ duplicateGroups: updatedGroups })
      } catch (error) {
        console.error('Failed to resolve duplicate group:', error)
      }
    },
  }))
)