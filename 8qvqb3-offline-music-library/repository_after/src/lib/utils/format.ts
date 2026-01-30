// Format duration in seconds to MM:SS or HH:MM:SS
export function formatDuration(seconds: number): string {
  if (seconds < 0) return '0:00'
  
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const remainingSeconds = Math.floor(seconds % 60)
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`
  }
  
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
}

// Format file size in bytes to human readable format
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

// Format bitrate
export function formatBitrate(bitrate?: number): string {
  if (!bitrate) return 'Unknown'
  return `${bitrate} kbps`
}

// Format play count
export function formatPlayCount(count: number): string {
  if (count === 0) return 'Never played'
  if (count === 1) return '1 play'
  if (count < 1000) return `${count} plays`
  if (count < 1000000) return `${(count / 1000).toFixed(1)}K plays`
  return `${(count / 1000000).toFixed(1)}M plays`
}

// Format date relative to now
export function formatRelativeDate(date: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  
  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays} days ago`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`
  return `${Math.floor(diffDays / 365)} years ago`
}

// Format percentage
export function formatPercentage(value: number, decimals = 1): string {
  return `${value.toFixed(decimals)}%`
}

// Format rating as stars
export function formatRating(rating?: number): string {
  if (!rating) return '☆☆☆☆☆'
  
  const fullStars = Math.floor(rating)
  const hasHalfStar = rating % 1 >= 0.5
  const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0)
  
  return '★'.repeat(fullStars) + 
         (hasHalfStar ? '☆' : '') + 
         '☆'.repeat(emptyStars)
}

// Truncate text with ellipsis
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.substring(0, maxLength - 3) + '...'
}

// Format track number with leading zero
export function formatTrackNumber(trackNumber?: number, totalTracks?: number): string {
  if (!trackNumber) return ''
  
  const digits = totalTracks ? totalTracks.toString().length : 2
  return trackNumber.toString().padStart(digits, '0')
}

// Format disc number
export function formatDiscNumber(discNumber?: number): string {
  if (!discNumber) return ''
  return `Disc ${discNumber}`
}

// Format file format
export function formatFileFormat(format?: string): string {
  if (!format) return 'Unknown'
  return format.toUpperCase()
}

// Format year range
export function formatYearRange(startYear?: number, endYear?: number): string {
  if (!startYear && !endYear) return ''
  if (!endYear || startYear === endYear) return startYear?.toString() || ''
  return `${startYear}-${endYear}`
}

// Format time of day
export function formatTimeOfDay(hour: number): string {
  if (hour === 0) return '12 AM'
  if (hour < 12) return `${hour} AM`
  if (hour === 12) return '12 PM'
  return `${hour - 12} PM`
}

// Format large numbers with commas
export function formatNumber(num: number): string {
  return num.toLocaleString()
}

// Format similarity score as percentage
export function formatSimilarity(score: number): string {
  return `${Math.round(score * 100)}%`
}