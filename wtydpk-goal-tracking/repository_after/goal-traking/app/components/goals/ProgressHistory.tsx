import React from 'react';
import { History, Activity, AlertOctagon } from 'lucide-react';
import { Goal } from '@/lib/types';
import { useGoalStore } from '@/lib/store';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';

interface ProgressHistoryProps {
  goalId: string;
}

export function ProgressHistory({ goalId }: ProgressHistoryProps) {
  const { progressUpdates } = useGoalStore();
  
  const updates = progressUpdates
    .filter(p => p.entityId === goalId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
  if (updates.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 border border-dashed border-white/10 rounded-xl bg-slate-900/30 text-muted-foreground">
        <History className="h-8 w-8 mb-2 opacity-50" />
        <p>No progress updates yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {updates.map((update, index) => (
        <Card 
           key={update.id} 
           variant="panel" 
           className="animate-in slide-up"
           style={{ animationDelay: `${index * 50}ms` }}
        >
           <div className="flex justify-between items-start mb-2">
             <div className="flex items-center gap-2">
               <span className="text-xl font-bold text-primary">{update.percentage}%</span>
               <span className="text-xs text-muted-foreground">
                 {new Date(update.createdAt).toLocaleString(undefined, {
                    month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'
                 })}
               </span>
             </div>
             {update.emotionalState && (
               <Badge variant="secondary" className="text-[10px] capitalize">
                  {update.emotionalState.replace('_', ' ')}
               </Badge>
             )}
           </div>
           
           {update.notes && (
             <p className="text-sm text-foreground mb-3">{update.notes}</p>
           )}
           
           <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted-foreground">
              {update.timeSpentMinutes && (
                <div className="flex items-center gap-1">
                  <History className="h-3 w-3" />
                  <span>{update.timeSpentMinutes} min</span>
                </div>
              )}
              {update.motivationLevel && (
                <div className="flex items-center gap-1">
                  <Activity className="h-3 w-3" />
                  <span>Motivation: {update.motivationLevel}/10</span>
                </div>
              )}
           </div>
           
           {update.blockers.length > 0 && (
             <div className="mt-3 p-2 bg-destructive/10 rounded border border-destructive/20">
               <div className="flex items-center gap-1 text-xs text-destructive font-medium mb-1">
                  <AlertOctagon className="h-3 w-3" /> Blockers
               </div>
               <div className="flex flex-wrap gap-1">
                 {update.blockers.map((blocker, i) => (
                   <span key={i} className="text-xs text-destructive/80 bg-background/50 px-1.5 py-0.5 rounded">
                     {blocker}
                   </span>
                 ))}
               </div>
             </div>
           )}
        </Card>
      ))}
    </div>
  );
}
