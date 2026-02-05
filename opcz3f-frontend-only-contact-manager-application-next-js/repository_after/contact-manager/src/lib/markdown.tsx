"use client"

import React from "react"

/**
 * Simple markdown parser for rendering basic markdown elements.
 * Supports: headers (#, ##, ###), lists (-), bold (**text**)
 */
export function renderMarkdown(text: string): React.ReactNode {
  if (!text) return <p className="text-slate-400 italic">No notes added.</p>
  
  return text.split('\n').map((line, i) => {
    // Headers
    if (line.startsWith('# ')) return <h1 key={i} className="text-xl font-bold mt-2 mb-1">{line.slice(2)}</h1>
    if (line.startsWith('## ')) return <h2 key={i} className="text-lg font-bold mt-2 mb-1">{line.slice(3)}</h2>
    if (line.startsWith('### ')) return <h3 key={i} className="text-base font-bold mt-2 mb-1">{line.slice(4)}</h3>
    
    // List items
    if (line.trim().startsWith('- ')) return <li key={i} className="ml-4 list-disc">{line.trim().slice(2)}</li>
    
    // Bold
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
