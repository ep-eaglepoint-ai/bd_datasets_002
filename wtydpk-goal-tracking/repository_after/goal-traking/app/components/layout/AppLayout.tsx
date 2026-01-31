'use client';

import React from 'react';
import { Navbar } from './Navbar';

interface AppLayoutProps {
  children: React.ReactNode;
  activeView: 'goals' | 'analytics' | 'settings';
  onViewChange: (view: 'goals' | 'analytics' | 'settings') => void;
  onCreateClick: () => void;
  onExportClick: () => void;
  onImportClick: () => void;
}

export function AppLayout({ children, activeView, onViewChange, onCreateClick, onExportClick, onImportClick }: AppLayoutProps) {
  return (
    <div className="min-h-screen bg-background text-foreground bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-[#0a0f1e] to-black selection:bg-primary/30">
      <div className="fixed inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))]" />
      
      <Navbar 
        activeView={activeView} 
        onViewChange={onViewChange}
        onCreateClick={onCreateClick}
        onExportClick={onExportClick}
        onImportClick={onImportClick}
      />
      
      <main className="pt-24 pb-12 container mx-auto px-4 relative z-10">
        {children}
      </main>
    </div>
  );
}

