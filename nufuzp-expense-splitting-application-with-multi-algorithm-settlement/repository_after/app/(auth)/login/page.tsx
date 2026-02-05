import LoginForm from '@/components/forms/LoginForm'
import ErrorAlert from '@/components/ui/ErrorAlert'
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const session = await auth()
  if (session) {
    redirect('/dashboard')
  }

  const search = await searchParams

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-black">
            Sign in to Expense Splitter
          </h2>
          <p className="mt-2 text-center text-sm text-gray-800">
            Enter your email to receive a magic link
          </p>
        </div>
        {search.error && (
          <div>
            <ErrorAlert message={search.error} />
          </div>
        )}
        <LoginForm />
      </div>
    </div>
  )
}
