import { TrackMetadata, Playlist, ListeningEvent, DuplicateGroup } from '@/lib/types/music'

const DB_NAME = 'MusicLibraryDB'
const DB_VERSION = 1

export interface MusicDatabase extends IDBDatabase {
  // Type-safe database interface
}

class IndexedDBManager {
  private db: IDBDatabase | null = null
  private initPromise: Promise<void> | null = null

  async initialize(): Promise<void> {
    if (this.initPromise) {
      return this.initPromise
    }

    this.initPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        this.db = request.result
        resolve()
      }

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result

        // Tracks store
        if (!db.objectStoreNames.contains('tracks')) {
          const tracksStore = db.createObjectStore('tracks', { keyPath: 'id' })
          tracksStore.createIndex('artist', 'artist', { unique: false })
          tracksStore.createIndex('album', 'album', { unique: false })
          tracksStore.createIndex('genre', 'genre', { unique: false })
          tracksStore.createIndex('year', 'year', { unique: false })
          tracksStore.createIndex('fileHash', 'fileHash', { unique: false })
          tracksStore.createIndex('dateAdded', 'dateAdded', { unique: false })
          tracksStore.createIndex('playCount', 'playCount', { unique: false })
        }

        // Playlists store
        if (!db.objectStoreNames.contains('playlists')) {
          const playlistsStore = db.createObjectStore('playlists', { keyPath: 'id' })
          playlistsStore.createIndex('type', 'type', { unique: false })
          playlistsStore.createIndex('dateCreated', 'dateCreated', { unique: false })
        }

        // Listening events store
        if (!db.objectStoreNames.contains('listeningEvents')) {
          const eventsStore = db.createObjectStore('listeningEvents', { keyPath: 'id' })
          eventsStore.createIndex('trackId', 'trackId', { unique: false })
          eventsStore.createIndex('timestamp', 'timestamp', { unique: false })
          eventsStore.createIndex('source', 'source', { unique: false })
        }

        // Duplicate groups store
        if (!db.objectStoreNames.contains('duplicateGroups')) {
          const duplicatesStore = db.createObjectStore('duplicateGroups', { keyPath: 'id' })
          duplicatesStore.createIndex('resolved', 'resolved', { unique: false })
          duplicatesStore.createIndex('duplicateType', 'duplicateType', { unique: false })
        }

        // Metadata cache store for search optimization
        if (!db.objectStoreNames.contains('searchCache')) {
          db.createObjectStore('searchCache', { keyPath: 'key' })
        }
      }
    })

    return this.initPromise
  }

  private ensureDB(): IDBDatabase {
    if (!this.db) {
      throw new Error('Database not initialized')
    }
    return this.db
  }

  // Tracks operations
  async addTrack(track: TrackMetadata): Promise<void> {
    const db = this.ensureDB()
    const transaction = db.transaction(['tracks'], 'readwrite')
    const store = transaction.objectStore('tracks')
    
    await new Promise<void>((resolve, reject) => {
      const request = store.add(track)
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  async updateTrack(track: TrackMetadata): Promise<void> {
    const db = this.ensureDB()
    const transaction = db.transaction(['tracks'], 'readwrite')
    const store = transaction.objectStore('tracks')
    
    await new Promise<void>((resolve, reject) => {
      const request = store.put(track)
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  async getTrack(id: string): Promise<TrackMetadata | null> {
    const db = this.ensureDB()
    const transaction = db.transaction(['tracks'], 'readonly')
    const store = transaction.objectStore('tracks')
    
    return new Promise((resolve, reject) => {
      const request = store.get(id)
      request.onsuccess = () => resolve(request.result || null)
      request.onerror = () => reject(request.error)
    })
  }

  async getAllTracks(): Promise<TrackMetadata[]> {
    const db = this.ensureDB()
    const transaction = db.transaction(['tracks'], 'readonly')
    const store = transaction.objectStore('tracks')
    
    return new Promise((resolve, reject) => {
      const request = store.getAll()
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  }

  async getTracksByIndex(indexName: string, value: any): Promise<TrackMetadata[]> {
    const db = this.ensureDB()
    const transaction = db.transaction(['tracks'], 'readonly')
    const store = transaction.objectStore('tracks')
    const index = store.index(indexName)
    
    return new Promise((resolve, reject) => {
      const request = index.getAll(value)
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  }

  async deleteTrack(id: string): Promise<void> {
    const db = this.ensureDB()
    const transaction = db.transaction(['tracks'], 'readwrite')
    const store = transaction.objectStore('tracks')
    
    await new Promise<void>((resolve, reject) => {
      const request = store.delete(id)
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  // Playlists operations
  async addPlaylist(playlist: Playlist): Promise<void> {
    const db = this.ensureDB()
    const transaction = db.transaction(['playlists'], 'readwrite')
    const store = transaction.objectStore('playlists')
    
    await new Promise<void>((resolve, reject) => {
      const request = store.add(playlist)
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  async updatePlaylist(playlist: Playlist): Promise<void> {
    const db = this.ensureDB()
    const transaction = db.transaction(['playlists'], 'readwrite')
    const store = transaction.objectStore('playlists')
    
    await new Promise<void>((resolve, reject) => {
      const request = store.put(playlist)
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  async getAllPlaylists(): Promise<Playlist[]> {
    const db = this.ensureDB()
    const transaction = db.transaction(['playlists'], 'readonly')
    const store = transaction.objectStore('playlists')
    
    return new Promise((resolve, reject) => {
      const request = store.getAll()
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  }

  async deletePlaylist(id: string): Promise<void> {
    const db = this.ensureDB()
    const transaction = db.transaction(['playlists'], 'readwrite')
    const store = transaction.objectStore('playlists')
    
    await new Promise<void>((resolve, reject) => {
      const request = store.delete(id)
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  // Listening events operations
  async addListeningEvent(event: ListeningEvent): Promise<void> {
    const db = this.ensureDB()
    const transaction = db.transaction(['listeningEvents'], 'readwrite')
    const store = transaction.objectStore('listeningEvents')
    
    await new Promise<void>((resolve, reject) => {
      const request = store.add(event)
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  async getListeningEvents(trackId?: string, limit?: number): Promise<ListeningEvent[]> {
    const db = this.ensureDB()
    const transaction = db.transaction(['listeningEvents'], 'readonly')
    const store = transaction.objectStore('listeningEvents')
    
    return new Promise((resolve, reject) => {
      let request: IDBRequest
      
      if (trackId) {
        const index = store.index('trackId')
        request = index.getAll(trackId)
      } else {
        request = store.getAll()
      }
      
      request.onsuccess = () => {
        let result = request.result
        if (limit) {
          result = result.slice(-limit) // Get most recent events
        }
        resolve(result)
      }
      request.onerror = () => reject(request.error)
    })
  }

  // Duplicate groups operations
  async addDuplicateGroup(group: DuplicateGroup): Promise<void> {
    const db = this.ensureDB()
    const transaction = db.transaction(['duplicateGroups'], 'readwrite')
    const store = transaction.objectStore('duplicateGroups')
    
    await new Promise<void>((resolve, reject) => {
      const request = store.add(group)
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  async updateDuplicateGroup(group: DuplicateGroup): Promise<void> {
    const db = this.ensureDB()
    const transaction = db.transaction(['duplicateGroups'], 'readwrite')
    const store = transaction.objectStore('duplicateGroups')
    
    await new Promise<void>((resolve, reject) => {
      const request = store.put(group)
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  async getAllDuplicateGroups(): Promise<DuplicateGroup[]> {
    const db = this.ensureDB()
    const transaction = db.transaction(['duplicateGroups'], 'readonly')
    const store = transaction.objectStore('duplicateGroups')
    
    return new Promise((resolve, reject) => {
      const request = store.getAll()
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  }

  // Cache operations for search optimization
  async setCache(key: string, value: any): Promise<void> {
    const db = this.ensureDB()
    const transaction = db.transaction(['searchCache'], 'readwrite')
    const store = transaction.objectStore('searchCache')
    
    await new Promise<void>((resolve, reject) => {
      const request = store.put({ key, value, timestamp: Date.now() })
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  async getCache(key: string): Promise<any> {
    const db = this.ensureDB()
    const transaction = db.transaction(['searchCache'], 'readonly')
    const store = transaction.objectStore('searchCache')
    
    return new Promise((resolve, reject) => {
      const request = store.get(key)
      request.onsuccess = () => {
        const result = request.result
        if (result && Date.now() - result.timestamp < 300000) { // 5 minute cache
          resolve(result.value)
        } else {
          resolve(null)
        }
      }
      request.onerror = () => reject(request.error)
    })
  }
}

export const dbManager = new IndexedDBManager()