import { auth, signOut } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import MobileNav from '@/components/ui/MobileNav'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()

  if (!session) {
    redirect('/login')
  }

  async function handleSignOut() {
    'use server'
    await signOut()
    redirect('/login')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                <Link href="/dashboard" className="text-xl font-bold text-indigo-600">
                  Expense Splitter
                </Link>
              </div>
              <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                <Link
                  href="/dashboard"
                  className="border-indigo-500 text-black inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium min-h-[44px]"
                >
                  Dashboard
                </Link>
                <Link
                  href="/groups"
                  className="border-transparent text-gray-700 hover:border-gray-500 hover:text-black inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium min-h-[44px]"
                >
                  Groups
                </Link>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <MobileNav />
              <span className="hidden sm:block text-sm text-black">
                {session.user?.email}
              </span>
              <form action={handleSignOut}>
                <button
                  type="submit"
                  className="text-gray-700 hover:text-black px-3 py-2 rounded-md text-sm font-medium min-h-[44px] min-w-[44px]"
                >
                  Sign out
                </button>
              </form>
            </div>
          </div>
        </div>
      </nav>
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  )
}
