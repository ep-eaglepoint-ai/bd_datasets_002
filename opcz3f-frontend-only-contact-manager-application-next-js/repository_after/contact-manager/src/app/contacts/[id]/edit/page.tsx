"use client"

import { ContactForm } from "@/components/contacts/ContactForm"
import { getContact } from "@/lib/db"
import { useParams } from "next/navigation"
import { useEffect, useState } from "react"
import { Contact } from "@/types"

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

    if (loading) return <div>Loading...</div>
    if (!contact) return <div>Contact not found</div>

    return (
        <div className="space-y-6">
             <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold tracking-tight">Edit Contact</h1>
             </div>
             <ContactForm initialData={contact} contactId={contact.id} />
        </div>
    )
}
