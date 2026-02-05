import { TrackMetadata } from '@/lib/types/music'
import { parseBlob } from 'music-metadata-browser'

class MetadataService {
  // Extract metadata from audio file using music-metadata-browser
  async extractMetadata(file: File): Promise<Partial<TrackMetadata>> {
    try {
      // Use music-metadata-browser to parse the audio file
      const metadata = await parseBlob(file)
      
      return this.normalizeMetadata(metadata, file)
    } catch (error) {
      console.error('Failed to extract metadata from', file.name, ':', error)
      return await this.createFallbackMetadata(file)
    }
  }

  // Normalize and clean metadata from music-metadata-browser
  private async normalizeMetadata(metadata: any, file: File): Promise<Partial<TrackMetadata>> {
    const now = new Date()
    const fileExtension = file.name.split('.').pop()?.toLowerCase() || 'unknown'
    
    // Extract common metadata fields
    const common = metadata.common || {}
    const format = metadata.format || {}
    
    return {
      id: crypto.randomUUID(),
      title: this.normalizeString(common.title || this.extractTitleFromFilename(file.name)),
      artist: this.normalizeString(common.artist || common.albumartist || 'Unknown Artist'),
      album: this.normalizeString(common.album || 'Unknown Album'),
      genre: common.genre && common.genre.length > 0 ? this.normalizeString(common.genre[0]) : undefined,
      year: common.year || common.date ? parseInt(String(common.year || common.date)) : undefined,
      trackNumber: common.track?.no || undefined,
      discNumber: common.disk?.no || undefined,
      duration: format.duration ? Math.round(format.duration) : 0,
      bitrate: format.bitrate ? Math.round(format.bitrate / 1000) : undefined, // Convert to kbps
      fileSize: file.size,
      filePath: file.name,
      fileFormat: fileExtension,
      fileHash: await this.calculateFileHash(file),
      dateAdded: now,
      dateModified: new Date(file.lastModified),
      playCount: 0,
      customTags: [],
      // Additional metadata that might be available
      mood: common.mood || undefined,
    }
  }

  // Create fallback metadata when extraction fails
  private async createFallbackMetadata(file: File): Promise<Partial<TrackMetadata>> {
    const now = new Date()
    const fileExtension = file.name.split('.').pop()?.toLowerCase() || 'unknown'
    
    // Try to extract metadata from filename and path
    const pathMetadata = this.extractMetadataFromPath(file.name)
    
    return {
      id: crypto.randomUUID(),
      title: pathMetadata.title || this.extractTitleFromFilename(file.name),
      artist: pathMetadata.artist || 'Unknown Artist',
      album: pathMetadata.album || 'Unknown Album',
      genre: pathMetadata.genre,
      year: pathMetadata.year,
      duration: 0,
      fileSize: file.size,
      filePath: file.name,
      fileFormat: fileExtension,
      fileHash: await this.calculateFileHash(file),
      dateAdded: now,
      dateModified: new Date(file.lastModified),
      playCount: 0,
      customTags: [],
    }
  }

  // Normalize string values (trim, fix casing, etc.)
  private normalizeString(value: string): string {
    if (!value) return ''
    
    return value
      .trim()
      .replace(/\s+/g, ' ') // Normalize whitespace
      .replace(/^\w/, c => c.toUpperCase()) // Capitalize first letter
  }

  // Extract title from filename
  private extractTitleFromFilename(filename: string): string {
    // Remove extension
    let title = filename.replace(/\.[^/.]+$/, '')
    
    // Remove track numbers (e.g., "01 - Song Title" -> "Song Title")
    title = title.replace(/^\d+\s*[-.\s]\s*/, '')
    
    // If filename contains " - ", assume format is "Artist - Title"
    const parts = title.split(' - ')
    if (parts.length >= 2) {
      return parts[parts.length - 1].trim() // Take the last part as title
    }
    
    return title
  }

  // Extract metadata from file path structure
  extractMetadataFromPath(filePath: string): Partial<TrackMetadata> {
    const pathParts = filePath.split(/[/\\]/)
    const metadata: Partial<TrackMetadata> = {}
    const filename = pathParts[pathParts.length - 1]
    
    // Try to parse filename patterns
    // Pattern 1: "Artist - Title.ext"
    let match = filename.match(/^(.+?)\s*-\s*(.+?)\.[^.]+$/)
    if (match) {
      metadata.artist = this.normalizeString(match[1])
      metadata.title = this.normalizeString(match[2])
      return metadata
    }
    
    // Pattern 2: "Track# Artist - Title.ext"
    match = filename.match(/^\d+\s*[-.\s]\s*(.+?)\s*-\s*(.+?)\.[^.]+$/)
    if (match) {
      metadata.artist = this.normalizeString(match[1])
      metadata.title = this.normalizeString(match[2])
      return metadata
    }
    
    // Pattern 3: "Track# Title.ext"
    match = filename.match(/^\d+\s*[-.\s]\s*(.+?)\.[^.]+$/)
    if (match) {
      metadata.title = this.normalizeString(match[1])
      return metadata
    }
    
    // Common directory patterns:
    // Artist/Album/Track.ext or Genre/Artist/Album/Track.ext
    if (pathParts.length >= 3) {
      const albumDir = pathParts[pathParts.length - 2]
      const artistDir = pathParts[pathParts.length - 3]
      
      // Check if directory names look like metadata (not years or generic folders)
      if (!albumDir.match(/^\d{4}$/) && albumDir !== 'Unknown Album' && albumDir.length > 0) {
        metadata.album = this.normalizeString(albumDir)
      }
      
      if (!artistDir.match(/^\d{4}$/) && artistDir !== 'Unknown Artist' && artistDir.length > 0) {
        metadata.artist = this.normalizeString(artistDir)
      }
    }
    
    return metadata
  }

  // Calculate file hash for duplicate detection
  private async calculateFileHash(file: File): Promise<string> {
    try {
      // For performance, hash only the first 64KB of the file
      const chunkSize = 64 * 1024 // 64KB
      const chunk = file.slice(0, Math.min(chunkSize, file.size))
      const buffer = await chunk.arrayBuffer()
      const hashBuffer = await crypto.subtle.digest('SHA-256', buffer)
      const hashArray = Array.from(new Uint8Array(hashBuffer))
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
    } catch (error) {
      console.error('Failed to calculate file hash:', error)
      // Fallback: use file size, name, and modification time as pseudo-hash
      return `${file.size}-${file.name.length}-${file.lastModified}`
    }
  }

  // Batch process multiple files with progress tracking
  async extractMetadataFromFiles(
    files: File[],
    onProgress?: (processed: number, total: number, currentFile: string) => void
  ): Promise<Partial<TrackMetadata>[]> {
    const results: Partial<TrackMetadata>[] = []
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      
      if (onProgress) {
        onProgress(i, files.length, file.name)
      }
      
      try {
        const metadata = await this.extractMetadata(file)
        results.push(metadata)
      } catch (error) {
        console.error(`Failed to process ${file.name}:`, error)
        // Add fallback metadata for failed files
        results.push(await this.createFallbackMetadata(file))
      }
      
      // Add a small delay to prevent blocking the UI
      if (i % 10 === 0) {
        await new Promise(resolve => setTimeout(resolve, 1))
      }
    }
    
    if (onProgress) {
      onProgress(files.length, files.length, '')
    }
    
    return results
  }

  // Validate and clean existing metadata
  validateAndCleanMetadata(track: TrackMetadata): TrackMetadata {
    return {
      ...track,
      title: this.normalizeString(track.title || 'Unknown Title'),
      artist: this.normalizeString(track.artist || 'Unknown Artist'),
      album: this.normalizeString(track.album || 'Unknown Album'),
      genre: track.genre ? this.normalizeString(track.genre) : undefined,
      year: track.year && track.year > 1900 && track.year <= new Date().getFullYear() ? track.year : undefined,
      trackNumber: track.trackNumber && track.trackNumber > 0 ? track.trackNumber : undefined,
      discNumber: track.discNumber && track.discNumber > 0 ? track.discNumber : undefined,
      rating: track.rating && track.rating >= 0 && track.rating <= 5 ? track.rating : undefined,
      customTags: track.customTags.filter(tag => tag.trim().length > 0),
    }
  }

  // Merge metadata from multiple sources
  mergeMetadata(primary: Partial<TrackMetadata>, secondary: Partial<TrackMetadata>): Partial<TrackMetadata> {
    return {
      ...secondary,
      ...primary,
      // Special handling for arrays
      customTags: [
        ...(primary.customTags || []),
        ...(secondary.customTags || [])
      ].filter((tag, index, array) => array.indexOf(tag) === index), // Remove duplicates
    }
  }

  // Get supported audio file extensions
  getSupportedExtensions(): string[] {
    return ['.mp3', '.flac', '.wav', '.m4a', '.aac', '.ogg', '.wma', '.opus', '.webm']
  }

  // Check if file is supported audio format
  isSupportedAudioFile(file: File): boolean {
    const extension = '.' + file.name.split('.').pop()?.toLowerCase()
    return this.getSupportedExtensions().includes(extension)
  }

  // Get detailed format information
  async getDetailedFormat(file: File): Promise<any> {
    try {
      const metadata = await parseBlob(file)
      return {
        format: metadata.format,
        quality: metadata.quality,
        native: metadata.native,
      }
    } catch (error) {
      console.error('Failed to get detailed format:', error)
      return null
    }
  }
}

export const metadataService = new MetadataService()