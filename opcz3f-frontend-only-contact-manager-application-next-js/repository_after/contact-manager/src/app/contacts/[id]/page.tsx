"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { getContact } from "@/lib/db"
import { Contact } from "@/types"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Pencil, Trash2, ArrowLeft, Star, Phone, Mail, MapPin, Building2, Calendar, Clock } from "lucide-react"
import Link from "next/link"
import { useContactStore } from "@/store"
import { format } from "date-fns"
import { renderMarkdown } from "@/lib/markdown"

function ContactDetailSkeleton() {
    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Skeleton className="h-10 w-10 rounded" />
                <Skeleton className="h-8 w-48" />
                <div className="flex-1" />
                <div className="flex gap-2">
                    <Skeleton className="h-10 w-10" />
                    <Skeleton className="h-10 w-20" />
                    <Skeleton className="h-10 w-24" />
                </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="md:col-span-1">
                    <CardContent className="pt-6 flex flex-col items-center text-center space-y-4">
                        <Skeleton className="h-32 w-32 rounded-full" />
                        <div className="space-y-2">
                            <Skeleton className="h-6 w-40 mx-auto" />
                            <Skeleton className="h-4 w-32 mx-auto" />
                            <Skeleton className="h-4 w-24 mx-auto" />
                        </div>
                        <div className="flex gap-2">
                            <Skeleton className="h-6 w-16 rounded-full" />
                            <Skeleton className="h-6 w-16 rounded-full" />
                        </div>
                    </CardContent>
                </Card>
                <Card className="md:col-span-2">
                    <CardHeader>
                        <Skeleton className="h-6 w-40" />
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="space-y-2">
                            <Skeleton className="h-4 w-16" />
                            <Skeleton className="h-5 w-48" />
                        </div>
                        <div className="space-y-2">
                            <Skeleton className="h-4 w-16" />
                            <Skeleton className="h-5 w-36" />
                        </div>
                        <div className="space-y-2">
                            <Skeleton className="h-4 w-16" />
                            <Skeleton className="h-24 w-full" />
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}

export default function ContactDetailsPage() {
    const params = useParams()
    const router = useRouter()
    const { removeContact, toggleFavorite } = useContactStore()
    const [contact, setContact] = useState<Contact | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const loadContact = async () => {
             if (typeof params.id === 'string') {
                 const data = await getContact(params.id)
                 if (data) {
                     setContact(data)
                 } else {
                     router.push('/contacts')
                 }
                 setLoading(false)
             }
        }
        loadContact()
    }, [params.id, router])

    if (loading) return <ContactDetailSkeleton />
    if (!contact) return null

    // Check if address has any data
    const hasAddress = contact.address && (
        contact.address.street || 
        contact.address.city || 
        contact.address.state || 
        contact.address.zip || 
        contact.address.country
    )

    const formatAddress = () => {
        if (!contact.address) return null
        const parts = []
        if (contact.address.street) parts.push(contact.address.street)
        
        const cityStateZip = [
            contact.address.city,
            contact.address.state,
            contact.address.zip
        ].filter(Boolean).join(', ')
        if (cityStateZip) parts.push(cityStateZip)
        
        if (contact.address.country) parts.push(contact.address.country)
        return parts
    }

    return (
        <div className="space-y-6">
             <div className="flex items-center gap-4">
                 <Link href="/contacts">
                    <Button variant="ghost" size="icon">
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                 </Link>
                 <h1 className="text-2xl font-bold tracking-tight flex-1">Contact Details</h1>
                 <div className="flex gap-2">
                     <Button 
                        variant="outline" 
                        size="icon" 
                        onClick={async () => {
                             await toggleFavorite(contact.id)
                             setContact(c => c ? ({ ...c, isFavorite: !c.isFavorite }) : null)
                        }}
                        className={contact.isFavorite ? "text-yellow-500" : "text-slate-400"}
                    >
                        <Star className="h-4 w-4 fill-current" />
                    </Button>
                    <Link href={`/contacts/${contact.id}/edit`}>
                         <Button variant="outline">
                             <Pencil className="h-4 w-4 mr-2" /> Edit
                         </Button>
                    </Link>
                    <Button 
                        variant="destructive" 
                        onClick={() => {
                            if (confirm('Delete this contact?')) {
                                removeContact(contact.id)
                                router.push('/contacts')
                            }
                        }}
                    >
                        <Trash2 className="h-4 w-4 mr-2" /> Delete
                    </Button>
                 </div>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <Card className="md:col-span-1">
                      <CardContent className="pt-6 flex flex-col items-center text-center space-y-4">
                           <Avatar className="h-32 w-32 text-4xl">
                                <AvatarImage src={contact.avatarUrl} alt={`${contact.firstName} ${contact.lastName}`} />
                                <AvatarFallback>{`${contact.firstName[0]}${contact.lastName?.[0] || ''}`}</AvatarFallback>
                           </Avatar>
                            <div>
                                <h2 className="text-2xl font-bold">{contact.firstName} {contact.lastName}</h2>
                                {contact.jobTitle && <p className="text-slate-500">{contact.jobTitle}</p>}
                                {contact.company && <p className="text-slate-500 text-sm">{contact.company}</p>}
                            </div>
                             <div className="flex flex-wrap gap-2 justify-center">
                                {contact.tags.map(tag => (
                                    <Badge key={tag} variant="secondary">{tag}</Badge>
                                ))}
                            </div>
                      </CardContent>
                  </Card>

                  <Card className="md:col-span-2">
                      <CardHeader>
                          <CardTitle>Contact Information</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-6">
                          {contact.emails.length > 0 && (
                              <div className="space-y-2">
                                  <h3 className="text-sm font-medium text-slate-500">Emails</h3>
                                  {contact.emails.map(email => (
                                      <div key={email.id} className="flex items-center gap-3">
                                          <Mail className="h-4 w-4 text-slate-400" />
                                          <span className="flex-1">{email.value}</span>
                                          <Badge variant="outline" className="text-xs">{email.type}</Badge>
                                      </div>
                                  ))}
                              </div>
                          )}

                          {contact.phones.length > 0 && (
                              <div className="space-y-2">
                                  <h3 className="text-sm font-medium text-slate-500">Phones</h3>
                                  {contact.phones.map(phone => (
                                      <div key={phone.id} className="flex items-center gap-3">
                                          <Phone className="h-4 w-4 text-slate-400" />
                                          <span className="flex-1">{phone.value}</span>
                                          <Badge variant="outline" className="text-xs">{phone.type}</Badge>
                                      </div>
                                  ))}
                              </div>
                          )}

                          {hasAddress && (
                              <div className="space-y-2">
                                  <h3 className="text-sm font-medium text-slate-500">Address</h3>
                                  <div className="flex items-start gap-3">
                                      <MapPin className="h-4 w-4 text-slate-400 mt-0.5" />
                                      <div className="flex-1">
                                          {formatAddress()?.map((line, i) => (
                                              <p key={i} className="text-sm">{line}</p>
                                          ))}
                                      </div>
                                  </div>
                              </div>
                          )}
                          
                          {contact.notes && (
                               <div className="space-y-2">
                                  <h3 className="text-sm font-medium text-slate-500">Notes</h3>
                                  <div className="bg-slate-50 p-4 rounded-md text-sm prose prose-sm max-w-none">
                                      {renderMarkdown(contact.notes)}
                                  </div>
                              </div>
                          )}
                            
                          <div className="pt-4 border-t border-slate-100 flex gap-4 text-xs text-slate-400">
                                <div className="flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    Updated {format(contact.updatedAt, 'PPp')}
                                </div>
                          </div>
                      </CardContent>
                  </Card>
             </div>
        </div>
    )
}
