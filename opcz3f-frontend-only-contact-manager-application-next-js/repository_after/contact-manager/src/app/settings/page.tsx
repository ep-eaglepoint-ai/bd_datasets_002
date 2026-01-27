"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { useContactStore } from "@/store"
import { exportContactsCSV, exportContactsJSON, parseContactsCSV, parseContactsJSON } from "@/lib/import-export"
import { toast } from "sonner"
import { Upload, Download, FileJson, FileSpreadsheet, Trash2 } from "lucide-react"
import { useDropzone } from "react-dropzone"
import { useCallback } from "react"
import { ContactFormData } from "@/types"
import { seedContacts } from "@/lib/seed"

export default function SettingsPage() {
    const { contacts, addContact, removeContacts } = useContactStore()

    const handleLoadSeedData = async () => {
        if (contacts.length > 0) {
            if (!confirm("This will add seed data to your existing contacts. Continue?")) return
        }
        
        let count = 0
        for (const contact of seedContacts) {
             await addContact(contact)
             count++
        }
        toast.success(`Added ${count} test contacts`)
    }

    const onDrop = useCallback(async (acceptedFiles: File[]) => {
        const file = acceptedFiles[0]
        if (!file) return

        try {
            let newContacts: ContactFormData[] = []
            if (file.name.endsWith('.json')) {
                newContacts = await parseContactsJSON(file)
            } else if (file.name.endsWith('.csv')) {
                newContacts = await parseContactsCSV(file)
            } else {
                toast.error("Unsupported file format")
                return
            }

            // Basic duplicate check (by email) - In real app, offer UI to resolve
            let addedCount = 0
            for (const contact of newContacts) {
                // Check if email exists
                const email = contact.emails?.[0]?.value
                const exists = email && contacts.some(c => c.emails.some(e => e.value === email))
                
                if (!exists) {
                     await addContact(contact)
                     addedCount++
                }
            }
            
            toast.success(`Imported ${addedCount} contacts. ${newContacts.length - addedCount} duplicates skipped.`)

        } catch (error) {
            console.error(error)
            toast.error("Failed to parse file")
        }
    }, [contacts, addContact])

    const { getRootProps, getInputProps, isDragActive } = useDropzone({ 
        onDrop, 
        accept: {
            'application/json': ['.json'],
            'text/csv': ['.csv']
        },
        maxFiles: 1
    })

    const handleClearAll = async () => {
        if (confirm("Are you sure you want to delete ALL contacts? This action cannot be undone.")) {
            await removeContacts(contacts.map(c => c.id))
            toast.success("All contacts deleted")
        }
    }

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold tracking-tight">Settings</h1>

            <div className="grid gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Import Contacts</CardTitle>
                        <CardDescription>Import contacts from JSON or CSV files.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div 
                            {...getRootProps()} 
                            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${isDragActive ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200 hover:border-slate-300'}`}
                        >
                            <input {...getInputProps()} />
                            <Upload className="mx-auto h-12 w-12 text-slate-400" />
                            <p className="mt-2 text-sm text-slate-600">Drag & drop a file here, or click to select</p>
                            <p className="text-xs text-slate-400 mt-1">Supports .json and .csv</p>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Export Contacts</CardTitle>
                        <CardDescription>Download your contacts to backup or use elsewhere.</CardDescription>
                    </CardHeader>
                    <CardContent className="flex gap-4">
                         <Button onClick={() => exportContactsJSON(contacts)} variant="outline">
                             <FileJson className="mr-2 h-4 w-4" /> Export JSON
                         </Button>
                         <Button onClick={() => exportContactsCSV(contacts)} variant="outline">
                             <FileSpreadsheet className="mr-2 h-4 w-4" /> Export CSV
                         </Button>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Developer Tools</CardTitle>
                        <CardDescription>Helpers for testing.</CardDescription>
                    </CardHeader>
                    <CardContent>
                         <Button variant="secondary" onClick={handleLoadSeedData}>
                             Load Test Data
                         </Button>
                    </CardContent>
                </Card>
                
                <Card className="border-red-100">
                    <CardHeader>
                        <CardTitle className="text-red-600">Danger Zone</CardTitle>
                        <CardDescription>Destructive actions that cannot be undone.</CardDescription>
                    </CardHeader>
                    <CardContent>
                         <Button variant="destructive" onClick={handleClearAll}>
                             <Trash2 className="mr-2 h-4 w-4" /> Delete All Contacts
                         </Button>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
