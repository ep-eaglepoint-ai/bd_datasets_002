'use client'

import { useSession } from 'next-auth/react'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function Dashboard() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [timeRange, setTimeRange] = useState('1h')
  const [metrics, setMetrics] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin')
    }
  }, [status, router])

  useEffect(() => {
    if (session?.user?.tenantId) {
      fetchMetrics()
    }
  }, [session, timeRange])

  const fetchMetrics = async () => {
    if (!session?.user?.tenantId) return

    setLoading(true)
    const now = new Date()
    const ranges: Record<string, number> = {
      '1h': 60 * 60 * 1000,
      '24h': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000,
    }
    const from = new Date(now.getTime() - ranges[timeRange]).toISOString()
    const to = now.toISOString()

    try {
      const response = await fetch(
        `/api/metrics?tenantId=${session.user.tenantId}&from=${from}&to=${to}`
      )
      const data = await response.json()
      setMetrics(data)
    } catch (error) {
      console.error('Failed to fetch metrics:', error)
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
            <div className="flex items-center">
              <h1 className="text-xl font-bold">API Usage Monitor</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">{session?.user?.email}</span>
              <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">
                {session?.user?.role}
              </span>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <div className="flex space-x-2">
            {['1h', '24h', '7d'].map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-4 py-2 rounded-lg ${
                  timeRange === range
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-100'
                }`}
              >
                {range}
              </button>
            ))}
          </div>
        </div>

        {metrics && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-sm font-medium text-gray-500">Total Requests</h3>
              <p className="mt-2 text-3xl font-bold">{metrics.total}</p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-sm font-medium text-gray-500">Error Rate</h3>
              <p className="mt-2 text-3xl font-bold">{metrics.errorRate}%</p>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-sm font-medium text-gray-500">Latency (p95)</h3>
              <p className="mt-2 text-3xl font-bold">{metrics.latencyPercentiles.p95}ms</p>
            </div>
          </div>
        )}

        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-lg font-semibold mb-4">Status Breakdown</h2>
          {metrics && (
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>2xx (Success)</span>
                <span className="font-semibold">{metrics.statusBreakdown['2xx']}</span>
              </div>
              <div className="flex justify-between">
                <span>4xx (Client Error)</span>
                <span className="font-semibold">{metrics.statusBreakdown['4xx']}</span>
              </div>
              <div className="flex justify-between">
                <span>5xx (Server Error)</span>
                <span className="font-semibold">{metrics.statusBreakdown['5xx']}</span>
              </div>
            </div>
          )}
        </div>

        <div className="text-center">
          <a
            href="/events"
            className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            View Events
          </a>
        </div>
      </main>
    </div>
  )
}
