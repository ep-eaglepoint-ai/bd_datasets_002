"use client"

import { useFieldArray, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { contactSchema, type ContactSchema } from "@/lib/validations"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { TagInput } from "@/components/ui/tag-input"
import { Plus, Trash2, Save, Copy, PlusCircle } from "lucide-react"
import { useRouter } from "next/navigation"
import { useContactStore } from "@/store"
import { toast } from "sonner"
import { Label } from "@/components/ui/label"
import { useEffect, useMemo } from "react"
import { AvatarUpload } from "@/components/ui/avatar-upload"
import { MarkdownEditor } from "@/components/ui/markdown-editor"

interface ContactFormProps {
    initialData?: any
    contactId?: string // If present, it's edit mode
}

export function ContactForm({ initialData, contactId }: ContactFormProps) {
    const router = useRouter()
    const { addContact, editContact, contacts } = useContactStore()
    
    // Derived existing tags for autocomplete
    const existingTags = useMemo(() => {
        const tags = new Set<string>()
        contacts.forEach(c => c.tags.forEach(t => tags.add(t)))
        return Array.from(tags)
    }, [contacts])

    const defaultValues: Partial<ContactSchema> = {
        firstName: "",
        lastName: "",
        company: "",
        jobTitle: "",
        emails: [{ type: "home", value: "", id: crypto.randomUUID() }],
        phones: [{ type: "mobile", value: "", id: crypto.randomUUID() }],
        address: { street: "", city: "", state: "", zip: "", country: "" },
        tags: [],
        notes: "",
        avatarUrl: "",
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

    const handleCancel = () => {
        if (form.formState.isDirty) {
            if (confirm("You have unsaved changes. Are you sure you want to discard them?")) {
                router.push("/contacts")
            }
        } else {
            router.push("/contacts")
        }
    }

    const onSubmit = async (data: ContactSchema, shouldDuplicate = false) => {
        try {
            if (contactId && !shouldDuplicate) {
                await editContact(contactId, data)
                toast.success("Contact updated successfully")
                router.push("/contacts")
                router.refresh()
            } else {
                await addContact(data)
                toast.success(shouldDuplicate ? "Contact duplicated successfully" : "Contact created successfully")
                if (!shouldDuplicate) {
                    router.push("/contacts")
                    router.refresh()
                } else {
                    // Reset form but keep data for a new entry if technically "duplicating" usually implies creating a copy.
                    // But typically "Save & Duplicate" means save this one and open a new form with same data?
                    // Or "Duplicate" button in edit mode?
                    // Requirement: "support duplicating contacts". Usually a "Clone" action.
                    // The "Save & Duplicate" might mean "Save this and create another copy immediately".
                    // Let's implement "Save" (standard) and "Save & Create Another" or pure "Clone" action?
                    // "support duplicating contacts" -> Likely a button to clone existing.
                    
                    // If creating new: "Save & Create Another"
                    // If editing: "Clone"
                    
                    if (shouldDuplicate) {
                         // We saved the first one. Now we are technically on a "new" form with same data?
                         // Or user stays on page?
                         // If we are cloning, we probably want to redirect to the new contact or stay here.
                         // Let's assume "Save & Duplicate" creates the record and then redirects to the create page prefilled?
                         // Actually simplest is: Save current, then navigate to /contacts/new with data passed?
                         // Or just add 2 contacts?
                         
                         // Let's implement independent "Duplicate" button logic for EDIT mode.
                         // For CREATE mode: "Save & Add Another"
                    }
                }
            }
        } catch (error) {
            toast.error("Failed to save contact")
            console.error(error)
        }
    }
    
    const handleDuplicate = async () => {
        const data = form.getValues()
        // Create a copy
        try {
            await addContact({ ...data, firstName: `${data.firstName} (Copy)` })
            toast.success("Contact duplicated successfully")
            router.push("/contacts")
        } catch (err) {
             toast.error("Failed to duplicate contact")
        }
    }

    const handleSaveAndAddAnother = async () => {
        const isValid = await form.trigger()
        if (!isValid) return
        
        const data = form.getValues()
        try {
            await addContact(data)
            toast.success("Contact saved! You can add another.")
            // Reset form for a new contact
            form.reset({
                firstName: "",
                lastName: "",
                company: "",
                jobTitle: "",
                emails: [{ type: "home", value: "", id: crypto.randomUUID() }],
                phones: [{ type: "mobile", value: "", id: crypto.randomUUID() }],
                address: { street: "", city: "", state: "", zip: "", country: "" },
                tags: [],
                notes: "",
                avatarUrl: "",
                isFavorite: false,
            })
        } catch (err) {
            toast.error("Failed to save contact")
        }
    }

    return (
        <form onSubmit={form.handleSubmit((d) => onSubmit(d, false))} className="space-y-8 max-w-4xl mx-auto bg-white p-6 rounded-lg shadow-sm border border-slate-200">
            <div className="flex items-center justify-between flex-wrap gap-4">
                <h2 className="text-2xl font-bold tracking-tight">{contactId ? "Edit Contact" : "Create Contact"}</h2>
                <div className="flex gap-2 flex-wrap">
                    <Button variant="outline" type="button" onClick={handleCancel}>Cancel</Button>
                    
                    {contactId && (
                         <Button variant="outline" type="button" onClick={handleDuplicate}>
                            <Copy className="mr-2 h-4 w-4" /> Clone
                        </Button>
                    )}

                    {!contactId && (
                        <Button variant="outline" type="button" onClick={handleSaveAndAddAnother} disabled={form.formState.isSubmitting}>
                            <PlusCircle className="mr-2 h-4 w-4" /> Save & Add Another
                        </Button>
                    )}
                    
                    <Button type="submit" disabled={form.formState.isSubmitting}>
                        <Save className="mr-2 h-4 w-4" />
                        {contactId ? "Update Contact" : "Save Contact"}
                    </Button>
                </div>
            </div>

            {/* Avatar Upload */}
            <div className="bg-slate-50 p-6 rounded-lg border border-slate-100">
                <AvatarUpload 
                    name={`${form.watch("firstName")} ${form.watch("lastName")}`}
                    value={form.watch("avatarUrl")}
                    onChange={(val) => form.setValue("avatarUrl", val, { shouldDirty: true })}
                />
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

            {/* Address Section */}
             <div className="space-y-4 pt-4 border-t border-slate-100">
                <h3 className="text-lg font-medium">Address</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label>Street</Label>
                        <Input {...form.register("address.street")} placeholder="123 Main St" />
                    </div>
                    <div className="space-y-2">
                        <Label>City</Label>
                        <Input {...form.register("address.city")} placeholder="New York" />
                    </div>
                    <div className="space-y-2">
                        <Label>State</Label>
                        <Input {...form.register("address.state")} placeholder="NY" />
                    </div>
                     <div className="space-y-2">
                        <Label>Zip Code</Label>
                        <Input {...form.register("address.zip")} placeholder="10001" />
                    </div>
                     <div className="space-y-2 md:col-span-2">
                        <Label>Country</Label>
                        <Input {...form.register("address.country")} placeholder="USA" />
                    </div>
                </div>
            </div>

             <div className="space-y-4 pt-4 border-t border-slate-100">
                <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                        <Label className="text-base">Emails</Label>
                        <p className="text-sm text-slate-500">Add multiple email addresses</p>
                    </div>
                    <Button type="button" variant="outline" size="sm" onClick={() => appendEmail({ type: 'work', value: '', id: crypto.randomUUID() })}>
                        <Plus className="h-4 w-4 mr-1" /> Add Email
                    </Button>
                </div>
                {emailFields.map((field, index) => (
                    <div key={field.id} className="grid grid-cols-[100px_1fr_40px] gap-2 items-start">
                        <Input {...form.register(`emails.${index}.type`)} placeholder="Type" />
                        <div className="space-y-1">
                            <Input 
                                className={`${form.formState.errors.emails?.[index]?.value ? 'border-red-500 focus-visible:ring-red-500' : ''}`} 
                                {...form.register(`emails.${index}.value`)} 
                                placeholder="email@example.com" 
                            />
                            {form.formState.errors.emails?.[index]?.value && (
                                <p className="text-xs text-red-500">{form.formState.errors.emails[index]?.value?.message}</p>
                            )}
                        </div>
                         <Button type="button" variant="ghost" size="icon" onClick={() => removeEmail(index)}>
                            <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                    </div>
                ))}
            </div>

            <div className="space-y-4">
                 <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                        <Label className="text-base">Phone Numbers</Label>
                        <p className="text-sm text-slate-500">Add multiple phone numbers</p>
                    </div>
                    <Button type="button" variant="outline" size="sm" onClick={() => appendPhone({ type: 'mobile', value: '', id: crypto.randomUUID() })}>
                        <Plus className="h-4 w-4 mr-1" /> Add Phone
                    </Button>
                </div>
                {phoneFields.map((field, index) => (
                    <div key={field.id} className="grid grid-cols-[100px_1fr_40px] gap-2 items-start">
                        <Input {...form.register(`phones.${index}.type`)} placeholder="Type" />
                        <div className="space-y-1">
                            <Input 
                                className={`${form.formState.errors.phones?.[index]?.value ? 'border-red-500 focus-visible:ring-red-500' : ''}`} 
                                {...form.register(`phones.${index}.value`)} 
                                placeholder="+1 234 567 8900" 
                            />
                             {form.formState.errors.phones?.[index]?.value && (
                                <p className="text-xs text-red-500">{form.formState.errors.phones[index]?.value?.message}</p>
                            )}
                        </div>
                         <Button type="button" variant="ghost" size="icon" onClick={() => removePhone(index)}>
                            <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                    </div>
                ))}
            </div>

            <div className="space-y-2 pt-4 border-t border-slate-100">
                 <Label>Tags</Label>
                 <TagInput 
                    value={form.watch("tags")} 
                    onChange={(tags) => form.setValue("tags", tags, { shouldDirty: true })} 
                    placeholder="Type and press Enter..."
                    suggestions={existingTags}
                 />
                 <p className="text-xs text-slate-500">Press Enter or keys like comma to add tags.</p>
            </div>
            
            <div className="space-y-2 pt-4">
                 <MarkdownEditor 
                     label="Notes (Markdown Supported)"
                     value={form.watch("notes") || ""}
                     onChange={(val) => form.setValue("notes", val, { shouldDirty: true })}
                 />
            </div>
        </form>
    )
}
