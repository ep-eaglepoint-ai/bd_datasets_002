'use client';

import React from 'react';
import { Card } from './Card';

interface AccessibleCardProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
  id?: string;
}

export const AccessibleCard: React.FC<AccessibleCardProps> = ({
  title,
  description,
  children,
  className = '',
  id,
}) => {
  const cardId = id || `card-${title.toLowerCase().replace(/\s+/g, '-')}`;

  return (
    <Card
      title={title}
      description={description}
      className={className}
    >
      <div
        id={cardId}
        role="region"
        aria-labelledby={`${cardId}-title`}
        aria-describedby={description ? `${cardId}-description` : undefined}
      >
        <h3 id={`${cardId}-title`} className="sr-only">
          {title}
        </h3>
        {description && (
          <p id={`${cardId}-description`} className="sr-only">
            {description}
          </p>
        )}
        {children}
      </div>
    </Card>
  );
};
