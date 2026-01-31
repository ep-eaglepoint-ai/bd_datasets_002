'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';

interface User {
  id: string;
  email: string;
  role: 'ADMIN' | 'USER';
  createdAt: string;
}

interface UserOverride {
  id: string;
  enabled: boolean;
  flag: {
    id: string;
    key: string;
    description: string;
    enabled: boolean;
    rolloutPercentage: number;
  };
}

export default function UserDetailPage() {
  const [user, setUser] = useState<User | null>(null);
  const [overrides, setOverrides] = useState<UserOverride[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const router = useRouter();
  const params = useParams();

  useEffect(() => {
    if (params.id) {
      fetchUser();
    }
  }, [params.id]);

  const fetchUser = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        router.push('/login');
        return;
      }

      const response = await fetch(`/api/users/${params.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
        setOverrides(data.overrides || []);
      } else if (response.status === 401) {
        router.push('/login');
      } else if (response.status === 404) {
        setError('User not found');
      } else {
        setError('Failed to fetch user');
      }
    } catch (err) {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="p-4">Loading...</div>;
  if (error) return <div className="p-4 text-red-600">{error}</div>;
  if (!user) return <div className="p-4">User not found</div>;

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link href="/users" className="text-gray-700 hover:text-gray-900 mr-4">
                Users
              </Link>
              <span className="text-gray-900 font-medium">{user.email}</span>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* User Info */}
        <div className="bg-white shadow overflow-hidden sm:rounded-lg mb-8">
          <div className="px-4 py-5 sm:px-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900">User Details</h3>
          </div>
          <div className="border-t border-gray-200 px-4 py-5 sm:p-6">
            <dl className="grid grid-cols-1 gap-x-4 gap-y-8 sm:grid-cols-2">
              <div className="sm:col-span-1">
                <dt className="text-sm font-medium text-gray-500">Email</dt>
                <dd className="mt-1 text-sm text-gray-900">{user.email}</dd>
              </div>
              <div className="sm:col-span-1">
                <dt className="text-sm font-medium text-gray-500">Role</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    user.role === 'ADMIN' ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-800'
                  }`}>
                    {user.role}
                  </span>
                </dd>
              </div>
              <div className="sm:col-span-1">
                <dt className="text-sm font-medium text-gray-500">Created</dt>
                <dd className="mt-1 text-sm text-gray-900">{new Date(user.createdAt).toLocaleString()}</dd>
              </div>
              <div className="sm:col-span-1">
                <dt className="text-sm font-medium text-gray-500">ID</dt>
                <dd className="mt-1 text-sm text-gray-900 font-mono">{user.id}</dd>
              </div>
            </dl>
          </div>
        </div>

        {/* User Overrides */}
        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          <div className="px-4 py-5 sm:px-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900">Feature Flag Overrides</h3>
            <p className="mt-1 max-w-2xl text-sm text-gray-500">
              {overrides.length} override(s)
            </p>
          </div>

          {overrides.length === 0 ? (
            <div className="border-t border-gray-200 px-4 py-5 sm:p-6">
              <p className="text-gray-500">This user has no feature flag overrides.</p>
            </div>
          ) : (
            <div className="border-t border-gray-200">
              <ul className="divide-y divide-gray-200">
                {overrides.map((override) => (
                  <li key={override.id} className="px-4 py-4 sm:px-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <Link href={`/flags/${override.flag.id}`} className="text-indigo-600 hover:text-indigo-900 font-medium">
                          {override.flag.key}
                        </Link>
                        <span className={`ml-3 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          override.enabled ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {override.enabled ? 'Enabled' : 'Disabled'}
                        </span>
                      </div>
                      <div className="text-sm text-gray-500">
                        Rollout: {override.flag.rolloutPercentage}%
                      </div>
                    </div>
                    <div className="mt-2 text-sm text-gray-500">
                      {override.flag.description}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
