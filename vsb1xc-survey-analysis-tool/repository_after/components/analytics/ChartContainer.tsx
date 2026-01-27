'use client';

import React from 'react';
import { Card } from '@/components/ui/Card';

interface ChartContainerProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}

export const ChartContainer: React.FC<ChartContainerProps> = ({
  title,
  description,
  children,
  className,
}) => {
  return (
    <Card title={title} description={description} className={className}>
      <div className="w-full h-64">{children}</div>
    </Card>
  );
}
