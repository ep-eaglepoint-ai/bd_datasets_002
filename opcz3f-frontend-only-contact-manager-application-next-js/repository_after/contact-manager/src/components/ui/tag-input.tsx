import * as React from "react"
import { X } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

interface TagInputProps {
    value?: string[]
    onChange: (tags: string[]) => void
    placeholder?: string
}

export function TagInput({ value = [], onChange, placeholder = "Add tag..." }: TagInputProps) {
    const [inputValue, setInputValue] = React.useState("")

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter" || e.key === ",") {
            e.preventDefault()
            const newTag = inputValue.trim()
            if (newTag && !value.includes(newTag)) {
                onChange([...value, newTag])
                setInputValue("")
            }
        } else if (e.key === "Backspace" && !inputValue && value.length > 0) {
            onChange(value.slice(0, -1))
        }
    }

    const removeTag = (tagToRemove: string) => {
        onChange(value.filter(tag => tag !== tagToRemove))
    }

    return (
        <div className="flex flex-wrap gap-2 rounded-md border border-slate-200 bg-white p-2 focus-within:ring-2 focus-within:ring-slate-950 focus-within:ring-offset-2">
            {value.map(tag => (
                <Badge key={tag} variant="secondary" className="gap-1 pr-1">
                    {tag}
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-3 w-3 p-0 hover:bg-transparent"
                        onClick={() => removeTag(tag)}
                    >
                        <X className="h-3 w-3" />
                        <span className="sr-only">Remove {tag}</span>
                    </Button>
                </Badge>
            ))}
            <input
                className="flex-1 bg-transparent text-sm outline-none placeholder:text-slate-500"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
            />
        </div>
    )
}
