'use client'

import { useState, useTransition, FormEvent, ReactNode } from 'react'
import LoadingSpinner from './LoadingSpinner'
import ErrorAlert from './ErrorAlert'

interface FormWithLoadingProps {
  action: (formData: FormData) => Promise<void>
  children: ReactNode
  className?: string
}

/**
 * Shared form wrapper: loading state (spinner) and error handling (ErrorAlert).
 * Use for forms that submit FormData; action errors are caught and displayed.
 */
export default function FormWithLoading({
  action,
  children,
  className = '',
}: FormWithLoadingProps) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    const formData = new FormData(e.currentTarget)
    startTransition(async () => {
      try {
        await action(formData)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Something went wrong')
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className={className}>
      {error && <ErrorAlert message={error} onDismiss={() => setError(null)} />}
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
