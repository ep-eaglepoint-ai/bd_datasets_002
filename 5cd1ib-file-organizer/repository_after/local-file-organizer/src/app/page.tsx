'use client';

import { useState, useEffect } from 'react';
import { 
  ChartBarIcon, 
  FolderIcon, 
  ArrowPathIcon,
  PlayIcon,
  StopIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';
import { ScanStatus, ScanError } from '@/types';

export default function Home() {
  const [status, setStatus] = useState<ScanStatus | null>(null);
  const [fileCount, setFileCount] = useState<number>(0);
  const [scanPath, setScanPath] = useState<string>('');
  const [scanError, setScanError] = useState<string | null>(null);
  const [showErrors, setShowErrors] = useState(false);

  const fetchStatus = async () => {
    try {
      const res = await fetch('/api/scan');
      if (res.ok) {
        const data: ScanStatus = await res.json();
        setStatus(data);
        
        if (data.status === 'error' && data.error) {
          setScanError(data.error);
        } else if (data.status !== 'error') {
          setScanError(null);
        }
      }
    } catch (error) {
      console.error('Failed to fetch status', error);
    }
  };

  const fetchFileCount = async () => {
    try {
      const res = await fetch('/api/files?limit=1');
      if (res.ok) {
        const data = await res.json();
        setFileCount(data.pagination?.total || 0);
      }
    } catch (error) {
      console.error('Failed to fetch file count', error);
    }
  };

  useEffect(() => {
    fetchStatus();
    fetchFileCount();
    const interval = setInterval(() => {
      fetchStatus();
      if (status?.isScanning) {
        fetchFileCount();
      }
    }, 2000);
    return () => clearInterval(interval);
  }, [status?.isScanning]);

  const handleScan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (status?.isScanning || !scanPath) {
      return;
    }
    
    setScanError(null);

    try {
      const res = await fetch('/api/scan', { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: scanPath })
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        setScanError(data.error || 'Failed to start scan');
      } else {
        fetchStatus();
      }
    } catch (error) {
      console.error('Failed to start scan', error);
      setScanError('Network error');
    }
  };

  const handleCancel = async () => {
    try {
      const res = await fetch('/api/scan', { method: 'DELETE' });
      if (res.ok) {
        fetchStatus();
      }
    } catch (error) {
      console.error('Failed to cancel scan', error);
    }
  };

  const isScanning = status?.isScanning || false;
  const progress = status?.progress;
  const errors = progress?.errors || [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Dashboard</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Overview of your local file organization.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium border ${
            isScanning 
              ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800' 
              : status?.status === 'completed'
              ? 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800'
              : status?.status === 'error'
              ? 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800'
              : 'bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700'
          }`}>
            <span className={`w-2 h-2 rounded-full ${
              isScanning ? 'bg-blue-500 animate-pulse' 
              : status?.status === 'completed' ? 'bg-green-500'
              : status?.status === 'error' ? 'bg-red-500'
              : 'bg-gray-400'
            }`}></span>
            {isScanning ? 'Scanning' 
              : status?.status === 'completed' ? 'Completed'
              : status?.status === 'error' ? 'Error'
              : status?.status === 'cancelled' ? 'Cancelled'
              : 'Ready'}
          </span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Files</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">{fileCount.toLocaleString()}</p>
            </div>
            <div className="p-3 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg">
              <FolderIcon className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Files Scanned</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
                {progress?.filesScanned?.toLocaleString() || 0}
              </p>
            </div>
            <div className="p-3 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
              <ArrowPathIcon className={`w-6 h-6 text-blue-600 dark:text-blue-400 ${isScanning ? 'animate-spin' : ''}`} />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Directories</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
                {progress?.directoriesScanned?.toLocaleString() || 0}
              </p>
            </div>
            <div className="p-3 bg-purple-50 dark:bg-purple-900/30 rounded-lg">
              <ChartBarIcon className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Errors</p>
              <p className={`text-3xl font-bold mt-2 ${errors.length > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-gray-900 dark:text-white'}`}>
                {errors.length}
              </p>
            </div>
            <div className={`p-3 rounded-lg ${errors.length > 0 ? 'bg-amber-50 dark:bg-amber-900/30' : 'bg-gray-50 dark:bg-gray-700'}`}>
              <ExclamationTriangleIcon className={`w-6 h-6 ${errors.length > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-gray-400'}`} />
            </div>
          </div>
        </div>
      </div>

      {/* Main Action Area */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div className="p-6 border-b border-gray-100 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Scanner Control</h2>
          <p className="text-gray-500 text-sm mt-1">Start a new scan to index file changes in your directories.</p>
        </div>
        
        <div className="p-6 bg-gray-50 dark:bg-gray-800/50">
          {scanError && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 text-red-700 dark:text-red-300 rounded-r">
              <p className="font-bold">Error</p>
              <p>{scanError}</p>
            </div>
          )}

          {status?.status === 'completed' && !isScanning && (
            <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border-l-4 border-green-500 text-green-700 dark:text-green-300 rounded-r flex items-start gap-3">
              <CheckCircleIcon className="w-5 h-5 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-bold">Scan Completed</p>
                <p className="text-sm">
                  Scanned {progress?.filesScanned || 0} files in {progress?.directoriesScanned || 0} directories.
                  {errors.length > 0 && ` Encountered ${errors.length} errors.`}
                </p>
              </div>
            </div>
          )}

          {isScanning ? (
            <div className="flex flex-col items-center gap-4 py-4">
              <div className="relative w-16 h-16">
                <div className="absolute inset-0 border-4 border-indigo-100 dark:border-indigo-900/30 rounded-full"></div>
                <div className="absolute inset-0 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
              </div>
              <div className="text-center">
                <p className="text-gray-600 dark:text-gray-300 font-medium">
                  Scanning in progress...
                </p>
                <p className="text-gray-400 text-xs font-mono mt-2 max-w-md truncate" title={progress?.currentPath}>
                  {progress?.currentPath || status?.currentPath || ''}
                </p>
              </div>
              <button
                onClick={handleCancel}
                className="inline-flex items-center gap-2 px-4 py-2 bg-red-100 hover:bg-red-200 dark:bg-red-900/30 dark:hover:bg-red-900/50 text-red-700 dark:text-red-300 rounded-lg font-medium transition-colors"
              >
                <StopIcon className="w-4 h-4" />
                Cancel Scan
              </button>
            </div>
          ) : (
            <form onSubmit={handleScan} className="w-full max-w-lg mx-auto flex flex-col gap-4">
              <div>
                <label htmlFor="path" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Directory Path to Scan
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    id="path"
                    value={scanPath}
                    onChange={(e) => setScanPath(e.target.value)}
                    placeholder="/home/user/documents"
                    className="flex-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white sm:text-sm p-2.5 border"
                    required
                  />
                  <button
                    type="submit"
                    disabled={!scanPath}
                    className="inline-flex items-center justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    <PlayIcon className="w-4 h-4 mr-2" />
                    Scan
                  </button>
                </div>
                <p className="mt-2 text-xs text-gray-500">
                  Enter the absolute path to the folder you want to organize.
                </p>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* Error Details */}
      {errors.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
          <button
            onClick={() => setShowErrors(!showErrors)}
            className="w-full p-4 flex items-center justify-between text-left hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <ExclamationTriangleIcon className="w-5 h-5 text-amber-500" />
              <span className="font-medium text-gray-900 dark:text-white">
                {errors.length} Scan Error{errors.length !== 1 ? 's' : ''}
              </span>
            </div>
            <span className="text-sm text-gray-500">{showErrors ? 'Hide' : 'Show'}</span>
          </button>
          
          {showErrors && (
            <div className="border-t border-gray-100 dark:border-gray-700 max-h-64 overflow-y-auto">
              {errors.map((error: ScanError, idx: number) => (
                <div key={idx} className="p-3 border-b border-gray-100 dark:border-gray-700 last:border-b-0">
                  <div className="flex items-start gap-2">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                      error.type === 'permission' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
                      : error.type === 'symlink_cycle' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300'
                      : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                    }`}>
                      {error.type}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-900 dark:text-gray-100 truncate" title={error.path}>
                        {error.path}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">{error.error}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
