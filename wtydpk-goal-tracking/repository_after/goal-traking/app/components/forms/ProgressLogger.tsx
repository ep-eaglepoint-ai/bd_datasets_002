'use client';

import React, { useState } from 'react';
import { X, Clock, AlertOctagon, Activity, Smile } from 'lucide-react';
import { useGoalStore } from '@/lib/store';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { ProgressBar } from '@/components/ui/ProgressBar';

interface ProgressLoggerProps {
  entityId: string;
  entityType: 'goal' | 'milestone';
  currentProgress: number;
  onClose: () => void;
  onSave?: () => void;
}

export function ProgressLogger({
  entityId,
  entityType,
  currentProgress,
  onClose,
  onSave,
}: ProgressLoggerProps) {
  const { addProgressUpdate } = useGoalStore();
  
  const [percentage, setPercentage] = useState(currentProgress);
  const [notes, setNotes] = useState('');
  const [timeSpentMinutes, setTimeSpentMinutes] = useState('');
  const [blockers, setBlockers] = useState<string[]>([]);
  const [newBlocker, setNewBlocker] = useState('');
  const [confidenceLevel, setConfidenceLevel] = useState<number | null>(null);
  const [motivationLevel, setMotivationLevel] = useState<number | null>(null);
  const [emotionalState, setEmotionalState] = useState<string>('');
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const handleAddBlocker = () => {
    if (newBlocker.trim()) {
      setBlockers([...blockers, newBlocker.trim()]);
      setNewBlocker('');
    }
  };
  
  const handleSubmit = async () => {
    setError(null);
    setIsSubmitting(true);
    
    try {
      await addProgressUpdate({
        entityId,
        entityType,
        percentage,
        notes: notes || undefined,
        timeSpentMinutes: timeSpentMinutes ? Number(timeSpentMinutes) : undefined,
        blockers,
        confidenceLevel: confidenceLevel ?? undefined,
        motivationLevel: motivationLevel ?? undefined,
        emotionalState: emotionalState as any || undefined,
      });
      
      onSave?.();
      onClose();
    } catch (err) {
      setError(String(err));
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title="Log Progress"
      description={`Update progress for this ${entityType}.`}
      size="md"
      footer={
        <div className="flex justify-end gap-3 w-full">
          <Button variant="ghost" onClick={onClose} disabled={isSubmitting}>Cancel</Button>
          <Button onClick={handleSubmit} loading={isSubmitting}>
            Log Update
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        {error && (
          <div className="p-3 bg-red-500/20 border border-red-500/30 rounded-lg text-red-400 text-sm flex items-center gap-2">
            <X className="h-4 w-4" /> {error}
          </div>
        )}
        
        {/* Progress Slider */}
        <div className="space-y-3 p-4 bg-secondary/10 rounded-xl border border-white/5">
           <div className="flex justify-between items-end">
              <label className="text-sm font-medium">Progress</label>
              <span className="text-2xl font-bold text-primary">{percentage}%</span>
           </div>
           
           <input
             type="range"
             min="0"
             max="100"
             value={percentage}
             onChange={(e) => setPercentage(Number(e.target.value))}
             className="w-full"
           />
           <div className="flex justify-between text-xs text-muted-foreground">
             <span>0%</span>
             <span>50%</span>
             <span>100%</span>
           </div>
        </div>
        
        {/* Notes */}
        <div className="space-y-2">
           <label className="text-sm font-medium">Update Notes</label>
           <textarea
             className="w-full px-3 py-2 bg-secondary/30 border border-white/10 rounded-lg outline-none resize-none min-h-[80px]"
             value={notes}
             onChange={(e) => setNotes(e.target.value)}
             placeholder="What did you get done?"
           />
        </div>
        
        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 gap-4">
           <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
                 <Clock className="h-4 w-4" /> Time Spent (min)
              </label>
              <input
                 type="number"
                 className="w-full px-3 py-2 bg-secondary/30 border border-white/10 rounded-lg outline-none"
                 value={timeSpentMinutes}
                 onChange={(e) => setTimeSpentMinutes(e.target.value)}
                 placeholder="e.g. 45"
              />
           </div>
           
           <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
                 <Activity className="h-4 w-4" /> Motivation
              </label>
              <select
                 className="w-full px-3 py-2 bg-secondary/30 border border-white/10 rounded-lg outline-none"
                 value={motivationLevel ?? ''}
                 onChange={(e) => setMotivationLevel(e.target.value ? Number(e.target.value) : null)}
              >
                 <option value="">Select...</option>
                 {[1,2,3,4,5,6,7,8,9,10].map(n => (
                   <option key={n} value={n}>{n} - {n < 4 ? 'Low' : n < 8 ? 'Ok' : 'High'}</option>
                 ))}
              </select>
           </div>
        </div>
        
        <div className="space-y-2">
           <label className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
              <Smile className="h-4 w-4" /> How do you feel?
           </label>
           <div className="flex flex-wrap gap-2">
              {['energized', 'motivated', 'neutral', 'stressed', 'discouraged'].map(state => (
                <button
                   key={state}
                   onClick={() => setEmotionalState(state)}
                   className={`px-3 py-1.5 rounded-full text-xs transition-all border ${
                     emotionalState === state 
                       ? 'bg-primary/20 border-primary text-primary' 
                       : 'bg-secondary/30 border-transparent text-muted-foreground hover:bg-secondary/50'
                   }`}
                >
                   {state}
                </button>
              ))}
           </div>
        </div>
        
        {/* Blockers */}
        <div className="space-y-2">
           <label className="text-sm font-medium flex items-center gap-2 text-mini text-destructive">
              <AlertOctagon className="h-4 w-4" /> Any Blockers?
           </label>
           <div className="flex gap-2">
             <input
               className="flex-1 px-3 py-2 bg-secondary/30 border border-white/10 rounded-lg outline-none text-sm"
               value={newBlocker}
               onChange={(e) => setNewBlocker(e.target.value)}
               onKeyDown={(e) => e.key === 'Enter' && handleAddBlocker()}
               placeholder="Add blocker..."
             />
             <Button variant="destructive" size="sm" onClick={handleAddBlocker} disabled={!newBlocker.trim()}>
               Add
             </Button>
           </div>
           
           {blockers.length > 0 && (
             <div className="flex flex-wrap gap-2 mt-2">
               {blockers.map((blocker, i) => (
                 <Badge key={i} variant="destructive" className="pl-2 pr-1 gap-1">
                   {blocker}
                   <button onClick={() => setBlockers(blockers.filter((_, idx) => idx !== i))} className="hover:text-white ml-1">
                     <X className="h-3 w-3" />
                   </button>
                 </Badge>
               ))}
             </div>
           )}
        </div>
      </div>
    </Modal>
  );
}
