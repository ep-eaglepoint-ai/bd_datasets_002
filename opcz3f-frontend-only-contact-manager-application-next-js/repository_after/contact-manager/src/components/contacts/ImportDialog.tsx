"use client"

import { useState } from "react"
import { useContactStore } from "@/store"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { parseContactsCSV, parseContactsJSON, findPotentialDuplicates } from "@/lib/import-export"
import { ContactFormData } from "@/types"
import { AlertCircle, CheckCircle, FileUp, AlertTriangle } from "lucide-react"
import { toast } from "sonner"
import { Checkbox } from "@/components/ui/checkbox"

interface ImportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ImportDialog({ open, onOpenChange }: ImportDialogProps) {
  const { contacts, addContact, editContact } = useContactStore()
  const [file, setFile] = useState<File | null>(null)
  const [parsedContacts, setParsedContacts] = useState<ContactFormData[]>([])
  const [duplicates, setDuplicates] = useState<{ newIndex: number, existingId: string, reason: string }[]>([])
  const [step, setStep] = useState<'upload' | 'review'>('upload')
  const [loading, setLoading] = useState(false)
  
  // Conflict resolution state
  // Map of newIndex -> 'create' | 'skip' | 'update'
  const [resolutions, setResolutions] = useState<Record<number, 'create' | 'skip' | 'update'>>({})

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      setFile(e.target.files[0])
    }
  }

  const handleParse = async () => {
    if (!file) return
    setLoading(true)
    try {
      let result: ContactFormData[] = []
      if (file.name.endsWith('.json')) {
        result = await parseContactsJSON(file)
      } else if (file.name.endsWith('.csv')) {
        result = await parseContactsCSV(file)
      } else {
        throw new Error("Unsupported file format")
      }
      
      const dups = findPotentialDuplicates(result, contacts)
      
      setParsedContacts(result)
      setDuplicates(dups)
      
      // Default resolutions: duplicates -> skip, unique -> create
      const initialResolutions: Record<number, 'create' | 'skip' | 'update'> = {}
      result.forEach((_, index) => {
          if (dups.some(d => d.newIndex === index)) {
              initialResolutions[index] = 'skip' 
          } else {
              initialResolutions[index] = 'create'
          }
      })
      setResolutions(initialResolutions)
      
      setStep('review')
    } catch (err: any) {
      toast.error("Failed to parse file: " + err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleImport = async () => {
    setLoading(true)
    let created = 0
    let updated = 0
    let skipped = 0
    
    try {
      const promises = parsedContacts.map(async (contact, index) => {
         const action = resolutions[index]
         
         if (action === 'create') {
             await addContact(contact)
             created++
         } else if (action === 'update') {
             const dup = duplicates.find(d => d.newIndex === index)
             if (dup) {
                 await editContact(dup.existingId, contact)
                 updated++
             }
         } else {
             skipped++
         }
      })
      
      await Promise.all(promises)
      toast.success(`Import complete: ${created} created, ${updated} updated, ${skipped} skipped`)
      onOpenChange(false)
      // Reset
      setStep('upload')
      setFile(null)
      setParsedContacts([])
    } catch (err) {
      toast.error("Error during import")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import Contacts</DialogTitle>
          <DialogDescription>
            Upload a CSV or JSON file to import contacts.
          </DialogDescription>
        </DialogHeader>
        
        {step === 'upload' ? (
            <div className="grid gap-4 py-4">
                <div className="flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-lg p-10 bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer relative">
                    <input 
                        type="file" 
                        accept=".csv,.json" 
                        className="absolute inset-0 opacity-0 cursor-pointer" 
                        onChange={handleFileChange}
                    />
                    <FileUp className="h-10 w-10 text-slate-400 mb-2" />
                    <p className="text-sm font-medium text-slate-900">
                        {file ? file.name : "Click to Upload or Drag File"}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">.csv or .json files</p>
                </div>
                
                {file && (
                     <div className="flex justify-end">
                         <Button onClick={handleParse} disabled={loading}>
                             {loading ? "Analyzing..." : "Review Import"}
                         </Button>
                     </div>
                )}
            </div>
        ) : (
            <div className="space-y-4">
                 <div className="bg-slate-50 p-4 rounded-md border border-slate-200 text-sm">
                     <p>Found <strong>{parsedContacts.length}</strong> contacts.</p>
                     <p className="text-yellow-600 flex items-center gap-1 mt-1">
                        <AlertTriangle className="h-4 w-4" /> 
                        {duplicates.length} potential duplicates detected.
                     </p>
                 </div>

                 <div className="space-y-2 max-h-[300px] overflow-y-auto border rounded-md p-2">
                     {parsedContacts.map((contact, index) => {
                         const dup = duplicates.find(d => d.newIndex === index)
                         return (
                             <div key={index} className={`flex items-center justify-between p-3 rounded border ${dup ? 'border-yellow-200 bg-yellow-50' : 'border-slate-100'}`}>
                                 <div className="flex-1">
                                     <p className="font-medium">{contact.firstName} {contact.lastName || '(No Name)'}</p>
                                     <p className="text-xs text-slate-500">{contact.emails?.[0]?.value || contact.phones?.[0]?.value || '(No contact info)'}</p>
                                     {dup && <p className="text-xs text-yellow-600 mt-1">Duplicate found: {dup.reason}</p>}
                                 </div>
                                 
                                 <div className="flex items-center gap-2">
                                     {dup ? (
                                        <select 
                                            className="text-xs border rounded p-1 bg-white"
                                            value={resolutions[index]}
                                            onChange={(e) => setResolutions(prev => ({ ...prev, [index]: e.target.value as any }))}
                                        >
                                            <option value="skip">Skip</option>
                                            <option value="update">Update Existing</option>
                                            <option value="create">Create Copy</option>
                                        </select>
                                     ) : (
                                         <span className="text-xs text-green-600 flex items-center gap-1">
                                             <CheckCircle className="h-3 w-3" /> New
                                         </span>
                                     )}
                                 </div>
                             </div>
                         )
                     })}
                 </div>
                 
                 <div className="flex justify-between">
                     <Button variant="outline" onClick={() => { setStep('upload'); setFile(null); }}>Back</Button>
                     <Button onClick={handleImport} disabled={loading}>
                         {loading ? "Importing..." : `Import ${Object.values(resolutions).filter(r => r !== 'skip').length} Contacts`}
                     </Button>
                 </div>
            </div>
        )}

      </DialogContent>
    </Dialog>
  )
}
