"use client"

import { Contact } from "@/types"
import { Avatar } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Star, MoreHorizontal, Pencil, Trash2, Eye } from "lucide-react"
import Link from "next/link"
import { useContactStore } from "@/store"
import { format } from "date-fns"

// I'll stick to a simple actions cell.

import { Checkbox } from "@/components/ui/checkbox"

interface ContactRowProps {
    contact: Contact
    selected?: boolean
    onSelect?: (checked: boolean) => void
}

export function ContactRow({ contact, selected, onSelect }: ContactRowProps) {
    const { toggleFavorite, removeContact } = useContactStore()

    return (
        <tr className={`border-b transition-colors hover:bg-slate-50 ${contact.isFavorite ? 'bg-indigo-50/30' : ''}`}>
             <td className="p-4 align-middle w-[50px]">
                <Checkbox checked={!!selected} onCheckedChange={(c) => onSelect?.(!!c)} />
             </td>
             <td className="p-4 align-middle">
                 <Button 
                    variant="ghost" 
                    size="icon" 
                    className={contact.isFavorite ? "text-yellow-500" : "text-slate-300"}
                    onClick={() => toggleFavorite(contact.id)}
                >
                    <Star className="h-4 w-4 fill-current" />
                </Button>
             </td>
             <td className="p-4 align-middle">
                 <div className="flex items-center gap-3">
                    <Avatar 
                        src={contact.avatarUrl} 
                        fallback={`${contact.firstName[0]}${contact.lastName?.[0] || ''}`} 
                        className="h-8 w-8"
                    />
                    <div>
                         <div className="font-medium text-slate-900">{contact.firstName} {contact.lastName}</div>
                         {(contact.company || contact.jobTitle) && (
                            <div className="text-xs text-slate-600 hidden md:block">
                                {contact.jobTitle} {contact.company && contact.jobTitle ? 'at' : ''} {contact.company}
                            </div>
                        )}
                    </div>
                 </div>
             </td>
     <td className="p-4 align-middle hidden md:table-cell">
                 <div className="text-sm text-slate-700 font-medium">{contact.emails[0]?.value}</div>
                 <div className="text-xs text-slate-500">{contact.phones[0]?.value}</div>
             </td>
             <td className="p-4 align-middle hidden lg:table-cell">
                 <div className="flex flex-wrap gap-1">
                    {contact.tags.slice(0, 2).map(tag => (
                        <Badge key={tag} variant="outline" className="text-xs font-normal border-slate-300 text-slate-700">
                            {tag}
                        </Badge>
                    ))}
                    {contact.tags.length > 2 && (
                         <span className="text-xs text-slate-500 font-medium">+{contact.tags.length - 2}</span>
                    )}
                </div>
             </td>
             <td className="p-4 align-middle text-right">
                <div className="flex justify-end gap-2">
                     <Link href={`/contacts/${contact.id}`}>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                            <Eye className="h-4 w-4" />
                        </Button>
                     </Link>
                     <Link href={`/contacts/${contact.id}/edit`}>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                            <Pencil className="h-4 w-4" />
                        </Button>
                     </Link>
                     <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-red-500 hover:text-red-600"
                        onClick={() => {
                            if (confirm('Are you sure you want to delete this contact?')) {
                                removeContact(contact.id)
                            }
                        }}
                    >
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </div>
             </td>
        </tr>
    )
}
