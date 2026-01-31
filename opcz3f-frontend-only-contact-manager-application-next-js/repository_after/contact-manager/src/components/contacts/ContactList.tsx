"use client"

import { useEffect, useMemo, useState } from "react"
import { useContactStore } from "@/store"
import { ContactCard } from "./ContactCard"
import { ContactRow } from "./ContactRow"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { LayoutGrid, List, Search, Plus, SlidersHorizontal, ArrowUpDown, ChevronLeft, ChevronRight, Download, Tag, Star } from "lucide-react"
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

import { filterAndSortContacts } from "@/lib/contact-utils"
import { exportContactsCSV } from "@/lib/import-export"
import { TagInput } from "@/components/ui/tag-input"
import { Skeleton } from "@/components/ui/skeleton"

const ITEMS_PER_PAGE = 20;

export function ContactList() {
    const { contacts, fetchContacts, removeContacts, isLoading, viewMode, setViewMode, sort, setSort, applyBulkTag } = useContactStore()
    const [searchTerm, setSearchTerm] = useState("")
    const [selectedTags, setSelectedTags] = useState<string[]>([])
    const [showFavoritesOnly, setShowFavoritesOnly] = useState(false)
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
    const [currentPage, setCurrentPage] = useState(1)
    
    const [isBulkTagOpen, setIsBulkTagOpen] = useState(false)
    const [bulkTags, setBulkTags] = useState<string[]>([])

    useEffect(() => {
        fetchContacts()
    }, [fetchContacts])

    // Derive all unique tags
    const allTags = useMemo(() => {
         const tags = new Set<string>()
         contacts.forEach(c => c.tags.forEach(t => tags.add(t)))
         return Array.from(tags).sort()
    }, [contacts])

    // Client side filtering/sorting logic
    const filteredContacts = useMemo(() => {
        return filterAndSortContacts(
            contacts, 
            { search: searchTerm, tags: selectedTags, isFavorite: showFavoritesOnly || undefined }, 
            sort
        )
    }, [contacts, searchTerm, selectedTags, showFavoritesOnly, sort])

    // Pagination Logic
    const totalPages = Math.ceil(filteredContacts.length / ITEMS_PER_PAGE)
    const paginatedContacts = useMemo(() => {
        const start = (currentPage - 1) * ITEMS_PER_PAGE
        return filteredContacts.slice(start, start + ITEMS_PER_PAGE)
    }, [filteredContacts, currentPage])

    // Reset page on filter change
    useEffect(() => {
        setCurrentPage(1)
    }, [searchTerm, selectedTags, showFavoritesOnly])

    const handleSelectAll = (checked: boolean) => {
        if (checked) {
            setSelectedIds(new Set(paginatedContacts.map(c => c.id)))
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

    const handleBulkExport = () => {
        const selected = contacts.filter(c => selectedIds.has(c.id))
        exportContactsCSV(selected)
        toast.success(`Exported ${selected.length} contacts`)
        setSelectedIds(new Set())
    }

    const handleBulkTag = async () => {
        if (bulkTags.length === 0) return
        
        try {
            await applyBulkTag(Array.from(selectedIds), bulkTags)
            toast.success("Tags added to selected contacts")
            setIsBulkTagOpen(false)
            setBulkTags([])
            setSelectedIds(new Set())
        } catch (error) {
            toast.error("Failed to update tags")
        }
    }

    if (isLoading && contacts.length === 0) {
        return (
            <div className="space-y-6">
                <div className="flex justify-between items-center">
                    <Skeleton className="h-10 w-48" />
                    <div className="flex gap-2">
                        <Skeleton className="h-10 w-32" />
                    </div>
                </div>
                <div className="flex gap-4 p-4 border rounded-xl bg-white">
                    <Skeleton className="h-10 flex-1" />
                    <Skeleton className="h-10 w-32" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                     {Array.from({ length: 8 }).map((_, i) => (
                         <div key={i} className="h-64 rounded-xl border border-slate-200 bg-white p-6 space-y-4">
                             <div className="flex items-center gap-4">
                                 <Skeleton className="h-12 w-12 rounded-full" />
                                 <div className="space-y-2">
                                     <Skeleton className="h-4 w-24" />
                                     <Skeleton className="h-3 w-32" />
                                 </div>
                             </div>
                             <div className="space-y-2 pt-4">
                                 <Skeleton className="h-4 w-full" />
                                 <Skeleton className="h-4 w-3/4" />
                             </div>
                         </div>
                     ))}
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
                <h1 className="text-3xl font-bold tracking-tight">Contacts</h1>
                <div className="flex gap-2 flex-wrap">
                    {selectedIds.size > 0 && (
                        <>
                             <Popover open={isBulkTagOpen} onOpenChange={setIsBulkTagOpen}>
                                <PopoverTrigger asChild>
                                    <Button variant="outline">
                                        <Tag className="mr-2 h-4 w-4" /> Tag ({selectedIds.size})
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-80">
                                    <div className="space-y-4">
                                        <h4 className="font-medium leading-none">Add Tags to Selected</h4>
                                        <TagInput 
                                            value={bulkTags} 
                                            onChange={setBulkTags} 
                                            placeholder="Enter tags..."
                                            suggestions={allTags}
                                        />
                                        <Button onClick={handleBulkTag} className="w-full">Apply Tags</Button>
                                    </div>
                                </PopoverContent>
                            </Popover>

                            <Button variant="outline" onClick={handleBulkExport}>
                                <Download className="mr-2 h-4 w-4" /> Export
                            </Button>
                            
                            <Button variant="destructive" onClick={handleBulkDelete}>
                                <Trash2 className="mr-2 h-4 w-4" /> Delete
                            </Button>
                        </>
                    )}
                    <Link href="/contacts/new">
                        <Button className="bg-indigo-600 hover:bg-indigo-700 text-white">
                            <Plus className="mr-2 h-4 w-4" /> Add Contact
                        </Button>
                    </Link>
                </div>
            </div>

            <div className="flex flex-col lg:flex-row gap-4 items-center bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                 <div className="relative flex-1 w-full lg:max-w-md">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                    <Input
                        placeholder="Search contacts..." 
                        className="pl-10 border-slate-200 focus:border-indigo-500 focus:ring-indigo-500"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                 </div>
                 
                 <div className="flex items-center gap-2 w-full lg:w-auto overflow-x-auto pb-2 lg:pb-0">
                      {/* Tag Filter */}
                      <Select 
                        value={selectedTags[0] || "all"} 
                        onValueChange={(val) => setSelectedTags(val === "all" ? [] : [val])}
                      >
                        <SelectTrigger className="w-[150px] border-slate-200">
                             <div className="flex items-center gap-2 text-slate-600">
                                <SlidersHorizontal className="h-4 w-4" />
                                <span>{selectedTags.length > 0 ? selectedTags[0] : "All Tags"}</span>
                             </div>
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Tags</SelectItem>
                            {allTags.map(tag => (
                                <SelectItem key={tag} value={tag}>{tag}</SelectItem>
                            ))}
                        </SelectContent>
                      </Select>

                      {/* Favorites Filter */}
                      <Button 
                        variant={showFavoritesOnly ? "default" : "outline"}
                        size="sm"
                        onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
                        className={showFavoritesOnly ? "bg-yellow-500 hover:bg-yellow-600 text-white" : ""}
                      >
                        <Star className={`h-4 w-4 mr-1 ${showFavoritesOnly ? 'fill-current' : ''}`} />
                        Favorites
                      </Button>

                     <Select 
                        value={sort.field} 
                        onValueChange={(val) => setSort({ ...sort, field: val as any })}
                     >
                        <SelectTrigger className="w-[160px] border-slate-200">
                            <SelectValue placeholder="Sort by" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="firstName">First Name</SelectItem>
                            <SelectItem value="lastName">Last Name</SelectItem>
                            <SelectItem value="company">Company</SelectItem>
                            <SelectItem value="updatedAt">Recently Updated</SelectItem>
                        </SelectContent>
                     </Select>

                     <Button 
                        variant="outline" 
                        size="icon"
                        onClick={() => setSort({ ...sort, order: sort.order === 'asc' ? 'desc' : 'asc' })}
                        title={sort.order === 'asc' ? 'Ascending' : 'Descending'}
                        className="w-10 px-0 shrink-0"
                     >
                        <ArrowUpDown className={`h-4 w-4 ${sort.order === 'desc' ? 'rotate-180' : ''}`} />
                     </Button>

                     <div className="h-6 w-px bg-slate-200 mx-1 shrink-0" />

                     <Button 
                        variant="outline" 
                        size="icon"
                        onClick={() => setViewMode('list')}
                        className={`shrink-0 ${viewMode === 'list' ? 'bg-slate-100 border-indigo-200 text-indigo-600' : ''}`}
                    >
                        <List className="h-4 w-4" />
                     </Button>
                     <Button 
                        variant="outline" 
                        size="icon"
                        onClick={() => setViewMode('grid')}
                        className={`shrink-0 ${viewMode === 'grid' ? 'bg-slate-100 border-indigo-200 text-indigo-600' : ''}`}
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
                    <p className="mt-1 text-sm text-slate-500">Try adjusting your filters or create a new contact.</p>
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
                                                    checked={selectedIds.size === paginatedContacts.length && paginatedContacts.length > 0}
                                                    onCheckedChange={(c) => handleSelectAll(!!c)}
                                                />
                                            </th>
                                            <th className="h-12 w-12 px-4 align-middle">
                                                <span className="sr-only">Favorite</span>
                                            </th>
                                            <th className="h-12 px-4 align-middle">Name</th>
                                            <th className="h-12 px-4 align-middle hidden md:table-cell">Contact Info</th>
                                            <th className="h-12 px-4 align-middle hidden lg:table-cell">Tags</th>
                                            <th className="h-12 px-4 align-middle text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {paginatedContacts.map(contact => (
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
                            {paginatedContacts.map(contact => (
                                <ContactCard key={contact.id} contact={contact} />
                            ))}
                        </div>
                    )}
                     
                     {/* Pagination Controls */}
                     {totalPages > 1 && (
                         <div className="flex items-center justify-between py-4">
                             <div className="text-sm text-slate-500">
                                 Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1} to {Math.min(currentPage * ITEMS_PER_PAGE, filteredContacts.length)} of {filteredContacts.length} contacts
                             </div>
                             <div className="flex gap-2">
                                <Button 
                                    variant="outline" 
                                    size="sm" 
                                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                    disabled={currentPage === 1}
                                >
                                    <ChevronLeft className="h-4 w-4 mr-1" /> Previous
                                </Button>
                                <Button 
                                    variant="outline" 
                                    size="sm" 
                                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                    disabled={currentPage === totalPages}
                                >
                                    Next <ChevronRight className="h-4 w-4 ml-1" />
                                </Button>
                             </div>
                         </div>
                     )}
                </>
            )}
        </div>
    )
}
