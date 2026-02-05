"use client"

import { useCallback, useState } from "react"
import { useDropzone } from "react-dropzone"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Upload, X } from "lucide-react"

interface AvatarUploadProps {
  value?: string
  onChange: (value: string) => void
  name: string
}

export function AvatarUpload({ value, onChange, name }: AvatarUploadProps) {
  const [preview, setPreview] = useState(value)

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        const result = reader.result as string
        setPreview(result)
        onChange(result)
      }
      reader.readAsDataURL(file)
    }
  }, [onChange])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': []
    },
    maxFiles: 1,
    multiple: false
  })

  const clearImage = (e: React.MouseEvent) => {
    e.stopPropagation()
    setPreview(undefined)
    onChange("")
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  return (
    <div className="flex flex-col gap-4">
      <Label>Avatar</Label>
      <div className="flex items-center gap-6">
        <div className="relative">
          <Avatar className="h-24 w-24 border-2 border-slate-100">
            <AvatarImage src={preview} />
            <AvatarFallback className="text-xl bg-slate-100 text-slate-500">
              {getInitials(name || "Contact")}
            </AvatarFallback>
          </Avatar>
          {preview && (
            <Button
              size="icon"
              variant="destructive"
              className="absolute -top-2 -right-2 h-6 w-6 rounded-full shadow-md"
              onClick={clearImage}
              type="button"
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>

        <div
          {...getRootProps()}
          className={`
            flex-1 border-2 border-dashed rounded-lg p-4 transition-colors cursor-pointer text-center
            ${isDragActive ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200 hover:bg-slate-50'}
          `}
        >
          <input {...getInputProps()} />
          <div className="flex flex-col items-center gap-1 text-slate-500">
            <Upload className="h-6 w-6 mb-1" />
            <p className="text-sm font-medium text-slate-700">Click to upload or drag and drop</p>
            <p className="text-xs text-slate-400">SVG, PNG, JPG or GIF</p>
          </div>
        </div>
      </div>
    </div>
  )
}
