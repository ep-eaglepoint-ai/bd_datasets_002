"use client"

import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"

interface MarkdownEditorProps {
  value: string
  onChange: (value: string) => void
  label?: string
}

export function MarkdownEditor({ value, onChange, label = "Notes" }: MarkdownEditorProps) {
  // Simple markdown parser for preview
  const renderMarkdown = (text: string) => {
    if (!text) return <p className="text-slate-400 italic">No notes added.</p>
    
    return text.split('\n').map((line, i) => {
      // Headers
      if (line.startsWith('# ')) return <h1 key={i} className="text-xl font-bold mt-2 mb-1">{line.slice(2)}</h1>
      if (line.startsWith('## ')) return <h2 key={i} className="text-lg font-bold mt-2 mb-1">{line.slice(3)}</h2>
      if (line.startsWith('### ')) return <h3 key={i} className="text-base font-bold mt-2 mb-1">{line.slice(4)}</h3>
      
      // List items
      if (line.trim().startsWith('- ')) return <li key={i} className="ml-4 list-disc">{line.trim().slice(2)}</li>
      
      // Bold
      // Note: This is a very basic replacement for display purposes
      const parts = line.split(/(\*\*.*?\*\*)/g)
      return (
        <p key={i} className="min-h-[1.5rem] mb-1">
          {parts.map((part, j) => {
            if (part.startsWith('**') && part.endsWith('**')) {
              return <strong key={j}>{part.slice(2, -2)}</strong>
            }
            return part
          })}
        </p>
      )
    })
  }

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
