import React from 'react';
import { cn } from '@/lib/utils';

interface TabsProps {
  tabs: { id: string; label: string; icon?: React.ReactNode }[];
  activeTab: string;
  onChange: (id: string) => void;
  className?: string;
}

export function Tabs({ tabs, activeTab, onChange, className }: TabsProps) {
  return (
    <div className={cn("inline-flex h-12 items-center justify-center rounded-lg bg-secondary/50 p-1 text-muted-foreground backdrop-blur-sm", className)}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={cn(
            "inline-flex items-center justify-center whitespace-nowrap rounded-md px-4 py-2 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
            activeTab === tab.id
              ? "bg-background text-foreground shadow-sm"
              : "hover:bg-background/20 hover:text-foreground"
          )}
        >
          {tab.icon && <span className="mr-2">{tab.icon}</span>}
          {tab.label}
        </button>
      ))}
    </div>
  );
}

export function TabsContent({ value, activeTab, children, className }: { value: string; activeTab: string; children: React.ReactNode; className?: string }) {
  if (value !== activeTab) return null;
  return (
    <div className={cn("mt-4 ring-offset-background animate-in fade-in slide-up duration-300", className)}>
      {children}
    </div>
  );
}
