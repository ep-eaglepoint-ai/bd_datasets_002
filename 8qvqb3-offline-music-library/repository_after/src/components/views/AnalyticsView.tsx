'use client'

import { useMemo } from 'react'
import { useMusicStore } from '@/lib/store/music-store'
import { analyticsService } from '@/lib/services/analytics-service'
import { StatsCard } from '@/components/ui/StatsCard'
import { GenreChart } from '@/components/charts/GenreChart'
import { ListeningPatternsChart } from '@/components/charts/ListeningPatternsChart'
import { LibraryGrowthChart } from '@/components/charts/LibraryGrowthChart'
import { TopTracksTable } from '@/components/ui/TopTracksTable'
import { EmptyState } from '@/components/ui/EmptyState'
import { BarChart3, Music, Users, Clock, Star } from 'lucide-react'
import { formatDuration, formatFileSize } from '@/lib/utils/format'

export function AnalyticsView() {
  const { tracks, listeningEvents, libraryStats } = useMusicStore()

  const analytics = useMemo(() => {
    if (tracks.length === 0) return null
    
    return {
      genreDistribution: analyticsService.calculateGenreDistribution(tracks),
      artistStats: analyticsService.calculateArtistStats(tracks),
      listeningPatterns: analyticsService.analyzeListeningPatterns(listeningEvents),
      libraryGrowth: analyticsService.calculateLibraryGrowth(tracks),
      playbackStats: analyticsService.calculatePlaybackStats(listeningEvents),
      topTracks: {
        mostPlayed: analyticsService.getTopTracks(tracks, 'playCount'),
        highestRated: analyticsService.getTopTracks(tracks, 'rating'),
        recent: analyticsService.getTopTracks(tracks, 'recent'),
      }
    }
  }, [tracks, listeningEvents])

  if (!analytics || tracks.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <EmptyState
          icon={BarChart3}
          title="No analytics available"
          description="Import music and start listening to see your analytics"
        />
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-auto">
      <div className="p-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white mb-2">Analytics</h1>
          <p className="text-gray-400">Insights into your music library and listening habits</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatsCard
            title="Total Tracks"
            value={libraryStats?.totalTracks.toLocaleString() || '0'}
            icon={Music}
            trend={libraryStats?.recentlyAdded ? `+${libraryStats.recentlyAdded} this week` : undefined}
          />
          <StatsCard
            title="Artists"
            value={libraryStats?.totalArtists.toLocaleString() || '0'}
            icon={Users}
          />
          <StatsCard
            title="Total Duration"
            value={formatDuration(libraryStats?.totalDuration || 0)}
            icon={Clock}
          />
          <StatsCard
            title="Library Size"
            value={formatFileSize(libraryStats?.totalSize || 0)}
            icon={BarChart3}
          />
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Genre Distribution */}
          <div className="bg-gray-800 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Genre Distribution</h3>
            <GenreChart data={analytics.genreDistribution} />
          </div>

          {/* Listening Patterns */}
          <div className="bg-gray-800 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Listening Patterns</h3>
            <ListeningPatternsChart data={analytics.listeningPatterns} />
          </div>
        </div>

        {/* Library Growth */}
        <div className="bg-gray-800 rounded-lg p-6 mb-8">
          <h3 className="text-lg font-semibold text-white mb-4">Library Growth</h3>
          <LibraryGrowthChart data={analytics.libraryGrowth} />
        </div>

        {/* Top Tracks Tables */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="bg-gray-800 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Most Played</h3>
            <TopTracksTable tracks={analytics.topTracks.mostPlayed} metric="playCount" />
          </div>

          <div className="bg-gray-800 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Highest Rated</h3>
            <TopTracksTable tracks={analytics.topTracks.highestRated} metric="rating" />
          </div>

          <div className="bg-gray-800 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Recently Played</h3>
            <TopTracksTable tracks={analytics.topTracks.recent} metric="lastPlayed" />
          </div>
        </div>
      </div>
    </div>
  )
}