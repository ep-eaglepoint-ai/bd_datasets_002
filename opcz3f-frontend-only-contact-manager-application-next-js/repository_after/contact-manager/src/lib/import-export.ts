import { Contact, ContactFormData } from "@/types"
import Papa from "papaparse"
import { v4 as uuidv4 } from 'uuid'

export const exportContactsJSON = (contacts: Contact[]) => {
    const dataStr = JSON.stringify(contacts, null, 2)
    const blob = new Blob([dataStr], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `contacts-${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
}

export const exportContactsCSV = (contacts: Contact[]) => {
    // Flatten contact data for CSV
    const flattened = contacts.map(c => ({
        firstName: c.firstName,
        lastName: c.lastName,
        company: c.company,
        jobTitle: c.jobTitle,
        email1: c.emails[0]?.value,
        phone1: c.phones[0]?.value,
        tags: c.tags.join(', '),
        notes: c.notes,
    }))
    const csv = Papa.unparse(flattened)
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `contacts-${new Date().toISOString().split('T')[0]}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
}

export const parseContactsJSON = (file: File): Promise<ContactFormData[]> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = (e) => {
            try {
                const json = JSON.parse(e.target?.result as string)
                // Basic validation/mapping could go here
                resolve(json)
            } catch (err) {
                reject(err)
            }
        }
        reader.readAsText(file)
    })
}

export const parseContactsCSV = (file: File): Promise<ContactFormData[]> => {
    return new Promise((resolve, reject) => {
        Papa.parse(file, {
            header: true,
            complete: (results) => {
                const contacts: ContactFormData[] = results.data.map((row: any) => ({
                    firstName: row.firstName || '',
                    lastName: row.lastName || '',
                    company: row.company || '',
                    jobTitle: row.jobTitle || '',
                    emails: row.email1 ? [{ id: uuidv4(), type: 'work', value: row.email1 }] : [],
                    phones: row.phone1 ? [{ id: uuidv4(), type: 'mobile', value: row.phone1 }] : [],
                    tags: row.tags ? row.tags.split(',').map((t: string) => t.trim()) : [],
                    notes: row.notes || '',
                    isFavorite: false,
                } as any)) 
                
                // Fix the partial map above
                const cleanContacts = contacts.filter(c => c.firstName).map((c: any, index: number) => {
                     const row = results.data[index] as any;
                     return {
                        ...c,
                        emails: c.emails.length ? c.emails : (row.email1 ? [{ id: uuidv4(), type: 'work', value: row.email1 }] : []),
                        phones: c.phones.length ? c.phones : (row.phone1 ? [{ id: uuidv4(), type: 'mobile', value: row.phone1 }] : []),
                    }
                })

                resolve(cleanContacts)
            },
            error: (error) => reject(error)
        })
    })
}
