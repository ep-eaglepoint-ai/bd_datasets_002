'use client'

import { useSession } from 'next-auth/react'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function Events() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [events, setEvents] = useState<any[]>([])
  const [pagination, setPagination] = useState<any>(null)
  const [filters, setFilters] = useState({
    endpoint: '',
    statusGroup: '',
    page: 1,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
    }
  }, [status, router])

  useEffect(() => {
    if (session?.user?.tenantId) {
      fetchEvents()
    }
  }, [session, filters])

  const fetchEvents = async () => {
    if (!session?.user?.tenantId) return

    setLoading(true)
    const params = new URLSearchParams({
      tenantId: session.user.tenantId,
      page: filters.page.toString(),
      pageSize: '20',
    })

    if (filters.endpoint) params.append('endpoint', filters.endpoint)
    if (filters.statusGroup) params.append('statusGroup', filters.statusGroup)

    try {
      const response = await fetch(`/api/events?${params}`)
      const data = await response.json()
      setEvents(data.events || [])
      setPagination(data.pagination)
    } catch (error) {
      console.error('Failed to fetch events:', error)
    } finally {
      setLoading(false)
    }
  }

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center space-x-4">
              <a href="/dashboard" className="text-blue-600 hover:text-blue-800">
                ← Dashboard
              </a>
              <h1 className="text-xl font-bold">API Events</h1>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Filters</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <input
              type="text"
              placeholder="Filter by endpoint"
              value={filters.endpoint}
              onChange={(e) => setFilters({ ...filters, endpoint: e.target.value, page: 1 })}
              className="px-4 py-2 border rounded-lg"
            />
            <select
              value={filters.statusGroup}
              onChange={(e) => setFilters({ ...filters, statusGroup: e.target.value, page: 1 })}
              className="px-4 py-2 border rounded-lg"
            >
              <option value="">All Status Codes</option>
              <option value="2xx">2xx (Success)</option>
              <option value="4xx">4xx (Client Error)</option>
              <option value="5xx">5xx (Server Error)</option>
            </select>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Timestamp
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Endpoint
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Method
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Latency
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {events.map((event) => (
                <tr key={event.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {new Date(event.timestamp).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">{event.endpoint}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">{event.method}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 py-1 text-xs rounded ${
                        event.statusCode < 300
                          ? 'bg-green-100 text-green-800'
                          : event.statusCode < 500
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {event.statusCode}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">{event.latencyMs}ms</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {pagination && (
          <div className="mt-6 flex justify-between items-center">
            <div className="text-sm text-gray-600">
              Page {pagination.page} of {pagination.totalPages} ({pagination.total} total)
            </div>
            <div className="space-x-2">
              <button
                onClick={() => setFilters({ ...filters, page: filters.page - 1 })}
                disabled={filters.page === 1}
                className="px-4 py-2 bg-white border rounded-lg disabled:opacity-50"
              >
                Previous
              </button>
              <button
                onClick={() => setFilters({ ...filters, page: filters.page + 1 })}
                disabled={filters.page >= pagination.totalPages}
                className="px-4 py-2 bg-white border rounded-lg disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
