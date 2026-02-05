import { ContactForm } from "@/components/contacts/ContactForm"

export default function NewContactPage() {
    return (
        <div className="space-y-6">
             <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold tracking-tight">New Contact</h1>
             </div>
             <ContactForm />
        </div>
    )
}
