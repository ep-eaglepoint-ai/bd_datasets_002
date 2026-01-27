'use client';

import React from 'react';

interface WarningBadgeProps {
  type: 'warning' | 'error' | 'info' | 'uncertainty' | 'limitation';
  message: string;
  details?: string;
  className?: string;
}

export const WarningBadge: React.FC<WarningBadgeProps> = ({
  type,
  message,
  details,
  className = '',
}) => {
  const colors = {
    warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
    error: 'bg-red-50 border-red-200 text-red-800',
    info: 'bg-blue-50 border-blue-200 text-blue-800',
    uncertainty: 'bg-orange-50 border-orange-200 text-orange-800',
    limitation: 'bg-purple-50 border-purple-200 text-purple-800',
  };

  const icons = {
    warning: '⚠️',
    error: '❌',
    info: 'ℹ️',
    uncertainty: '📊',
    limitation: '🔍',
  };

  return (
    <div
      className={`p-3 rounded-lg border ${colors[type]} ${className}`}
      role="alert"
      aria-live="polite"
    >
      <div className="flex items-start gap-2">
        <span className="text-lg" aria-hidden="true">
          {icons[type]}
        </span>
        <div className="flex-1">
          <p className="font-medium text-sm">{message}</p>
          {details && (
            <p className="text-xs mt-1 opacity-90">{details}</p>
          )}
        </div>
      </div>
    </div>
  );
};
