"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { getContact } from "@/lib/db"
import { Contact } from "@/types"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Pencil, Trash2, ArrowLeft, Star, Phone, Mail, MapPin, Building2, Calendar, Clock } from "lucide-react"
import Link from "next/link"
import { useContactStore } from "@/store"
import { format } from "date-fns"

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

    if (loading) return <div>Loading...</div>
    if (!contact) return null

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
                          
                          {contact.notes && (
                               <div className="space-y-2">
                                  <h3 className="text-sm font-medium text-slate-500">Notes</h3>
                                  <div className="bg-slate-50 p-4 rounded-md text-sm whitespace-pre-wrap">
                                      {contact.notes}
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
