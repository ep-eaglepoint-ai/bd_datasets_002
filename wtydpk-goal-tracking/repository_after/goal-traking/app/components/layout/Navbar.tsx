'use client';

import React from 'react';
import { LayoutDashboard, Target, Settings, Bell, Search, PlusCircle, Download } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface NavbarProps {
  activeView: 'goals' | 'analytics' | 'settings';
  onViewChange: (view: 'goals' | 'analytics' | 'settings') => void;
  onCreateClick: () => void;
  onExportClick: () => void;
}

export function Navbar({ activeView, onViewChange, onCreateClick, onExportClick }: NavbarProps) {
  return (
    <nav className="h-16 border-b border-white/10 bg-slate-900/50 backdrop-blur-xl fixed top-0 left-0 right-0 z-40">
      <div className="container mx-auto h-full px-4 flex items-center justify-between">
        {/* Logo & Nav */}
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-2 font-bold text-xl tracking-tight">
             <div className="bg-primary/20 text-primary p-1.5 rounded-lg">
               <Target className="h-5 w-5" />
             </div>
             <span className="bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">
               GoalTrack
             </span>
          </div>
          
          <div className="hidden md:flex items-center gap-1 bg-secondary/30 p-1 rounded-lg border border-white/5">
            <button
              onClick={() => onViewChange('goals')}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                activeView === 'goals' 
                  ? 'bg-secondary text-foreground shadow-sm' 
                  : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
              }`}
            >
              Goals
            </button>
            <button
              onClick={() => onViewChange('analytics')}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                activeView === 'analytics' 
                  ? 'bg-secondary text-foreground shadow-sm' 
                  : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
              }`}
            >
              Analytics
            </button>
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-4">
          <div className="hidden md:flex relative group">
             <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-foreground transition-colors" />
             <input 
               placeholder="Quick search..." 
               className="h-9 w-64 bg-secondary/30 border border-transparent rounded-full pl-9 pr-4 text-sm outline-none focus:bg-secondary/50 focus:border-white/10 transition-all placeholder:text-muted-foreground/50"
             />
             <div className="absolute right-3 top-1/2 -translate-y-1/2 flex gap-1">
                <span className="text-[10px] bg-white/5 px-1.5 rounded py-0.5 text-muted-foreground border border-white/5">⌘K</span>
             </div>
          </div>
          
          <button 
            onClick={onExportClick}
            className="p-2 text-muted-foreground hover:text-foreground transition-colors hover:bg-white/5 rounded-full" 
            title="Export Data"
          >
             <Download className="h-5 w-5" />
          </button>
          
          <div className="h-6 w-px bg-white/10 mx-1" />
          
          <Button onClick={onCreateClick} className="gap-2 shadow-[0_0_15px_rgba(var(--primary),0.3)]">
             <PlusCircle className="h-4 w-4" />
             <span className="hidden sm:inline">New Goal</span>
          </Button>
          
          <button className="h-8 w-8 rounded-full bg-gradient-to-tr from-primary to-purple-500 border border-white/20 shadow-inner" />
        </div>
      </div>
    </nav>
  );
}
