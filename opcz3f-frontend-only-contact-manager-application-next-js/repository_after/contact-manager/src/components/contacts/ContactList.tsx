"use client"

import { useEffect, useMemo, useState } from "react"
import { useContactStore } from "@/store"
import { ContactCard } from "./ContactCard"
import { ContactRow } from "./ContactRow"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { LayoutGrid, List, Search, Plus, Filter, SortAsc, Star } from "lucide-react"
import Link from "next/link"
import { Contact } from "@/types"

import { Checkbox } from "@/components/ui/checkbox"
import { Trash2 } from "lucide-react"
import { toast } from "sonner"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

import { filterAndSortContacts } from "@/lib/contact-utils"

export function ContactList() {
    const { contacts, fetchContacts, removeContacts, isLoading, viewMode, setViewMode, filter, setFilter, sort, setSort } = useContactStore()
    const [searchTerm, setSearchTerm] = useState("")
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

    useEffect(() => {
        fetchContacts()
    }, [fetchContacts])

    // Client side filtering/sorting logic
    const filteredContacts = useMemo(() => {
        return filterAndSortContacts(contacts, searchTerm, sort)
    }, [contacts, searchTerm, sort])

    const handleSelectAll = (checked: boolean) => {
        if (checked) {
            setSelectedIds(new Set(filteredContacts.map(c => c.id)))
        } else {
            setSelectedIds(new Set())
        }
    }

    const handleSelectOne = (id: string, checked: boolean) => {
        const next = new Set(selectedIds)
        if (checked) next.add(id)
        else next.delete(id)
        setSelectedIds(next)
    }

    const handleBulkDelete = async () => {
        if (!confirm(`Are you sure you want to delete ${selectedIds.size} contacts?`)) return
        await removeContacts(Array.from(selectedIds))
        setSelectedIds(new Set())
        toast.success("Contacts deleted")
    }

    if (isLoading && contacts.length === 0) {
        return <div className="p-8 text-center text-slate-500">Loading contacts...</div>
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
                <h1 className="text-3xl font-bold tracking-tight">Contacts</h1>
                <div className="flex gap-2">
                    {selectedIds.size > 0 && (
                        <Button variant="destructive" onClick={handleBulkDelete}>
                            <Trash2 className="mr-2 h-4 w-4" /> Delete ({selectedIds.size})
                        </Button>
                    )}
                    <Link href="/contacts/new">
                        <Button className="bg-indigo-600 hover:bg-indigo-700 text-white">
                            <Plus className="mr-2 h-4 w-4" /> Add Contact
                        </Button>
                    </Link>
                </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 items-center bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                 <div className="relative flex-1 w-full">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                    <Input
                        placeholder="Search contacts..." 
                        className="pl-10 border-slate-200 focus:border-indigo-500 focus:ring-indigo-500"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                 </div>
                 <div className="flex items-center gap-2 w-full sm:w-auto">
                     <Select 
                        value={sort.field} 
                        onValueChange={(val) => setSort({ ...sort, field: val as any })}
                     >
                        <SelectTrigger className="w-[140px] border-slate-200">
                            <SelectValue placeholder="Sort by" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="firstName">First Name</SelectItem>
                            <SelectItem value="lastName">Last Name</SelectItem>
                            <SelectItem value="updatedAt">Recently Updated</SelectItem>
                        </SelectContent>
                     </Select>

                     <Button 
                        variant="outline" 
                        size="icon"
                        onClick={() => setSort({ ...sort, order: sort.order === 'asc' ? 'desc' : 'asc' })}
                        title={sort.order === 'asc' ? 'Ascending' : 'Descending'}
                        className="w-10 px-0"
                     >
                        <SortAsc className={`h-4 w-4 transition-transform ${sort.order === 'desc' ? 'rotate-180' : ''}`} />
                     </Button>

                     <div className="h-6 w-px bg-slate-200 mx-1" />

                     <Button 
                        variant="outline" 
                        size="icon"
                        onClick={() => setViewMode('list')}
                        className={viewMode === 'list' ? 'bg-slate-100 border-indigo-200 text-indigo-600' : ''}
                    >
                        <List className="h-4 w-4" />
                     </Button>
                     <Button 
                        variant="outline" 
                        size="icon"
                        onClick={() => setViewMode('grid')}
                        className={viewMode === 'grid' ? 'bg-slate-100 border-indigo-200 text-indigo-600' : ''}
                    >
                        <LayoutGrid className="h-4 w-4" />
                     </Button>
                 </div>
            </div>

            {filteredContacts.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-xl border border-dashed border-slate-300">
                    <div className="mx-auto h-12 w-12 text-slate-300 flex items-center justify-center rounded-full bg-slate-50 mb-4">
                        <Search className="h-6 w-6" />
                    </div>
                    <h3 className="text-sm font-semibold text-slate-900">No contacts found</h3>
                    <p className="mt-1 text-sm text-slate-500">Get started by creating a new contact.</p>
                </div>
            ) : (
                <>
                    {viewMode === 'list' ? (
                        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead className="border-b bg-slate-50/80 text-left font-medium text-slate-600">
                                        <tr>
                                            <th className="h-12 w-[50px] px-4 align-middle">
                                                <Checkbox 
                                                    checked={selectedIds.size === filteredContacts.length && filteredContacts.length > 0}
                                                    onCheckedChange={(c) => handleSelectAll(!!c)}
                                                />
                                            </th>
                                            <th className="h-12 w-12 px-4 align-middle">
                                                <Star className="h-4 w-4" />
                                            </th>
                                            <th className="h-12 px-4 align-middle">Name</th>
                                            <th className="h-12 px-4 align-middle hidden md:table-cell">Contact Info</th>
                                            <th className="h-12 px-4 align-middle hidden lg:table-cell">Tags</th>
                                            <th className="h-12 px-4 align-middle text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {filteredContacts.map(contact => (
                                            <ContactRow 
                                                key={contact.id} 
                                                contact={contact} 
                                                selected={selectedIds.has(contact.id)} 
                                                onSelect={(c) => handleSelectOne(contact.id, c)}
                                            />
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {filteredContacts.map(contact => (
                                <ContactCard key={contact.id} contact={contact} />
                            ))}
                        </div>
                    )}
                     <div className="text-sm text-slate-500 text-center pt-8 pb-4">
                        Showing {filteredContacts.length} contact{filteredContacts.length !== 1 ? 's' : ''}
                    </div>
                </>
            )}
        </div>
    )
}
