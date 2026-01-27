"use client"

import { useContactStore } from "@/store"
import { useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, Star, Clock } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { formatDistanceToNow } from "date-fns"

export default function DashboardPage() {
    const { contacts, fetchContacts } = useContactStore()

    useEffect(() => {
        fetchContacts()
    }, [fetchContacts])

    const totalContacts = contacts.length
    const favoritesCount = contacts.filter(c => c.isFavorite).length
    const recentContacts = [...contacts].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 5)

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
            </div>

            <div className="grid gap-4 md:grid-cols-1 md:gap-8 lg:grid-cols-2">
                 <Card className="col-span-1">
                    <CardHeader>
                        <CardTitle>Recent Activity</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {recentContacts.map(contact => (
                                <Link key={contact.id} href={`/contacts/${contact.id}`} className="flex items-center justify-between hover:bg-slate-50 p-2 rounded-md transition-colors">
                                    <div className="flex items-center space-x-4">
                                        <div className="space-y-1">
                                            <p className="text-sm font-medium leading-none">{contact.firstName} {contact.lastName}</p>
                                            <p className="text-xs text-slate-500">{contact.emails[0]?.value}</p>
                                        </div>
                                    </div>
                                    <div className="text-xs text-slate-500">
                                        {formatDistanceToNow(contact.updatedAt, { addSuffix: true })}
                                    </div>
                                </Link>
                            ))}
                            {recentContacts.length === 0 && (
                                <p className="text-sm text-slate-500">No recent activity.</p>
                            )}
                             <Link href="/contacts/new">
                                <Button className="w-full mt-4" variant="outline">Create New Contact</Button>
                            </Link>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
