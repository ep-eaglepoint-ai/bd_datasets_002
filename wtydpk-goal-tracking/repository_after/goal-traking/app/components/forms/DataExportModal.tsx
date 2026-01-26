import React, { useState } from 'react';
import { Download, FileJson, FileText, Check, AlertCircle } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { useGoalStore } from '@/lib/store';
import { Goal, Milestone } from '@/lib/types';

interface DataExportModalProps {
  onClose: () => void;
}

export function DataExportModal({ onClose }: DataExportModalProps) {
  const { exportData, goals, milestones } = useGoalStore();
  const [format, setFormat] = useState<'json' | 'csv'>('json');
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    setError(null);
    
    try {
      if (format === 'json') {
        const jsonString = await exportData();
        downloadFile(jsonString, `goal-tracking-export-${new Date().toISOString().split('T')[0]}.json`, 'application/json');
      } else {
        // CSV Export - Create a ZIP-like experience or just multiple downloads? 
        // For simplicity, we'll export Goals and Milestones as separate CSVs if selected, 
        // or just Goals if we want a single file. 
        // Let's do Goals CSV for now as it's the primary entity.
        
        const goalsCsv = convertGoalsToCSV(goals);
        downloadFile(goalsCsv, `goals-export-${new Date().toISOString().split('T')[0]}.csv`, 'text/csv');
        
        // Optional: Trigger download for milestones too if needed, but browsers might block multiple downloads
        // For now, let's stick to Goals CSV or a combined approach if possible, but Goals is most useful.
      }
      
      setSuccess(true);
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err) {
      setError('Failed to export data. Please try again.');
      console.error(err);
    } finally {
      setIsExporting(false);
    }
  };

  const downloadFile = (content: string, filename: string, type: string) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const convertGoalsToCSV = (goals: Goal[]): string => {
    const headers = [
      'ID', 'Title', 'State', 'Priority', 'Progress', 'Start Date', 'Target Date', 'Created At'
    ];
    
    const rows = goals.map(g => [
      g.id,
      `"${g.title.replace(/"/g, '""')}"`, // Escape quotes
      g.state,
      g.priority,
      g.progress,
      g.startDate || '',
      g.targetDate || '',
      g.createdAt
    ]);
    
    return [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');
  };

  return (
    <Modal title="Export Data" isOpen={true} onClose={onClose} className="max-w-md">
      <div className="space-y-6">
        <p className="text-muted-foreground text-sm">
          Download your data for backup or analysis. JSON includes full history and analytics, while CSV is optimized for spreadsheet viewing (Goals only).
        </p>
        
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => setFormat('json')}
            className={`flex flex-col items-center justify-center p-4 rounded-xl border transition-all ${
              format === 'json'
                ? 'bg-primary/10 border-primary text-primary'
                : 'bg-secondary/30 border-white/5 hover:bg-secondary/50 text-muted-foreground hover:text-foreground'
            }`}
          >
            <FileJson className="h-8 w-8 mb-2" />
            <span className="font-medium">JSON</span>
            <span className="text-[10px] opacity-70 mt-1">Full Backup</span>
          </button>
          
          <button
            onClick={() => setFormat('csv')}
            className={`flex flex-col items-center justify-center p-4 rounded-xl border transition-all ${
              format === 'csv'
                ? 'bg-primary/10 border-primary text-primary'
                : 'bg-secondary/30 border-white/5 hover:bg-secondary/50 text-muted-foreground hover:text-foreground'
            }`}
          >
            <FileText className="h-8 w-8 mb-2" />
            <span className="font-medium">CSV</span>
            <span className="text-[10px] opacity-70 mt-1">Spreadsheet</span>
          </button>
        </div>
        
        {error && (
          <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            {error}
          </div>
        )}
        
        {success && (
          <div className="p-3 rounded-lg bg-green-500/10 text-green-400 text-sm flex items-center gap-2">
            <CheckCircleIcon className="h-4 w-4" />
            Export started successfully!
          </div>
        )}
        
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="ghost" onClick={onClose} disabled={isExporting}>Cancel</Button>
          <Button onClick={handleExport} disabled={isExporting} className="gap-2">
            {isExporting ? (
              <>
                <span className="animate-spin h-4 w-4 border-2 border-white/20 border-t-white rounded-full" />
                Exporting...
              </>
            ) : (
              <>
                <Download className="h-4 w-4" />
                Download {format.toUpperCase()}
              </>
            )}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function CheckCircleIcon({ className }: { className?: string }) {
  return (
    <svg 
      className={className} 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    >
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}
