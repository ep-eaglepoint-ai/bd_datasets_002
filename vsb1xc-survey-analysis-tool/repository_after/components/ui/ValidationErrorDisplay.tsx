'use client';

import React from 'react';
import { ValidationError } from '@/lib/utils/validation';

interface ValidationErrorDisplayProps {
  errors: ValidationError[];
  title?: string;
}

export const ValidationErrorDisplay: React.FC<ValidationErrorDisplayProps> = ({
  errors,
  title = 'Validation Errors',
}) => {
  if (errors.length === 0) {
    return null;
  }

  return (
    <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
      <h3 className="font-semibold text-red-800 mb-2">{title}</h3>
      <ul className="space-y-1">
        {errors.map((error, index) => (
          <li key={index} className="text-sm text-red-700">
            <span className="font-medium">{error.field || 'Unknown field'}:</span>{' '}
            {error.message}
            {error.path.length > 0 && (
              <span className="text-red-500 text-xs ml-1">
                (path: {error.path.join('.')})
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
};
