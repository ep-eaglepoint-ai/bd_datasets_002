import React from 'react';
import { cn } from '@/lib/utils/cn';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  description?: string;
}

export const Card: React.FC<CardProps> = ({
  children,
  className,
  title,
  description,
  ...props
}) => {
  return (
    <div
      className={cn('bg-white rounded-lg shadow-md p-6', className)}
      {...props}
    >
      {title && (
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          {description && (
            <p className="mt-1 text-sm text-gray-600">{description}</p>
          )}
        </div>
      )}
      {children}
    </div>
  );
};
