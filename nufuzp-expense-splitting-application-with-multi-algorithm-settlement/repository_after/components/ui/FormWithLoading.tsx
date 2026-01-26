'use client'

import { useTransition, FormEvent, ReactNode } from 'react'
import LoadingSpinner from './LoadingSpinner'

interface FormWithLoadingProps {
  action: (formData: FormData) => Promise<void>
  children: ReactNode
  className?: string
}

export default function FormWithLoading({
  action,
  children,
  className = '',
}: FormWithLoadingProps) {
  const [isPending, startTransition] = useTransition()

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    startTransition(async () => {
      await action(formData)
    })
  }

  return (
    <form onSubmit={handleSubmit} className={className}>
      {children}
      {isPending && (
        <div className="mt-4 flex items-center justify-center">
          <LoadingSpinner size="md" />
          <span className="ml-2 text-sm text-black">Processing...</span>
        </div>
      )}
    </form>
  )
}
