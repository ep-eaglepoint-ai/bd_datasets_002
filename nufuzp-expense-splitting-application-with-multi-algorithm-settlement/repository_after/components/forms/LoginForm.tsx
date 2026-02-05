'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { signIn } from 'next-auth/react'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import ErrorAlert from '@/components/ui/ErrorAlert'

export default function LoginForm() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)

    const formData = new FormData(e.currentTarget)
    const email = formData.get('email') as string

    if (!email) {
      setError('Email is required')
      return
    }

    startTransition(async () => {
      try {
        await signIn('resend', { 
          email, 
          callbackUrl: '/dashboard',
          redirect: false 
        })
        router.push('/verify-email')
        router.refresh()
      } catch (err) {
        setError('Failed to send magic link. Please try again.')
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="mt-8 space-y-6">
      {error && <ErrorAlert message={error} onDismiss={() => setError(null)} />}

      <div>
        <label htmlFor="email" className="sr-only">
          Email address
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-black focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm min-h-[44px]"
          placeholder="Email address"
        />
      </div>
      <div>
        <button
          type="submit"
          disabled={isPending}
          className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
        >
          {isPending ? <LoadingSpinner size="sm" /> : 'Send magic link'}
        </button>
      </div>
    </form>
  )
}
