import { z } from 'zod'

// Core music metadata schema
export const TrackMetadataSchema = z.object({
  id: z.string(),
  title: z.string(),
  artist: z.string(),
  album: z.string(),
  genre: z.string().optional(),
  year: z.number().optional(),
  trackNumber: z.number().optional(),
  discNumber: z.number().optional(),
  duration: z.number(), // in seconds
  bitrate: z.number().optional(),
  fileSize: z.number(),
  filePath: z.string(),
  fileFormat: z.string(), // file extension/format (mp3, flac, etc.)
  fileHash: z.string(),
  dateAdded: z.date(),
  dateModified: z.date(),
  playCount: z.number().default(0),
  lastPlayed: z.date().optional(),
  rating: z.number().min(0).max(5).optional(),
  customTags: z.array(z.string()).default([]),
  mood: z.string().optional(),
  energy: z.number().min(0).max(1).optional(), // computed energy level
})

export type TrackMetadata = z.infer<typeof TrackMetadataSchema>

// Playlist schemas
export const PlaylistRuleSchema = z.object({
  field: z.enum(['genre', 'artist', 'album', 'year', 'rating', 'playCount', 'dateAdded', 'customTags', 'mood']),
  operator: z.enum(['equals', 'contains', 'startsWith', 'endsWith', 'greaterThan', 'lessThan', 'between', 'in']),
  value: z.union([z.string(), z.number(), z.array(z.union([z.string(), z.number()]))]),
})

export type PlaylistRule = z.infer<typeof PlaylistRuleSchema>

export const PlaylistSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  type: z.enum(['manual', 'smart']),
  rules: z.array(PlaylistRuleSchema).default([]),
  trackIds: z.array(z.string()).default([]),
  dateCreated: z.date(),
  dateModified: z.date(),
  sortBy: z.enum(['title', 'artist', 'album', 'dateAdded', 'playCount', 'rating', 'duration']).default('dateAdded'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
})

export type Playlist = z.infer<typeof PlaylistSchema>

// Listening history schema
export const ListeningEventSchema = z.object({
  id: z.string(),
  trackId: z.string(),
  timestamp: z.date(),
  duration: z.number(), // how long the track was played
  completed: z.boolean(), // whether the track was played to completion
  skipped: z.boolean(),
  source: z.enum(['library', 'playlist', 'search', 'similar']),
  sourceId: z.string().optional(), // playlist ID or search query
})

export type ListeningEvent = z.infer<typeof ListeningEventSchema>

// Duplicate detection schema
export const DuplicateGroupSchema = z.object({
  id: z.string(),
  trackIds: z.array(z.string()),
  similarityScore: z.number().min(0).max(1),
  duplicateType: z.enum(['exact', 'metadata', 'duration', 'fuzzy']),
  resolved: z.boolean().default(false),
  preferredTrackId: z.string().optional(),
})

export type DuplicateGroup = z.infer<typeof DuplicateGroupSchema>

// Analytics schemas
export const LibraryStatsSchema = z.object({
  totalTracks: z.number(),
  totalAlbums: z.number(),
  totalArtists: z.number(),
  totalDuration: z.number(),
  totalSize: z.number(),
  averageRating: z.number().optional(),
  mostPlayedGenre: z.string().optional(),
  recentlyAdded: z.number(),
})

export type LibraryStats = z.infer<typeof LibraryStatsSchema>

// UI state types
export interface ViewState {
  currentView: 'library' | 'playlists' | 'analytics' | 'duplicates' | 'settings'
  selectedTrackIds: string[]
  searchQuery: string
  filters: {
    genre?: string
    artist?: string
    album?: string
    year?: number
    rating?: number
    fileFormat?: string
    customTag?: string
    mood?: string
  }
  sortBy: keyof TrackMetadata
  sortOrder: 'asc' | 'desc'
}

// Import/indexing types
export interface ImportProgress {
  isImporting: boolean
  currentFile: string
  processedFiles: number
  totalFiles: number
  errors: string[]
}

// Similarity and clustering types
export interface SimilarityVector {
  trackId: string
  features: number[] // computed audio/metadata features
}

export interface TrackCluster {
  id: string
  name: string
  trackIds: string[]
  centroid: number[]
  coherence: number // how similar tracks in cluster are
}