"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useContactStore } from "@/store"
import { exportContactsCSV, exportContactsJSON } from "@/lib/import-export"
import { toast } from "sonner"
import { Upload, FileJson, FileSpreadsheet, Trash2 } from "lucide-react"
import { seedContacts } from "@/lib/seed"
import { ImportDialog } from "@/components/contacts/ImportDialog"

export default function SettingsPage() {
    const { contacts, addContact, removeContacts } = useContactStore()
    const [isImportOpen, setIsImportOpen] = useState(false)

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
                        <CardDescription>Import contacts from JSON or CSV files with duplicate detection and conflict resolution.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button onClick={() => setIsImportOpen(true)}>
                            <Upload className="mr-2 h-4 w-4" /> Import Contacts
                        </Button>
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

            <ImportDialog open={isImportOpen} onOpenChange={setIsImportOpen} />
        </div>
    )
}
