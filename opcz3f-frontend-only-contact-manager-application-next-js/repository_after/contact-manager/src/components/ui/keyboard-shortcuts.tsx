"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

export function KeyboardShortcuts() {
    const router = useRouter()

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // New Contact: C or Alt+N
            if ((e.key === 'c' && !e.ctrlKey && !e.metaKey && !e.altKey && e.target instanceof HTMLBodyElement) || 
                (e.key === 'n' && e.altKey)) {
                e.preventDefault()
                router.push('/contacts/new')
            }

            // Search: / or Ctrl+K
            if ((e.key === '/' && e.target instanceof HTMLBodyElement) || 
                (e.key === 'k' && (e.ctrlKey || e.metaKey))) {
                e.preventDefault()
                const searchInput = document.querySelector('input[type="text"]') as HTMLInputElement
                if (searchInput) {
                    searchInput.focus()
                } else {
                    router.push('/contacts') // Go to list if not there
                    setTimeout(() => {
                         const searchInput = document.querySelector('input[type="text"]') as HTMLInputElement
                         searchInput?.focus()
                    }, 100)
                }
            }

            // Go to Dashboard: Alt+D
            if (e.key === 'd' && e.altKey) {
                e.preventDefault()
                router.push('/')
            }

            // Go to Settings: Alt+S
            if (e.key === 's' && e.altKey) {
                 e.preventDefault()
                 router.push('/settings')
            }
        }

        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [router])

    useEffect(() => {
        const handleOnline = () => toast.success("You are back online")
        const handleOffline = () => toast.warning("You are offline. Changes will save locally.")
        
        window.addEventListener('online', handleOnline)
        window.addEventListener('offline', handleOffline)

        return () => {
            window.removeEventListener('online', handleOnline)
            window.removeEventListener('offline', handleOffline)
        }
    }, [])

    return null
}
