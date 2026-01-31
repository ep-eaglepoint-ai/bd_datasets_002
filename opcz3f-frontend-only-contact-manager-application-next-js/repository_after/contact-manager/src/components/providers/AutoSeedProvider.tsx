"use client"

import { useEffect, useRef } from "react"
import { useContactStore } from "@/store"
import { seedContacts } from "@/lib/seed"
import { toast } from "sonner"

const AUTO_SEED_KEY = "contact-manager-auto-seeded"

export function AutoSeedProvider({ children }: { children: React.ReactNode }) {
    const { contacts, addContact, fetchContacts, isLoading } = useContactStore()
    const hasAttempted = useRef(false)

    useEffect(() => {
        const autoSeed = async () => {
            // Only attempt once per session/render
            if (hasAttempted.current) return
            hasAttempted.current = true

            // Wait for contacts to load first
            await fetchContacts()
            
            // Check if already seeded or has contacts
            const currentContacts = useContactStore.getState().contacts
            const alreadySeeded = localStorage.getItem(AUTO_SEED_KEY)
            
            if (currentContacts.length === 0 && !alreadySeeded) {
                // Auto-seed with test data
                console.log("First run detected, seeding contacts...")
                for (const contact of seedContacts) {
                    await addContact(contact)
                }
                localStorage.setItem(AUTO_SEED_KEY, "true")
                toast.success(`Welcome! Loaded ${seedContacts.length} sample contacts.`)
            }
        }
        
        autoSeed()
    }, [addContact, fetchContacts])

    return <>{children}</>
}
