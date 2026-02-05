import * as React from "react"
import { X } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

interface TagInputProps {
    value?: string[]
    onChange: (tags: string[]) => void
    placeholder?: string
    suggestions?: string[]
}

export function TagInput({ value = [], onChange, placeholder = "Add tag...", suggestions = [] }: TagInputProps) {
    const [inputValue, setInputValue] = React.useState("")
    const [showSuggestions, setShowSuggestions] = React.useState(false)
    const containerRef = React.useRef<HTMLDivElement>(null)

    const filteredSuggestions = suggestions.filter(
        s => s.toLowerCase().includes(inputValue.toLowerCase()) && !value.includes(s)
    )

    React.useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setShowSuggestions(false)
            }
        }
        document.addEventListener("mousedown", handleClickOutside)
        return () => document.removeEventListener("mousedown", handleClickOutside)
    }, [])

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter" || e.key === ",") {
            e.preventDefault()
            addTag(inputValue)
        } else if (e.key === "Backspace" && !inputValue && value.length > 0) {
            onChange(value.slice(0, -1))
        }
    }

    const addTag = (tag: string) => {
        const newTag = tag.trim()
        if (newTag && !value.includes(newTag)) {
            onChange([...value, newTag])
            setInputValue("")
        }
        setShowSuggestions(false)
    }

    return (
        <div className="relative" ref={containerRef}>
            <div className="flex flex-wrap gap-2 rounded-md border border-slate-200 bg-white p-2 focus-within:ring-2 focus-within:ring-slate-950 focus-within:ring-offset-2">
                {value.map(tag => (
                    <Badge key={tag} variant="secondary" className="gap-1 pr-1">
                        {tag}
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-3 w-3 p-0 hover:bg-transparent"
                            onClick={() => onChange(value.filter(t => t !== tag))}
                        >
                            <X className="h-3 w-3" />
                            <span className="sr-only">Remove {tag}</span>
                        </Button>
                    </Badge>
                ))}
                <input
                    className="flex-1 bg-transparent text-sm outline-none placeholder:text-slate-500 min-w-[120px]"
                    value={inputValue}
                    onChange={(e) => {
                        setInputValue(e.target.value)
                        setShowSuggestions(true)
                    }}
                    onFocus={() => setShowSuggestions(true)}
                    onKeyDown={handleKeyDown}
                    placeholder={placeholder}
                />
            </div>
            {showSuggestions && inputValue && filteredSuggestions.length > 0 && (
                <div className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md border border-slate-200 bg-white py-1 shadow-lg">
                    {filteredSuggestions.map((suggestion) => (
                        <div
                            key={suggestion}
                            className="cursor-pointer px-4 py-2 text-sm hover:bg-slate-100"
                            onClick={() => addTag(suggestion)}
                        >
                            {suggestion}
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
