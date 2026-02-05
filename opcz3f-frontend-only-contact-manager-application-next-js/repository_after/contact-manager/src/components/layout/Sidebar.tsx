"use client"

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Users, Settings, Plus, Menu } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useState } from 'react';

const navItems = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/contacts', label: 'Contacts', icon: Users },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Mobile Menu Button */}
      <div className="md:hidden p-4 flex items-center justify-between border-b bg-white/80 backdrop-blur-md sticky top-0 z-50">
        <span className="font-bold text-lg text-slate-900">Contact Manager</span>
        <Button variant="ghost" size="icon" onClick={() => setIsOpen(!isOpen)}>
          <Menu className="h-6 w-6" />
        </Button>
      </div>

      {/* Sidebar Container */}
      <div className={cn(
        "fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 text-slate-50 transition-transform duration-300 ease-in-out shadow-2xl md:shadow-none md:translate-x-0 md:static md:block border-r border-slate-800",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex h-full flex-col">
          <div className="p-6 border-b border-slate-800">
             <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-indigo-500 flex items-center justify-center font-bold text-white">
                  CM
                </div>
                <h1 className="text-xl font-bold tracking-tight">Contact Manager</h1>
             </div>
          </div>

          <div className="px-4 py-6">
             <Link href="/contacts/new">
               <Button className="w-full bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-900/20 font-medium">
                 <Plus className="mr-2 h-4 w-4" /> New Contact
               </Button>
             </Link>
          </div>

          <nav className="flex-1 space-y-1 px-4">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsOpen(false)}
                  className={cn(
                    "flex items-center rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 group",
                    isActive
                      ? "bg-slate-800 text-white shadow-sm ring-1 ring-slate-700/50"
                      : "text-slate-300 hover:bg-slate-800/50 hover:text-white"
                  )}
                >
                  <Icon className={cn("mr-3 h-5 w-5 transition-colors", isActive ? "text-indigo-400" : "text-slate-400 group-hover:text-slate-300")} />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="p-4 border-t border-slate-800">
             <div className="flex items-center gap-3">
                 <div className="h-8 w-8 rounded-full bg-indigo-500 flex items-center justify-center font-bold">
                     CM
                 </div>
                 <div className="text-sm">
                     <p className="font-medium text-slate-200">User</p>
                     <p className="text-xs text-slate-400">Offline Ready</p>
                 </div>
             </div>
          </div>
        </div>
      </div>
       
       {/* Overlay for mobile */}
       {isOpen && (
           <div 
             className="fixed inset-0 z-40 bg-black/50 md:hidden"
             onClick={() => setIsOpen(false)}
           />
       )}
    </>
  );
}
