"use client"

import { Contact } from "@/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Phone, Mail, Star, Pencil, Trash2, Eye } from "lucide-react"
import Link from "next/link"
import { useContactStore } from "@/store"
import { useRouter } from "next/navigation"

interface ContactCardProps {
    contact: Contact
}

export function ContactCard({ contact }: ContactCardProps) {
    const { toggleFavorite, removeContact } = useContactStore()
    const router = useRouter()

    return (
        <Card className="overflow-hidden hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center gap-4 p-4 pb-2">
                <Avatar 
                    src={contact.avatarUrl} 
                    fallback={`${contact.firstName[0]}${contact.lastName?.[0] || ''}`} 
                    className="h-12 w-12"
                />
                <div className="flex-1 min-w-0">
                    <CardTitle className="text-base truncate">
                        {contact.firstName} {contact.lastName}
                    </CardTitle>
                    {(contact.company || contact.jobTitle) && (
                        <p className="text-sm text-slate-500 truncate">
                            {contact.jobTitle} {contact.company && contact.jobTitle ? 'at' : ''} {contact.company}
                        </p>
                    )}
                </div>
                <Button 
                    variant="ghost" 
                    size="icon" 
                    className={contact.isFavorite ? "text-yellow-500" : "text-slate-300"}
                    onClick={() => toggleFavorite(contact.id)}
                >
                    <Star className="h-4 w-4 fill-current" />
                </Button>
            </CardHeader>
            <CardContent className="p-4 pt-2 space-y-3">
                <div className="space-y-1">
                    {contact.emails[0] && (
                        <div className="flex items-center text-sm text-slate-600">
                            <Mail className="h-3 w-3 mr-2" />
                            <span className="truncate">{contact.emails[0].value}</span>
                        </div>
                    )}
                    {contact.phones[0] && (
                        <div className="flex items-center text-sm text-slate-600">
                            <Phone className="h-3 w-3 mr-2" />
                            <span className="truncate">{contact.phones[0].value}</span>
                        </div>
                    )}
                </div>
                
                {contact.tags && contact.tags.length > 0 && (
                     <div className="flex flex-wrap gap-1">
                        {contact.tags.slice(0, 3).map(tag => (
                            <Badge key={tag} variant="secondary" className="text-[10px] px-1 py-0 h-5">
                                {tag}
                            </Badge>
                        ))}
                        {contact.tags.length > 3 && (
                             <Badge variant="secondary" className="text-[10px] px-1 py-0 h-5">+{contact.tags.length - 3}</Badge>
                        )}
                    </div>
                )}

                <div className="flex items-center justify-end gap-1 pt-2 border-t border-slate-100">
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
                        className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50"
                        onClick={() => {
                            if (confirm('Are you sure you want to delete this contact?')) {
                                removeContact(contact.id)
                            }
                        }}
                    >
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </div>
            </CardContent>
        </Card>
    )
}
