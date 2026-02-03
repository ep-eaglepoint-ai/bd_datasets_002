import React from 'react';
import { cn } from '@/lib/utils';

interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning' | 'info';
}

export const Badge = React.forwardRef<HTMLDivElement, BadgeProps>(
  ({ className, variant = 'default', ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent",
          {
            "bg-primary text-primary-foreground hover:bg-primary/80": variant === 'default',
            "bg-secondary text-secondary-foreground hover:bg-secondary/80": variant === 'secondary',
            "bg-destructive text-destructive-foreground hover:bg-destructive/80": variant === 'destructive',
            "text-foreground border-border hover:bg-accent hover:text-accent-foreground": variant === 'outline',
            "bg-green-500/15 text-green-400 border-green-500/30 hover:bg-green-500/25": variant === 'success',
            "bg-amber-500/15 text-amber-400 border-amber-500/30 hover:bg-amber-500/25": variant === 'warning',
            "bg-blue-500/15 text-blue-400 border-blue-500/30 hover:bg-blue-500/25": variant === 'info',
          },
          className
        )}
        {...props}
      />
    );
  }
);
Badge.displayName = "Badge";
