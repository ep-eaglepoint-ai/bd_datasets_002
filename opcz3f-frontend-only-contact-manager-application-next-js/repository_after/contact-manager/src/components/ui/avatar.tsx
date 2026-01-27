import * as React from "react"
import { cn } from "@/lib/utils"

interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
    src?: string
    alt?: string
    fallback: string
}

export function Avatar({ src, alt, fallback, className, ...props }: AvatarProps) {
    const [imageError, setImageError] = React.useState(false)

    return (
        <div className={cn("relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full", className)} {...props}>
            {src && !imageError ? (
                <img
                    src={src}
                    alt={alt}
                    className="aspect-square h-full w-full object-cover"
                    onError={() => setImageError(true)}
                />
            ) : (
                <div className="flex h-full w-full items-center justify-center rounded-full bg-slate-100 text-slate-500 font-medium">
                    {fallback.substring(0, 2).toUpperCase()}
                </div>
            )}
        </div>
    )
}
