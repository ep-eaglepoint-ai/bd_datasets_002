'use client';

import React from 'react';

interface ProcessingStateProps {
  state: 'idle' | 'loading' | 'processing' | 'success' | 'error';
  message?: string;
  progress?: number;
  className?: string;
}

export const ProcessingState: React.FC<ProcessingStateProps> = ({
  state,
  message,
  progress,
  className = '',
}) => {
  if (state === 'idle') {
    return null;
  }

  const states = {
    loading: {
      icon: '⏳',
      bg: 'bg-blue-50',
      text: 'text-blue-800',
      label: 'Loading...',
    },
    processing: {
      icon: '⚙️',
      bg: 'bg-yellow-50',
      text: 'text-yellow-800',
      label: 'Processing...',
    },
    success: {
      icon: '✅',
      bg: 'bg-green-50',
      text: 'text-green-800',
      label: 'Complete',
    },
    error: {
      icon: '❌',
      bg: 'bg-red-50',
      text: 'text-red-800',
      label: 'Error',
    },
  };

  const stateConfig = states[state];

  return (
    <div
      className={`p-3 rounded-lg border ${stateConfig.bg} ${stateConfig.text} ${className}`}
      role="status"
      aria-live="polite"
      aria-busy={state === 'loading' || state === 'processing'}
    >
      <div className="flex items-center gap-2">
        <span className="text-lg" aria-hidden="true">
          {stateConfig.icon}
        </span>
        <div className="flex-1">
          <p className="font-medium text-sm">
            {message || stateConfig.label}
          </p>
          {progress !== undefined && state === 'processing' && (
            <div className="mt-2">
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
                  role="progressbar"
                  aria-valuenow={progress}
                  aria-valuemin={0}
                  aria-valuemax={100}
                />
              </div>
              <p className="text-xs mt-1">{progress.toFixed(0)}%</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
