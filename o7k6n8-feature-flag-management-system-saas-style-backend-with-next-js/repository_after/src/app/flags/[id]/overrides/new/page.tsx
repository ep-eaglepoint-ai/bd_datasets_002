'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';

interface User {
  id: string;
  email: string;
  role: string;
}

interface Flag {
  id: string;
  key: string;
  description: string;
  enabled: boolean;
  rolloutPercentage: number;
}

export default function NewOverridePage() {
  const [users, setUsers] = useState<User[]>([]);
  const [flag, setFlag] = useState<Flag | null>(null);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [enabled, setEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  const params = useParams();

  useEffect(() => {
    if (params.id) {
      fetchData();
    }
  }, [params.id]);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        router.push('/login');
        return;
      }

      // Fetch flag details
      const flagResponse = await fetch(`/api/flags/${params.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (flagResponse.ok) {
        const data = await flagResponse.json();
        setFlag(data.flag);
      }

      // Fetch users
      const usersResponse = await fetch('/api/users', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (usersResponse.ok) {
        const data = await usersResponse.json();
        setUsers(data.users);
      }
    } catch (err) {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/flags/${params.id}/overrides`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ userId: selectedUserId, enabled }),
      });

      if (response.ok) {
        router.push(`/flags/${params.id}`);
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to create override');
      }
    } catch (err) {
      setError('Network error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-4">Loading...</div>;
  if (error && !saving) return <div className="p-4 text-red-600">{error}</div>;

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link href="/flags" className="text-gray-700 hover:text-gray-900 mr-4">
                Flags
              </Link>
              <Link href={`/flags/${params.id}`} className="text-gray-700 hover:text-gray-900">
                Back to Flag
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white shadow sm:rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              Create User Override
            </h3>
            {flag && (
              <p className="mt-1 text-sm text-gray-500">
                For flag: <span className="font-medium">{flag.key}</span>
              </p>
            )}
          </div>

          <div className="border-t border-gray-200 px-4 py-5 sm:p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="user" className="block text-sm font-medium text-gray-700">
                  User
                </label>
                <select
                  id="user"
                  className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md border"
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                  required
                >
                  <option value="">Select a user</option>
                  {users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.email} ({user.role})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Enabled</label>
                <div className="mt-2">
                  <label className="inline-flex items-center">
                    <input
                      type="radio"
                      className="form-radio h-4 w-4 text-indigo-600"
                      checked={enabled}
                      onChange={() => setEnabled(true)}
                    />
                    <span className="ml-2">True</span>
                  </label>
                  <label className="inline-flex items-center ml-6">
                    <input
                      type="radio"
                      className="form-radio h-4 w-4 text-indigo-600"
                      checked={!enabled}
                      onChange={() => setEnabled(false)}
                    />
                    <span className="ml-2">False</span>
                  </label>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => router.push(`/flags/${params.id}`)}
                  className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 mr-3"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving || !selectedUserId}
                  className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Create Override'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
