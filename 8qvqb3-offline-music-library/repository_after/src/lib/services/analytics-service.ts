import { TrackMetadata, ListeningEvent, LibraryStats } from '@/lib/types/music'
import { format, startOfDay, startOfWeek, startOfMonth, subDays, subWeeks, subMonths } from 'date-fns'

export interface GenreDistribution {
  genre: string
  count: number
  percentage: number
  totalDuration: number
}

export interface ArtistStats {
  artist: string
  trackCount: number
  totalPlayCount: number
  totalDuration: number
  averageRating: number
}

export interface ListeningPattern {
  hour: number
  playCount: number
  averageDuration: number
}

export interface LibraryGrowth {
  date: string
  totalTracks: number
  tracksAdded: number
}

export interface PlaybackStats {
  totalPlayTime: number
  averageSessionLength: number
  skipRate: number
  completionRate: number
  mostPlayedHour: number
}

class AnalyticsService {
  // Calculate basic library statistics
  calculateLibraryStats(tracks: TrackMetadata[]): LibraryStats {
    if (tracks.length === 0) {
      return {
        totalTracks: 0,
        totalAlbums: 0,
        totalArtists: 0,
        totalDuration: 0,
        totalSize: 0,
        averageRating: undefined,
        mostPlayedGenre: undefined,
        recentlyAdded: 0,
      }
    }

    const uniqueAlbums = new Set(tracks.map(t => `${t.artist}-${t.album}`))
    const uniqueArtists = new Set(tracks.map(t => t.artist))
    const totalDuration = tracks.reduce((sum, t) => sum + t.duration, 0)
    const totalSize = tracks.reduce((sum, t) => sum + t.fileSize, 0)

    // Calculate average rating
    const ratedTracks = tracks.filter(t => t.rating && t.rating > 0)
    const averageRating = ratedTracks.length > 0 
      ? ratedTracks.reduce((sum, t) => sum + (t.rating || 0), 0) / ratedTracks.length
      : undefined

    // Find most played genre
    const genrePlayCounts = new Map<string, number>()
    tracks.forEach(track => {
      if (track.genre) {
        genrePlayCounts.set(track.genre, (genrePlayCounts.get(track.genre) || 0) + track.playCount)
      }
    })

    const mostPlayedGenre = genrePlayCounts.size > 0
      ? Array.from(genrePlayCounts.entries()).reduce((a, b) => a[1] > b[1] ? a : b)[0]
      : undefined

    // Recently added (last 7 days)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    const recentlyAdded = tracks.filter(t => t.dateAdded > sevenDaysAgo).length

    return {
      totalTracks: tracks.length,
      totalAlbums: uniqueAlbums.size,
      totalArtists: uniqueArtists.size,
      totalDuration,
      totalSize,
      averageRating,
      mostPlayedGenre,
      recentlyAdded,
    }
  }

  // Calculate genre distribution
  calculateGenreDistribution(tracks: TrackMetadata[]): GenreDistribution[] {
    const genreStats = new Map<string, { count: number; totalDuration: number }>()

    tracks.forEach(track => {
      const genre = track.genre || 'Unknown'
      const existing = genreStats.get(genre) || { count: 0, totalDuration: 0 }
      genreStats.set(genre, {
        count: existing.count + 1,
        totalDuration: existing.totalDuration + track.duration,
      })
    })

    const totalTracks = tracks.length

    return Array.from(genreStats.entries())
      .map(([genre, stats]) => ({
        genre,
        count: stats.count,
        percentage: (stats.count / totalTracks) * 100,
        totalDuration: stats.totalDuration,
      }))
      .sort((a, b) => b.count - a.count)
  }

  // Calculate artist statistics
  calculateArtistStats(tracks: TrackMetadata[]): ArtistStats[] {
    const artistStats = new Map<string, {
      trackCount: number
      totalPlayCount: number
      totalDuration: number
      totalRating: number
      ratedTracks: number
    }>()

    tracks.forEach(track => {
      const existing = artistStats.get(track.artist) || {
        trackCount: 0,
        totalPlayCount: 0,
        totalDuration: 0,
        totalRating: 0,
        ratedTracks: 0,
      }

      artistStats.set(track.artist, {
        trackCount: existing.trackCount + 1,
        totalPlayCount: existing.totalPlayCount + track.playCount,
        totalDuration: existing.totalDuration + track.duration,
        totalRating: existing.totalRating + (track.rating || 0),
        ratedTracks: existing.ratedTracks + (track.rating ? 1 : 0),
      })
    })

    return Array.from(artistStats.entries())
      .map(([artist, stats]) => ({
        artist,
        trackCount: stats.trackCount,
        totalPlayCount: stats.totalPlayCount,
        totalDuration: stats.totalDuration,
        averageRating: stats.ratedTracks > 0 ? stats.totalRating / stats.ratedTracks : 0,
      }))
      .sort((a, b) => b.totalPlayCount - a.totalPlayCount)
  }

  // Analyze listening patterns by hour
  analyzeListeningPatterns(events: ListeningEvent[]): ListeningPattern[] {
    const hourlyStats = new Map<number, { playCount: number; totalDuration: number }>()

    // Initialize all hours
    for (let hour = 0; hour < 24; hour++) {
      hourlyStats.set(hour, { playCount: 0, totalDuration: 0 })
    }

    events.forEach(event => {
      const hour = event.timestamp.getHours()
      const existing = hourlyStats.get(hour)!
      hourlyStats.set(hour, {
        playCount: existing.playCount + 1,
        totalDuration: existing.totalDuration + event.duration,
      })
    })

    return Array.from(hourlyStats.entries())
      .map(([hour, stats]) => ({
        hour,
        playCount: stats.playCount,
        averageDuration: stats.playCount > 0 ? stats.totalDuration / stats.playCount : 0,
      }))
  }

  // Calculate library growth over time
  calculateLibraryGrowth(tracks: TrackMetadata[], days = 30): LibraryGrowth[] {
    const growth: LibraryGrowth[] = []
    const sortedTracks = [...tracks].sort((a, b) => a.dateAdded.getTime() - b.dateAdded.getTime())

    for (let i = days - 1; i >= 0; i--) {
      const date = subDays(new Date(), i)
      const dayStart = startOfDay(date)
      const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000)

      const totalTracks = sortedTracks.filter(t => t.dateAdded < dayEnd).length
      const tracksAdded = sortedTracks.filter(t => 
        t.dateAdded >= dayStart && t.dateAdded < dayEnd
      ).length

      growth.push({
        date: format(date, 'yyyy-MM-dd'),
        totalTracks,
        tracksAdded,
      })
    }

    return growth
  }

  // Calculate playback statistics
  calculatePlaybackStats(events: ListeningEvent[]): PlaybackStats {
    if (events.length === 0) {
      return {
        totalPlayTime: 0,
        averageSessionLength: 0,
        skipRate: 0,
        completionRate: 0,
        mostPlayedHour: 0,
      }
    }

    const totalPlayTime = events.reduce((sum, event) => sum + event.duration, 0)
    const completedEvents = events.filter(event => event.completed)
    const skippedEvents = events.filter(event => event.skipped)

    const completionRate = (completedEvents.length / events.length) * 100
    const skipRate = (skippedEvents.length / events.length) * 100

    // Calculate average session length (group events by proximity)
    const sessions = this.groupEventsIntoSessions(events)
    const averageSessionLength = sessions.length > 0
      ? sessions.reduce((sum, session) => sum + session.duration, 0) / sessions.length
      : 0

    // Find most played hour
    const hourlyPlayCounts = new Map<number, number>()
    events.forEach(event => {
      const hour = event.timestamp.getHours()
      hourlyPlayCounts.set(hour, (hourlyPlayCounts.get(hour) || 0) + 1)
    })

    const mostPlayedHour = hourlyPlayCounts.size > 0
      ? Array.from(hourlyPlayCounts.entries()).reduce((a, b) => a[1] > b[1] ? a : b)[0]
      : 0

    return {
      totalPlayTime,
      averageSessionLength,
      skipRate,
      completionRate,
      mostPlayedHour,
    }
  }

  // Group listening events into sessions
  private groupEventsIntoSessions(events: ListeningEvent[]): Array<{ duration: number; eventCount: number }> {
    const sortedEvents = [...events].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())
    const sessions: Array<{ duration: number; eventCount: number }> = []
    
    let currentSession = { duration: 0, eventCount: 0 }
    let lastEventTime = 0

    sortedEvents.forEach(event => {
      const eventTime = event.timestamp.getTime()
      const timeSinceLastEvent = eventTime - lastEventTime

      // If more than 30 minutes since last event, start new session
      if (timeSinceLastEvent > 30 * 60 * 1000 && currentSession.eventCount > 0) {
        sessions.push(currentSession)
        currentSession = { duration: 0, eventCount: 0 }
      }

      currentSession.duration += event.duration
      currentSession.eventCount += 1
      lastEventTime = eventTime
    })

    if (currentSession.eventCount > 0) {
      sessions.push(currentSession)
    }

    return sessions
  }

  // Get top tracks by various metrics
  getTopTracks(
    tracks: TrackMetadata[],
    metric: 'playCount' | 'rating' | 'duration' | 'recent',
    limit = 10
  ): TrackMetadata[] {
    let sortedTracks: TrackMetadata[]

    switch (metric) {
      case 'playCount':
        sortedTracks = [...tracks].sort((a, b) => b.playCount - a.playCount)
        break
      case 'rating':
        sortedTracks = [...tracks]
          .filter(t => t.rating && t.rating > 0)
          .sort((a, b) => (b.rating || 0) - (a.rating || 0))
        break
      case 'duration':
        sortedTracks = [...tracks].sort((a, b) => b.duration - a.duration)
        break
      case 'recent':
        sortedTracks = [...tracks]
          .filter(t => t.lastPlayed)
          .sort((a, b) => {
            const aTime = a.lastPlayed?.getTime() || 0
            const bTime = b.lastPlayed?.getTime() || 0
            return bTime - aTime
          })
        break
      default:
        sortedTracks = tracks
    }

    return sortedTracks.slice(0, limit)
  }

  // Calculate listening trends over time periods
  calculateListeningTrends(
    events: ListeningEvent[],
    period: 'daily' | 'weekly' | 'monthly',
    duration = 30
  ): Array<{ period: string; playCount: number; uniqueTracks: number }> {
    const trends: Array<{ period: string; playCount: number; uniqueTracks: number }> = []

    for (let i = duration - 1; i >= 0; i--) {
      let periodStart: Date
      let periodEnd: Date
      let formatString: string

      switch (period) {
        case 'daily':
          periodStart = startOfDay(subDays(new Date(), i))
          periodEnd = new Date(periodStart.getTime() + 24 * 60 * 60 * 1000)
          formatString = 'MMM dd'
          break
        case 'weekly':
          periodStart = startOfWeek(subWeeks(new Date(), i))
          periodEnd = new Date(periodStart.getTime() + 7 * 24 * 60 * 60 * 1000)
          formatString = 'MMM dd'
          break
        case 'monthly':
          periodStart = startOfMonth(subMonths(new Date(), i))
          periodEnd = startOfMonth(subMonths(new Date(), i - 1))
          formatString = 'MMM yyyy'
          break
        default:
          continue
      }

      const periodEvents = events.filter(event =>
        event.timestamp >= periodStart && event.timestamp < periodEnd
      )

      const uniqueTracks = new Set(periodEvents.map(event => event.trackId)).size

      trends.push({
        period: format(periodStart, formatString),
        playCount: periodEvents.length,
        uniqueTracks,
      })
    }

    return trends
  }

  // Export analytics data
  exportAnalyticsData(tracks: TrackMetadata[], events: ListeningEvent[]): {
    libraryStats: LibraryStats
    genreDistribution: GenreDistribution[]
    artistStats: ArtistStats[]
    listeningPatterns: ListeningPattern[]
    playbackStats: PlaybackStats
    topTracks: {
      mostPlayed: TrackMetadata[]
      highestRated: TrackMetadata[]
      recentlyPlayed: TrackMetadata[]
    }
  } {
    return {
      libraryStats: this.calculateLibraryStats(tracks),
      genreDistribution: this.calculateGenreDistribution(tracks),
      artistStats: this.calculateArtistStats(tracks),
      listeningPatterns: this.analyzeListeningPatterns(events),
      playbackStats: this.calculatePlaybackStats(events),
      topTracks: {
        mostPlayed: this.getTopTracks(tracks, 'playCount'),
        highestRated: this.getTopTracks(tracks, 'rating'),
        recentlyPlayed: this.getTopTracks(tracks, 'recent'),
      },
    }
  }
}

export const analyticsService = new AnalyticsService()