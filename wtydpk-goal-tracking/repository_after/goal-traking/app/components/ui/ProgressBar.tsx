import React from 'react';
import { cn } from '@/lib/utils';

interface ProgressBarProps extends React.HTMLAttributes<HTMLDivElement> {
  value: number;
  max?: number;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'gradient';
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
  animated?: boolean;
}

export const ProgressBar = React.forwardRef<HTMLDivElement, ProgressBarProps>(
  ({ className, value, max = 100, variant = 'default', showLabel = false, size = 'md', animated = true, ...props }, ref) => {
    const percentage = Math.min(100, Math.max(0, (value / max) * 100));
    
    return (
      <div className={cn("w-full", className)} ref={ref} {...props}>
        {showLabel && (
          <div className="flex justify-between mb-1 text-sm font-medium">
            <span className="text-muted-foreground">Progress</span>
            <span className={cn(
               "font-bold",
               percentage === 100 ? "text-green-400" : "text-foreground"
            )}>{Math.round(percentage)}%</span>
          </div>
        )}
        <div className={cn(
          "w-full bg-secondary overflow-hidden rounded-full",
          {
            "h-1.5": size === 'sm',
            "h-2.5": size === 'md',
            "h-4": size === 'lg',
          }
        )}>
          <div
            className={cn(
              "h-full rounded-full transition-all duration-500 ease-out",
              {
                "bg-primary": variant === 'default',
                "bg-green-500": variant === 'success',
                "bg-amber-500": variant === 'warning',
                "bg-destructive": variant === 'danger',
                "bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500": variant === 'gradient',
                "animate-pulse": animated && value < 100 && value > 0,
              }
            )}
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>
    );
  }
);
ProgressBar.displayName = "ProgressBar";
