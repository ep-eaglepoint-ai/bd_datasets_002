import { Sidebar } from './Sidebar';
import { AutoSeedProvider } from '@/components/providers/AutoSeedProvider';

export function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AutoSeedProvider>
      <div className="flex flex-col md:flex-row min-h-screen bg-slate-50 transition-colors duration-300">
        <Sidebar />
        <main className="flex-1 overflow-y-auto w-full h-[calc(100vh-65px)] md:h-screen">
           <div className="container mx-auto p-4 md:p-8 max-w-7xl">
              {children}
           </div>
        </main>
      </div>
    </AutoSeedProvider>
  );
}
