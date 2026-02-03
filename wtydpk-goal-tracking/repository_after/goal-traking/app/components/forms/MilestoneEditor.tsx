'use client';

import React, { useState } from 'react';
import { X, Calendar, Flag } from 'lucide-react';
import { Milestone, PriorityLevels } from '@/lib/types';
import { useGoalStore } from '@/lib/store';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';

interface MilestoneEditorProps {
  goalId: string;
  milestone?: Milestone;
  parentMilestoneId?: string;
  onClose: () => void;
  onSave?: () => void;
}

export function MilestoneEditor({ goalId, milestone, parentMilestoneId, onClose, onSave }: MilestoneEditorProps) {
  const { createMilestone, updateMilestone } = useGoalStore();
  
  const [title, setTitle] = useState(milestone?.title || '');
  const [description, setDescription] = useState(milestone?.description || '');
  const [priority, setPriority] = useState(milestone?.priority || 'medium');
  const [targetDate, setTargetDate] = useState(
    milestone?.targetDate ? new Date(milestone.targetDate).toISOString().split('T')[0] : ''
  );
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const isEditing = !!milestone;
  
  const handleSubmit = async () => {
    setError(null);
    setIsSubmitting(true);
    
    try {
      const milestoneData = {
        goalId,
        parentMilestoneId,
        title,
        description: description || undefined,
        priority: priority as typeof milestone extends Milestone ? Milestone['priority'] : 'medium',
        targetDate: targetDate ? new Date(targetDate).toISOString() : undefined,
      };
      
      if (isEditing && milestone) {
        await updateMilestone(milestone.id, milestoneData, 'Milestone updated');
      } else {
        await createMilestone(milestoneData);
      }
      
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
      title={isEditing ? 'Edit Milestone' : parentMilestoneId ? 'Add Sub-Milestone' : 'Add Milestone'}
      description="Break down your goal into actionable steps."
      size="md"
      footer={
        <div className="flex justify-end gap-3 w-full">
          <Button variant="ghost" onClick={onClose} disabled={isSubmitting}>Cancel</Button>
          <Button onClick={handleSubmit} loading={isSubmitting} disabled={!title.trim()}>
            {isEditing ? 'Update' : 'Create'}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        {error && (
          <div className="p-3 bg-red-500/20 border border-red-500/30 rounded-lg text-red-400 text-sm flex items-center gap-2">
            <X className="h-4 w-4" /> {error}
          </div>
        )}
        
        <div className="space-y-2">
          <label className="text-sm font-medium">Title</label>
          <input
            className="w-full px-3 py-2 bg-secondary/30 border border-white/10 rounded-lg focus:ring-1 focus:ring-primary outline-none"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="What needs to be done?"
            autoFocus
          />
        </div>
        
        <div className="space-y-2">
          <label className="text-sm font-medium">Description</label>
          <textarea
            className="w-full px-3 py-2 bg-secondary/30 border border-white/10 rounded-lg focus:ring-1 focus:ring-primary outline-none resize-none min-h-[80px]"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Details about this milestone..."
          />
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
               <Flag className="h-4 w-4 text-muted-foreground" /> Priority
            </label>
            <select
              className="w-full px-3 py-2 bg-secondary/30 border border-white/10 rounded-lg outline-none cursor-pointer"
              value={priority}
              onChange={(e) => setPriority(e.target.value as any)}
            >
              {PriorityLevels.map(p => (
                <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
              ))}
            </select>
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
               <Calendar className="h-4 w-4 text-muted-foreground" /> Due Date
            </label>
            <input
              type="date"
              className="w-full px-3 py-2 bg-secondary/30 border border-white/10 rounded-lg outline-none cursor-pointer"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
            />
          </div>
        </div>
      </div>
    </Modal>
  );
}
