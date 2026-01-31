'use client';

import React, { useState } from 'react';
import { LayoutDashboard, Target, Settings, Bell, Search, PlusCircle, Download, Menu, X, Upload } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface NavbarProps {
  activeView: 'goals' | 'analytics' | 'settings';
  onViewChange: (view: 'goals' | 'analytics' | 'settings') => void;
  onCreateClick: () => void;
  onExportClick: () => void;
  onImportClick: () => void;
}

export function Navbar({ activeView, onViewChange, onCreateClick, onExportClick, onImportClick }: NavbarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleViewChange = (view: 'goals' | 'analytics' | 'settings') => {
    onViewChange(view);
    setMobileMenuOpen(false);
  };

  return (
    <>
      <nav className="h-16 border-b border-white/10 bg-slate-900/50 backdrop-blur-xl fixed top-0 left-0 right-0 z-40">
        <div className="container mx-auto h-full px-4 flex items-center justify-between">
          {/* Mobile Menu Toggle */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Toggle menu"
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>

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
            
            {/* Desktop Nav Tabs */}
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
          <div className="flex items-center gap-2 sm:gap-4">
            {/* Desktop Search */}
            <div className="hidden lg:flex relative group">
               <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-foreground transition-colors" />
               <input 
                 placeholder="Quick search..." 
                 className="h-9 w-48 xl:w-64 bg-secondary/30 border border-transparent rounded-full pl-9 pr-4 text-sm outline-none focus:bg-secondary/50 focus:border-white/10 transition-all placeholder:text-muted-foreground/50"
               />
               <div className="absolute right-3 top-1/2 -translate-y-1/2 hidden xl:flex gap-1">
                  <span className="text-[10px] bg-white/5 px-1.5 rounded py-0.5 text-muted-foreground border border-white/5">⌘K</span>
               </div>
            </div>
            
            {/* Import Button */}
            <button 
              onClick={onImportClick}
              className="p-2 text-muted-foreground hover:text-foreground transition-colors hover:bg-white/5 rounded-full" 
              title="Import Data"
              aria-label="Import Data"
            >
               <Upload className="h-5 w-5" />
            </button>
            
            {/* Export Button */}
            <button 
              onClick={onExportClick}
              className="p-2 text-muted-foreground hover:text-foreground transition-colors hover:bg-white/5 rounded-full" 
              title="Export Data"
              aria-label="Export Data"
            >
               <Download className="h-5 w-5" />
            </button>
            
            <div className="hidden sm:block h-6 w-px bg-white/10 mx-1" />
            
            {/* New Goal Button */}
            <Button onClick={onCreateClick} className="gap-2 shadow-[0_0_15px_rgba(var(--primary),0.3)]">
               <PlusCircle className="h-4 w-4" />
               <span className="hidden sm:inline">New Goal</span>
            </Button>
            
            {/* Avatar */}
            <button className="hidden sm:block h-8 w-8 rounded-full bg-gradient-to-tr from-primary to-purple-500 border border-white/20 shadow-inner" />
          </div>
        </div>
      </nav>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-30 md:hidden">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setMobileMenuOpen(false)}
          />
          
          {/* Mobile Menu Panel */}
          <div className="absolute top-16 left-0 right-0 bg-slate-900/95 border-b border-white/10 p-4 animate-in slide-in-from-top duration-200">
            {/* Mobile Nav Links */}
            <div className="flex flex-col gap-2 mb-4">
              <button
                onClick={() => handleViewChange('goals')}
                className={`w-full text-left px-4 py-3 rounded-lg text-sm font-medium transition-all flex items-center gap-3 ${
                  activeView === 'goals' 
                    ? 'bg-primary/20 text-primary' 
                    : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
                }`}
              >
                <Target className="h-5 w-5" />
                Goals
              </button>
              <button
                onClick={() => handleViewChange('analytics')}
                className={`w-full text-left px-4 py-3 rounded-lg text-sm font-medium transition-all flex items-center gap-3 ${
                  activeView === 'analytics' 
                    ? 'bg-primary/20 text-primary' 
                    : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
                }`}
              >
                <LayoutDashboard className="h-5 w-5" />
                Analytics
              </button>
              <button
                onClick={() => handleViewChange('settings')}
                className={`w-full text-left px-4 py-3 rounded-lg text-sm font-medium transition-all flex items-center gap-3 ${
                  activeView === 'settings' 
                    ? 'bg-primary/20 text-primary' 
                    : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
                }`}
              >
                <Settings className="h-5 w-5" />
                Settings
              </button>
            </div>
            
            {/* Mobile Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input 
                placeholder="Search goals..." 
                className="w-full h-10 bg-secondary/30 border border-white/10 rounded-lg pl-10 pr-4 text-sm outline-none focus:border-primary/50 transition-all placeholder:text-muted-foreground/50"
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
