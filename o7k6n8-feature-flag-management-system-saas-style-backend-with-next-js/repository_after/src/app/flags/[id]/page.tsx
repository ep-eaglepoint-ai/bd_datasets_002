'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';

interface Flag {
  id: string;
  key: string;
  description: string;
  enabled: boolean;
  rolloutPercentage: number;
  overrides: Array<{
    id: string;
    user: { id: string; email: string };
    enabled: boolean;
  }>;
}

export default function FlagDetailPage() {
  const [flag, setFlag] = useState<Flag | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({
    description: '',
    enabled: false,
    rolloutPercentage: 0,
  });
  const router = useRouter();
  const params = useParams();

  useEffect(() => {
    if (params.id) {
      fetchFlag();
    }
  }, [params.id]);

  const fetchFlag = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        router.push('/login');
        return;
      }

      const response = await fetch(`/api/flags/${params.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setFlag(data.flag);
        setFormData({
          description: data.flag.description,
          enabled: data.flag.enabled,
          rolloutPercentage: data.flag.rolloutPercentage,
        });
      } else if (response.status === 401) {
        router.push('/login');
      } else {
        setError('Failed to fetch flag');
      }
    } catch (err) {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/flags/${params.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        setEditing(false);
        fetchFlag();
      } else {
        setError('Failed to update flag');
      }
    } catch (err) {
      setError('Network error');
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this flag?')) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/flags/${params.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        router.push('/flags');
      } else {
        setError('Failed to delete flag');
      }
    } catch (err) {
      setError('Network error');
    }
  };

  if (loading) return <div className="p-4">Loading...</div>;
  if (error) return <div className="p-4 text-red-600">{error}</div>;
  if (!flag) return <div className="p-4">Flag not found</div>;

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link href="/flags" className="text-gray-700 hover:text-gray-900">
                ← Back to Flags
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="bg-white shadow overflow-hidden sm:rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                Flag Details: {flag.key}
              </h3>

              {editing ? (
                <form onSubmit={handleUpdate} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Description
                    </label>
                    <input
                      type="text"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm"
                      required
                    />
                  </div>
                  <div>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.enabled}
                        onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
                        className="rounded"
                      />
                      <span className="ml-2 text-sm font-medium text-gray-700">Enabled</span>
                    </label>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Rollout Percentage (0-100)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={formData.rolloutPercentage}
                      onChange={(e) => setFormData({ ...formData, rolloutPercentage: parseInt(e.target.value) })}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm"
                    />
                  </div>
                  <div className="flex space-x-2">
                    <button
                      type="submit"
                      className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700"
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditing(false)}
                      className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              ) : (
                <div className="space-y-4">
                  <div>
                    <span className="font-medium">Key:</span> {flag.key}
                  </div>
                  <div>
                    <span className="font-medium">Description:</span> {flag.description}
                  </div>
                  <div>
                    <span className="font-medium">Enabled:</span> {flag.enabled ? 'Yes' : 'No'}
                  </div>
                  <div>
                    <span className="font-medium">Rollout Percentage:</span> {flag.rolloutPercentage}%
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => setEditing(true)}
                      className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700"
                    >
                      Edit
                    </button>
                    <button
                      onClick={handleDelete}
                      className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="mt-8 bg-white shadow overflow-hidden sm:rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h4 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                User Overrides
              </h4>
              <Link
                href={`/flags/${flag.id}/overrides/new`}
                className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 inline-block mb-4"
              >
                Add Override
              </Link>
              <ul className="divide-y divide-gray-200">
                {flag.overrides.map((override) => (
                  <li key={override.id} className="py-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {override.user.email}
                        </div>
                        <div className="text-sm text-gray-500">
                          Override: {override.enabled ? 'Enabled' : 'Disabled'}
                        </div>
                      </div>
                      <button
                        onClick={() => handleDeleteOverride(override.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        Remove
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </main>
    </div>
  );

  async function handleDeleteOverride(overrideId: string) {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/flags/${params.id}/overrides/${overrideId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        fetchFlag();
      } else {
        setError('Failed to delete override');
      }
    } catch (err) {
      setError('Network error');
    }
  }
}