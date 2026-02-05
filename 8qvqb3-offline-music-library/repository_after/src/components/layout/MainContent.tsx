'use client'

import { useMusicStore } from '@/lib/store/music-store'
import { LibraryView } from '@/components/views/LibraryView'
import { PlaylistsView } from '@/components/views/PlaylistsView'
import { AnalyticsView } from '@/components/views/AnalyticsView'
import { DuplicatesView } from '@/components/views/DuplicatesView'
import { SettingsView } from '@/components/views/SettingsView'

export function MainContent() {
  const { viewState } = useMusicStore()

  const renderView = () => {
    switch (viewState.currentView) {
      case 'library':
        return <LibraryView />
      case 'playlists':
        return <PlaylistsView />
      case 'analytics':
        return <AnalyticsView />
      case 'duplicates':
        return <DuplicatesView />
      case 'settings':
        return <SettingsView />
      default:
        return <LibraryView />
    }
  }

  return (
    <div className="flex-1 flex flex-col bg-gray-900">
      {renderView()}
    </div>
  )
}