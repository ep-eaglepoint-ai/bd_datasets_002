"use client"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { renderMarkdown } from "@/lib/markdown"

interface MarkdownEditorProps {
  value: string
  onChange: (value: string) => void
  label?: string
}

export function MarkdownEditor({ value, onChange, label = "Notes" }: MarkdownEditorProps) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Tabs defaultValue="edit" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="edit">Edit</TabsTrigger>
          <TabsTrigger value="preview">Preview</TabsTrigger>
        </TabsList>
        <TabsContent value="edit">
          <Textarea 
            value={value} 
            onChange={(e) => onChange(e.target.value)} 
            className="min-h-[150px] font-mono text-sm"
            placeholder="Add notes (supports basic markdown like **bold**, - lists, # headers)..."
          />
        </TabsContent>
        <TabsContent value="preview">
          <div className="min-h-[150px] w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm overflow-y-auto prose prose-sm max-w-none">
            {renderMarkdown(value)}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
