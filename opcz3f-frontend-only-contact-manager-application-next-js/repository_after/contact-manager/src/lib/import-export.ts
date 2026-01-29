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
    // Use | as delimiter for multiple values
    const flattened = contacts.map(c => ({
        firstName: c.firstName,
        lastName: c.lastName,
        company: c.company,
        jobTitle: c.jobTitle,
        email: c.emails.map(e => e.value).join(' | '),
        phone: c.phones.map(p => p.value).join(' | '),
        tags: c.tags.join(' | '),
        notes: c.notes,
        street: c.address?.street,
        city: c.address?.city,
        state: c.address?.state,
        zip: c.address?.zip,
        country: c.address?.country,
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
            skipEmptyLines: true,
            complete: (results) => {
                try {
                    const contacts: ContactFormData[] = results.data.map((row: any) => {
                       // Handle multiple emails/phones split by | or ,
                       const parseMulti = (val: string) => val ? val.split(/[|,]/).map(s => s.trim()).filter(Boolean) : []
                       
                       const emails = parseMulti(row.email || row.emails || row.email1).map(val => ({ id: uuidv4(), type: 'work', value: val }))
                       const phones = parseMulti(row.phone || row.phones || row.phone1).map(val => ({ id: uuidv4(), type: 'mobile', value: val }))
                       const tags = parseMulti(row.tags)

                       return {
                            firstName: row.firstName || '',
                            lastName: row.lastName || '',
                            company: row.company || '',
                            jobTitle: row.jobTitle || '',
                            emails,
                            phones,
                            tags,
                            notes: row.notes || '',
                            address: {
                                street: row.street || '',
                                city: row.city || '',
                                state: row.state || '',
                                zip: row.zip || '',
                                country: row.country || ''
                            },
                            avatarUrl: '',
                            isFavorite: false,
                        }
                    })
                    
                    resolve(contacts.filter(c => c.firstName || c.lastName || c.company)) // Filter completely empty rows
                } catch (err) {
                    reject(err)
                }
            },
            error: (error) => reject(error)
        })
    })
}

export function findPotentialDuplicates(newContacts: ContactFormData[], existingContacts: Contact[]) {
    const duplicates: { newIndex: number, existingId: string, reason: string }[] = []
    
    newContacts.forEach((newC, index) => {
        // Check exact email match
        const emailMatch = existingContacts.find(ex => 
            ex.emails.some(ee => newC.emails?.some(ne => ne.value === ee.value))
        )
        if (emailMatch) {
            duplicates.push({ newIndex: index, existingId: emailMatch.id, reason: 'Email match' })
            return
        }

        // Check phone match
        const phoneMatch = existingContacts.find(ex => 
            ex.phones.some(ep => newC.phones?.some(np => np.value === ep.value))
        )
        if (phoneMatch) {
            duplicates.push({ newIndex: index, existingId: phoneMatch.id, reason: 'Phone match' })
            return
        }
        
        // Check name match
        const nameMatch = existingContacts.find(ex => 
             ex.firstName.toLowerCase() === newC.firstName?.toLowerCase() &&
             ex.lastName.toLowerCase() === newC.lastName?.toLowerCase()
        )
        if (nameMatch && (newC.firstName || newC.lastName)) {
             duplicates.push({ newIndex: index, existingId: nameMatch.id, reason: 'Name match' })
        }
    })
    
    return duplicates
}
