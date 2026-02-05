"use client"

import { useContactStore } from "@/store"
import { useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Users, Star, Clock, Tag, Upload, Download } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { formatDistanceToNow } from "date-fns"
import { ImportDialog } from "@/components/contacts/ImportDialog"
import { exportContactsCSV } from "@/lib/import-export"

export default function DashboardPage() {
    const { contacts, fetchContacts } = useContactStore()
    const [isImportOpen, setIsImportOpen] = useState(false)

    useEffect(() => {
        fetchContacts()
    }, [fetchContacts])

    const totalContacts = contacts.length
    const favoritesCount = contacts.filter(c => c.isFavorite).length
    const recentContacts = [...contacts].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 5)

    // Calculate Top Tags
    const topTags = useMemo(() => {
        const tagCounts: Record<string, number> = {}
        contacts.forEach(c => {
            c.tags.forEach(t => {
                tagCounts[t] = (tagCounts[t] || 0) + 1
            })
        })
        return Object.entries(tagCounts)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 5)
    }, [contacts])

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
            
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card className="border-l-4 border-indigo-500 shadow-sm hover:shadow-md transition-all">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-slate-600">Total Contacts</CardTitle>
                        <div className="h-8 w-8 rounded-full bg-indigo-50 flex items-center justify-center">
                            <Users className="h-4 w-4 text-indigo-600" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-slate-900">{totalContacts}</div>
                    </CardContent>
                </Card>
                <Card className="border-l-4 border-yellow-400 shadow-sm hover:shadow-md transition-all">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-slate-600">Favorites</CardTitle>
                         <div className="h-8 w-8 rounded-full bg-yellow-50 flex items-center justify-center">
                            <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-slate-900">{favoritesCount}</div>
                    </CardContent>
                </Card>
                <Card className="border-l-4 border-emerald-500 shadow-sm hover:shadow-md transition-all">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-slate-600">Recent Activity</CardTitle>
                        <div className="h-8 w-8 rounded-full bg-emerald-50 flex items-center justify-center">
                            <Clock className="h-4 w-4 text-emerald-600" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-slate-900">
                             {recentContacts.length > 0 ? formatDistanceToNow(recentContacts[0].updatedAt, { addSuffix: true }) : 'N/A'}
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-l-4 border-pink-500 shadow-sm hover:shadow-md transition-all">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium text-slate-600">Top Tag</CardTitle>
                        <div className="h-8 w-8 rounded-full bg-pink-50 flex items-center justify-center">
                            <Tag className="h-4 w-4 text-pink-600" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-slate-900 truncate">
                            {topTags.length > 0 ? topTags[0][0] : 'None'}
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                 <Card className="col-span-1 md:col-span-2">
                    <CardHeader>
                        <CardTitle>Recent Contacts</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {recentContacts.length > 0 ? recentContacts.map(contact => (
                                <Link key={contact.id} href={`/contacts/${contact.id}`} className="group flex items-center justify-between hover:bg-slate-50 p-2 rounded-md transition-colors border border-transparent hover:border-slate-100">
                                    <div className="flex items-center space-x-4">
                                        <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold group-hover:bg-white group-hover:shadow-sm">
                                            {contact.firstName[0]}{contact.lastName[0]}
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-sm font-medium leading-none">{contact.firstName} {contact.lastName}</p>
                                            <p className="text-xs text-slate-500">{contact.company || contact.emails[0]?.value}</p>
                                        </div>
                                    </div>
                                    <div className="text-xs text-slate-500">
                                        {formatDistanceToNow(contact.updatedAt, { addSuffix: true })}
                                    </div>
                                </Link>
                            )) : (
                                <p className="text-sm text-slate-500 py-4 text-center">No contacts yet.</p>
                            )}
                        </div>
                    </CardContent>
                </Card>
                
                <Card className="col-span-1">
                     <CardHeader>
                        <CardTitle>Quick Actions</CardTitle>
                        <CardDescription>Manage your contacts efficiently</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <Link href="/contacts/new">
                            <Button className="w-full justify-start" size="lg">
                                <Users className="mr-2 h-5 w-5" /> Create Contact
                            </Button>
                        </Link>
                        
                        <Button 
                            variant="outline" 
                            className="w-full justify-start" 
                            size="lg"
                            onClick={() => setIsImportOpen(true)}
                        >
                            <Upload className="mr-2 h-5 w-5" /> Import Data
                        </Button>
                        
                        <Button 
                            variant="outline" 
                            className="w-full justify-start" 
                            size="lg"
                            onClick={() => exportContactsCSV(contacts)}
                        >
                            <Download className="mr-2 h-5 w-5" /> Export All CSV
                        </Button>

                        <div className="pt-4 mt-4 border-t border-slate-100">
                             <h4 className="text-sm font-semibold mb-3 text-slate-900">Popular Tags</h4>
                             <div className="flex flex-wrap gap-2">
                                {topTags.map(([tag, count]) => (
                                    <div key={tag} className="bg-slate-100 text-slate-600 px-2 py-1 rounded text-xs font-medium">
                                        {tag} ({count})
                                    </div>
                                ))}
                                {topTags.length === 0 && <span className="text-xs text-slate-400">No tags used yet</span>}
                             </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
            
            <ImportDialog open={isImportOpen} onOpenChange={setIsImportOpen} />
        </div>
    )
}
