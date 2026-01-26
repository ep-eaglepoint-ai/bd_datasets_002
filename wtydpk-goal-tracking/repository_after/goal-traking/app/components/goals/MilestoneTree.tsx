import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import { Milestone, GoalState } from '@/lib/types';
import { useGoalStore } from '@/lib/store';
import { Button } from '@/components/ui/Button';
import { MilestoneForm, ProgressUpdateForm } from '@/components/GoalForms'; // Keeping imported for now
import { MilestoneNode } from './MilestoneNode';

interface MilestoneTreeProps {
  goalId: string;
}

export function MilestoneTree({ goalId }: MilestoneTreeProps) {
  const { milestones, deleteMilestone, updateMilestone } = useGoalStore();
  
  const [showMilestoneForm, setShowMilestoneForm] = useState(false);
  const [showProgressForm, setShowProgressForm] = useState(false);
  const [editingMilestone, setEditingMilestone] = useState<Milestone | null>(null);
  const [parentMilestoneId, setParentMilestoneId] = useState<string | undefined>();
  const [selectedMilestone, setSelectedMilestone] = useState<Milestone | null>(null);
  
  const rootMilestones = milestones
    .filter(m => m.goalId === goalId && !m.parentMilestoneId)
    .sort((a, b) => a.order - b.order);
  
  const handleAddMilestone = (parentId?: string) => {
    setParentMilestoneId(parentId);
    setEditingMilestone(null);
    setShowMilestoneForm(true);
  };
  
  const handleEditMilestone = (milestone: Milestone) => {
    setEditingMilestone(milestone);
    setParentMilestoneId(milestone.parentMilestoneId);
    setShowMilestoneForm(true);
  };
  
  const handleUpdateProgress = (milestone: Milestone) => {
    setSelectedMilestone(milestone);
    setShowProgressForm(true);
  };
  
  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this milestone?')) {
      await deleteMilestone(id);
    }
  };
  
  const handleStateChange = async (id: string, state: GoalState) => {
    await updateMilestone(id, { state }, `State changed to ${state}`);
  };
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold tracking-tight text-foreground">Milestones</h3>
        <Button onClick={() => handleAddMilestone()} size="sm" className="gap-2">
          <Plus className="h-4 w-4" /> Add Milestone
        </Button>
      </div>
      
      {rootMilestones.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-8 border border-dashed border-white/10 rounded-xl bg-slate-900/30">
          <p className="text-muted-foreground mb-2">No milestones yet</p>
          <Button variant="link" onClick={() => handleAddMilestone()}>
            Create your first milestone
          </Button>
        </div>
      ) : (
        <div className="space-y-1">
          {rootMilestones.map(milestone => (
            <MilestoneNode
              key={milestone.id}
              milestone={milestone}
              level={0}
              onEdit={handleEditMilestone}
              onAddChild={handleAddMilestone}
              onUpdateProgress={handleUpdateProgress}
              onDelete={handleDelete}
              onStateChange={handleStateChange}
            />
          ))}
        </div>
      )}
      
      {showMilestoneForm && (
        <MilestoneForm
          goalId={goalId}
          milestone={editingMilestone || undefined}
          parentMilestoneId={parentMilestoneId}
          onClose={() => setShowMilestoneForm(false)}
        />
      )}
      
      {showProgressForm && selectedMilestone && (
        <ProgressUpdateForm
          entityId={selectedMilestone.id}
          entityType="milestone"
          currentProgress={selectedMilestone.progress}
          onClose={() => setShowProgressForm(false)}
        />
      )}
    </div>
  );
}
