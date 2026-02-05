"use client"

import { ContactForm } from "@/components/contacts/ContactForm"
import { getContact } from "@/lib/db"
import { useParams } from "next/navigation"
import { useEffect, useState } from "react"
import { Contact } from "@/types"
import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent } from "@/components/ui/card"

function EditContactSkeleton() {
    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <Skeleton className="h-9 w-40" />
            </div>
            <div className="max-w-4xl mx-auto bg-white p-6 rounded-lg shadow-sm border border-slate-200 space-y-8">
                {/* Header with buttons */}
                <div className="flex items-center justify-between">
                    <Skeleton className="h-8 w-36" />
                    <div className="flex gap-2">
                        <Skeleton className="h-10 w-20" />
                        <Skeleton className="h-10 w-20" />
                        <Skeleton className="h-10 w-32" />
                    </div>
                </div>
                
                {/* Avatar upload */}
                <div className="bg-slate-50 p-6 rounded-lg border border-slate-100 flex items-center gap-4">
                    <Skeleton className="h-24 w-24 rounded-full" />
                    <div className="space-y-2">
                        <Skeleton className="h-4 w-48" />
                        <Skeleton className="h-4 w-32" />
                    </div>
                </div>
                
                {/* Name fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <Skeleton className="h-4 w-20" />
                        <Skeleton className="h-10 w-full" />
                    </div>
                    <div className="space-y-2">
                        <Skeleton className="h-4 w-20" />
                        <Skeleton className="h-10 w-full" />
                    </div>
                </div>
                
                {/* Company fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <Skeleton className="h-4 w-16" />
                        <Skeleton className="h-10 w-full" />
                    </div>
                    <div className="space-y-2">
                        <Skeleton className="h-4 w-16" />
                        <Skeleton className="h-10 w-full" />
                    </div>
                </div>
                
                {/* Emails */}
                <div className="space-y-4 pt-4 border-t border-slate-100">
                    <div className="flex items-center justify-between">
                        <Skeleton className="h-5 w-16" />
                        <Skeleton className="h-8 w-24" />
                    </div>
                    <div className="grid grid-cols-[100px_1fr_40px] gap-2">
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-10 w-10" />
                    </div>
                </div>
                
                {/* Tags */}
                <div className="space-y-2 pt-4 border-t border-slate-100">
                    <Skeleton className="h-4 w-12" />
                    <Skeleton className="h-10 w-full" />
                </div>
                
                {/* Notes */}
                <div className="space-y-2 pt-4">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-32 w-full" />
                </div>
            </div>
        </div>
    )
}

export default function EditContactPage() {
    const params = useParams()
    const [contact, setContact] = useState<Contact | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const loadContact = async () => {
             if (typeof params.id === 'string') {
                 const data = await getContact(params.id)
                 setContact(data || null)
                 setLoading(false)
             }
        }
        loadContact()
    }, [params.id])

    if (loading) return <EditContactSkeleton />
    if (!contact) return <div className="text-center py-16 text-slate-500">Contact not found</div>

    return (
        <div className="space-y-6">
             <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold tracking-tight">Edit Contact</h1>
             </div>
             <ContactForm initialData={contact} contactId={contact.id} />
        </div>
    )
}
