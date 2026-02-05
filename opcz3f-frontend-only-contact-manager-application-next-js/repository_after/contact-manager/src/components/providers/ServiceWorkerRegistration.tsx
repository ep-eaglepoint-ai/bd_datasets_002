"use client"

import { useEffect } from "react"

export function ServiceWorkerRegistration() {
    useEffect(() => {
        if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
            // Register service worker on page load
            window.addEventListener('load', () => {
                navigator.serviceWorker
                    .register('/sw.js')
                    .then((registration) => {
                        console.log('Service Worker registered with scope:', registration.scope)
                        
                        // Check for updates
                        registration.addEventListener('updatefound', () => {
                            const newWorker = registration.installing
                            if (newWorker) {
                                newWorker.addEventListener('statechange', () => {
                                    if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                                        // New content is available, prompt user to refresh
                                        console.log('New content available, please refresh.')
                                    }
                                })
                            }
                        })
                    })
                    .catch((error) => {
                        console.log('Service Worker registration failed:', error)
                    })
            })
        }
    }, [])

    return null
}
