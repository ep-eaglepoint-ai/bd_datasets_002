'use client';

import React, { useState } from 'react';
import { Calendar, Trash2, Edit, BarChart } from 'lucide-react';
import { format } from 'date-fns';
import { ValidStateTransitions, GoalState, GoalStates } from '@/lib/types';
import { useGoalStore } from '@/lib/store';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Tabs, TabsContent } from '@/components/ui/Tabs';
import { MilestoneTree } from '@/components/goals/MilestoneTree';
import { GoalAnalytics } from '@/components/analytics/GoalAnalytics';
import { ProgressHistory } from '@/components/goals/ProgressHistory';
import { GoalForm, ProgressUpdateForm } from '@/components/GoalForms';
import { SimulationPanel } from '@/components/analytics/SimulationPanel';

interface GoalDetailProps {
  goalId: string;
  onClose: () => void;
}

export function GoalDetail({ goalId, onClose }: GoalDetailProps) {
  const { goals, updateGoal, deleteGoal } = useGoalStore();
  const goal = goals.find(g => g.id === goalId);
  const [showEditForm, setShowEditForm] = useState(false);
  const [showProgressForm, setShowProgressForm] = useState(false);
  const [activeTab, setActiveTab] = useState('milestones');
  
  if (!goal) return null;
  
  const validTransitions = ValidStateTransitions[goal.state];
  
  const handleStateChange = async (newState: GoalState) => {
    await updateGoal(goal.id, { state: newState }, `State changed to ${newState}`);
  };
  
  const handleDelete = async () => {
    if (confirm('Are you sure you want to delete this goal? This action cannot be undone.')) {
      await deleteGoal(goal.id);
      onClose();
    }
  };
  
  return (
    <div className="h-full flex flex-col bg-background animate-in fade-in duration-300">
      {/* Header */}
      <div className="p-6 border-b border-white/10 relative">
        <Button variant="ghost" size="icon" onClick={onClose} className="absolute right-4 top-4 text-muted-foreground hover:text-foreground">
          <span className="sr-only">Close</span>
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        </Button>

        <div className="pr-12">
          <div className="flex items-center gap-3 mb-3">
             <h2 className="text-2xl font-bold tracking-tight text-white">{goal.title}</h2>
             <Badge variant={goal.priority === 'critical' ? 'destructive' : 'default'} className="uppercase">
               {goal.priority}
             </Badge>
          </div>
          
          {goal.description && <p className="text-muted-foreground mb-4 max-w-2xl">{goal.description}</p>}
          
          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground/80 mb-6">
             {goal.targetDate && (
               <div className="flex items-center gap-1.5 bg-secondary/30 px-2 py-1 rounded">
                 <Calendar className="h-3.5 w-3.5" />
                 <span>Target: {format(new Date(goal.targetDate), 'MMM d, yyyy')}</span>
               </div>
             )}
             <div className="flex items-center gap-1.5 bg-secondary/30 px-2 py-1 rounded">
                <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                <span className="capitalize">Status: {goal.state}</span>
             </div>
          </div>
          
          <div className="flex gap-2">
            <Button onClick={() => setShowProgressForm(true)} className="gap-2">
               <BarChart className="h-4 w-4" /> Log Progress
            </Button>
            <Button variant="outline" onClick={() => setShowEditForm(true)} className="gap-2">
               <Edit className="h-4 w-4" /> Edit
            </Button>
            
            {validTransitions.length > 0 && (
               <select
                 className="h-10 px-3 bg-secondary/50 border border-white/10 rounded-lg text-sm outline-none cursor-pointer hover:bg-secondary/80 transition-colors"
                 value=""
                 onChange={(e) => e.target.value && handleStateChange(e.target.value as GoalState)}
               >
                 <option value="">Status Change...</option>
                 {validTransitions.map(s => (
                   <option key={s} value={s}>{s}</option>
                 ))}
               </select>
            )}

            <div className="flex-1" />
            
            <Button variant="destructive" size="icon" onClick={handleDelete} title="Delete Goal">
               <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
      
      <div className="flex-1 flex flex-col min-h-0">
        <div className="px-6 pt-4 border-b border-white/10">
           <Tabs 
             activeTab={activeTab} 
             onChange={setActiveTab}
             tabs={[
               { id: 'milestones', label: 'Milestones' },
               { id: 'analytics', label: 'Analytics' },
               { id: 'simulation', label: 'Simulation' },
               { id: 'history', label: 'History' },
             ]}
           />
        </div>
        
        <div className="flex-1 overflow-y-auto p-6 scrollbar-thin">
           <TabsContent value="milestones" activeTab={activeTab}>
              <MilestoneTree goalId={goal.id} />
           </TabsContent>
           
           <TabsContent value="analytics" activeTab={activeTab}>
              <GoalAnalytics goal={goal} />
           </TabsContent>

           <TabsContent value="simulation" activeTab={activeTab}>
              <SimulationPanel goalId={goal.id} />
           </TabsContent>
           
           <TabsContent value="history" activeTab={activeTab}>
              <ProgressHistory goalId={goal.id} />
           </TabsContent>
        </div>
      </div>
      
      {/* Modals */}
      {showEditForm && <GoalForm goal={goal} onClose={() => setShowEditForm(false)} />}
      
      {showProgressForm && (
        <ProgressUpdateForm
          entityId={goal.id}
          entityType="goal"
          currentProgress={goal.progress}
          onClose={() => setShowProgressForm(false)}
        />
      )}
    </div>
  );
}
