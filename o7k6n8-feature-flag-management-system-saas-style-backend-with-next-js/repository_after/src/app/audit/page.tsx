'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface AuditLog {
  id: string;
  userId: string;
  flagId: string;
  action: string;
  oldValue: any;
  newValue: any;
  timestamp: string;
  user: {
    id: string;
    email: string;
  };
  flag: {
    id: string;
    key: string;
  };
}

export default function AuditPage() {
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [total, setTotal] = useState(0);
  const router = useRouter();

  useEffect(() => {
    fetchAuditLogs();
  }, []);

  const fetchAuditLogs = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        router.push('/login');
        return;
      }

      const response = await fetch('/api/audit', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setAuditLogs(data.auditLogs);
        setTotal(data.total);
      } else if (response.status === 401) {
        router.push('/login');
      } else {
        setError('Failed to fetch audit logs');
      }
    } catch (err) {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'CREATE':
        return 'bg-green-100 text-green-800';
      case 'UPDATE':
        return 'bg-blue-100 text-blue-800';
      case 'DELETE':
        return 'bg-red-100 text-red-800';
      case 'OVERRIDE_CREATE':
        return 'bg-purple-100 text-purple-800';
      case 'OVERRIDE_UPDATE':
        return 'bg-indigo-100 text-indigo-800';
      case 'OVERRIDE_DELETE':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) return <div className="p-4">Loading...</div>;
  if (error) return <div className="p-4 text-red-600">{error}</div>;

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link href="/flags" className="text-gray-700 hover:text-gray-900 mr-4">
                Flags
              </Link>
              <Link href="/users" className="text-gray-700 hover:text-gray-900 mr-4">
                Users
              </Link>
              <span className="text-gray-900 font-medium">Audit Logs</span>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          <div className="px-4 py-5 sm:px-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900">Audit Logs</h3>
            <p className="mt-1 max-w-2xl text-sm text-gray-500">
              Total {total} entries
            </p>
          </div>

          {auditLogs.length === 0 ? (
            <div className="px-4 py-5 sm:p-6">
              <p className="text-gray-500">No audit logs found.</p>
            </div>
          ) : (
            <div className="border-t border-gray-200">
              <ul className="divide-y divide-gray-200">
                {auditLogs.map((log) => (
                  <li key={log.id} className="px-4 py-4 sm:px-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getActionColor(log.action)}`}>
                          {log.action}
                        </span>
                        <span className="ml-3 text-sm text-gray-900">
                          Flag: <Link href={`/flags/${log.flag.id}`} className="text-indigo-600 hover:text-indigo-900">{log.flag.key}</Link>
                        </span>
                        <span className="ml-3 text-sm text-gray-500">
                          By: {log.user.email}
                        </span>
                      </div>
                      <div className="text-sm text-gray-500">
                        {new Date(log.timestamp).toLocaleString()}
                      </div>
                    </div>
                    <div className="mt-2">
                      {log.oldValue && (
                        <div className="text-sm text-gray-600">
                          <span className="font-medium">Old:</span> {JSON.stringify(log.oldValue)}
                        </div>
                      )}
                      {log.newValue && (
                        <div className="text-sm text-gray-600">
                          <span className="font-medium">New:</span> {JSON.stringify(log.newValue)}
                        </div>
                      )}
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
