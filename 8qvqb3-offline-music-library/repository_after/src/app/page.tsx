'use client'

import { useEffect } from 'react'
import { useMusicStore } from '@/lib/store/music-store'
import { Sidebar } from '@/components/layout/Sidebar'
import { MainContent } from '@/components/layout/MainContent'
import { ImportModal } from '@/components/modals/ImportModal'
import { LoadingScreen } from '@/components/ui/LoadingScreen'

export default function HomePage() {
  const { isInitialized, initialize } = useMusicStore()

  useEffect(() => {
    initialize()
  }, [initialize])

  if (!isInitialized) {
    return <LoadingScreen />
  }

  return (
    <div className="flex h-screen bg-gray-900">
      <Sidebar />
      <MainContent />
      <ImportModal />
    </div>
  )
}