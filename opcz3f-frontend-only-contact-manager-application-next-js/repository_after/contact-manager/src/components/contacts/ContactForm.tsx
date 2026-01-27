"use client"

import { useFieldArray, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { contactSchema, type ContactSchema } from "@/lib/validations"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { TagInput } from "@/components/ui/tag-input"
import { Plus, Trash2, Save, X } from "lucide-react"
import { useRouter } from "next/navigation"
import { useContactStore } from "@/store"
import { toast } from "sonner"
import { Label } from "@/components/ui/label"
import { useEffect } from "react"
import Link from "next/link"

interface ContactFormProps {
    initialData?: any
    contactId?: string // If present, it's edit mode
}

export function ContactForm({ initialData, contactId }: ContactFormProps) {
    const router = useRouter()
    const { addContact, editContact } = useContactStore()
    
    const defaultValues: Partial<ContactSchema> = {
        firstName: "",
        lastName: "",
        company: "",
        jobTitle: "",
        emails: [{ type: "home", value: "", id: crypto.randomUUID() }],
        phones: [{ type: "mobile", value: "", id: crypto.randomUUID() }],
        tags: [],
        notes: "",
        isFavorite: false,
        ...initialData,
    }

    const form = useForm<ContactSchema>({
        resolver: zodResolver(contactSchema),
        defaultValues,
    })

    const { fields: emailFields, append: appendEmail, remove: removeEmail } = useFieldArray({
        control: form.control,
        name: "emails",
    })

    const { fields: phoneFields, append: appendPhone, remove: removePhone } = useFieldArray({
        control: form.control,
        name: "phones",
    })

    // Warn about unsaved changes
    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (form.formState.isDirty) {
                e.preventDefault()
                e.returnValue = ''
            }
        }
        window.addEventListener('beforeunload', handleBeforeUnload)
        return () => window.removeEventListener('beforeunload', handleBeforeUnload)
    }, [form.formState.isDirty])

    const onSubmit = async (data: ContactSchema) => {
        try {
            if (contactId) {
                await editContact(contactId, data)
                toast.success("Contact updated successfully")
            } else {
                await addContact(data)
                toast.success("Contact created successfully")
            }
            router.push("/contacts")
            router.refresh()
        } catch (error) {
            toast.error("Failed to save contact")
            console.error(error)
        }
    }

    return (
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 max-w-3xl mx-auto bg-white p-6 rounded-lg shadow-sm border border-slate-200">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold tracking-tight">{contactId ? "Edit Contact" : "Create Contact"}</h2>
                <div className="space-x-2">
                    <Link href="/contacts">
                         <Button variant="outline" type="button">Cancel</Button>
                    </Link>
                    <Button type="submit" disabled={form.formState.isSubmitting}>
                        <Save className="mr-2 h-4 w-4" />
                        Save Contact
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div className="space-y-2">
                    <Label htmlFor="firstName">First Name</Label>
                    <Input id="firstName" {...form.register("firstName")} placeholder="Jane" />
                    {form.formState.errors.firstName && <p className="text-sm text-red-500">{form.formState.errors.firstName.message}</p>}
                </div>
                <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input id="lastName" {...form.register("lastName")} placeholder="Doe" />
                    {form.formState.errors.lastName && <p className="text-sm text-red-500">{form.formState.errors.lastName.message}</p>}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div className="space-y-2">
                    <Label htmlFor="company">Company</Label>
                    <Input id="company" {...form.register("company")} placeholder="Acme Inc." />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="jobTitle">Job Title</Label>
                    <Input id="jobTitle" {...form.register("jobTitle")} placeholder="Product Manager" />
                </div>
            </div>

             <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <Label>Emails</Label>
                    <Button type="button" variant="outline" size="sm" onClick={() => appendEmail({ type: 'work', value: '', id: crypto.randomUUID() })}>
                        <Plus className="h-4 w-4 mr-1" /> Add Email
                    </Button>
                </div>
                {emailFields.map((field, index) => (
                    <div key={field.id} className="space-y-1">
                         <div className="flex gap-2">
                            <Input className="w-24" {...form.register(`emails.${index}.type`)} placeholder="Type" />
                            <Input className={`flex-1 ${form.formState.errors.emails?.[index]?.value ? 'border-red-500 focus-visible:ring-red-500' : ''}`} {...form.register(`emails.${index}.value`)} placeholder="email@example.com" />
                             <Button type="button" variant="ghost" size="icon" onClick={() => removeEmail(index)}>
                                <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                        </div>
                        {form.formState.errors.emails?.[index]?.value && (
                            <p className="text-xs text-red-500">{form.formState.errors.emails[index]?.value?.message}</p>
                        )}
                    </div>
                ))}
                 {form.formState.errors.emails && <p className="text-sm text-red-500">{form.formState.errors.emails.root?.message || form.formState.errors.emails.message}</p>}
            </div>

            <div className="space-y-4">
                 <div className="flex items-center justify-between">
                    <Label>Phone Numbers</Label>
                    <Button type="button" variant="outline" size="sm" onClick={() => appendPhone({ type: 'mobile', value: '', id: crypto.randomUUID() })}>
                        <Plus className="h-4 w-4 mr-1" /> Add Phone
                    </Button>
                </div>
                {phoneFields.map((field, index) => (
                    <div key={field.id} className="space-y-1">
                        <div className="flex gap-2">
                            <Input className="w-24" {...form.register(`phones.${index}.type`)} placeholder="Type" />
                            <Input className={`flex-1 ${form.formState.errors.phones?.[index]?.value ? 'border-red-500 focus-visible:ring-red-500' : ''}`} {...form.register(`phones.${index}.value`)} placeholder="+1 234 567 8900" />
                             <Button type="button" variant="ghost" size="icon" onClick={() => removePhone(index)}>
                                <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                        </div>
                         {form.formState.errors.phones?.[index]?.value && (
                            <p className="text-xs text-red-500">{form.formState.errors.phones[index]?.value?.message}</p>
                        )}
                    </div>
                ))}
            </div>

            <div className="space-y-2">
                 <Label>Tags</Label>
                 <TagInput 
                    value={form.watch("tags")} 
                    onChange={(tags) => form.setValue("tags", tags)} 
                    placeholder="Type and press Enter..."
                 />
            </div>
            
             <div className="space-y-2">
                    <Label htmlFor="notes">Notes</Label>
                    <textarea 
                        id="notes" 
                        {...form.register("notes")} 
                        className="flex min-h-[80px] w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        placeholder="Add some notes..."
                    />
            </div>
        </form>
    )
}
