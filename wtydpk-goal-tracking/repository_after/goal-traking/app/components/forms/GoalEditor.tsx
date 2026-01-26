'use client';

import React, { useState } from 'react';
import { Plus, X, Calendar, Target, List } from 'lucide-react';
import { Goal, PriorityLevels, ExpectedOutcome } from '@/lib/types';
import { useGoalStore } from '@/lib/store';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';

interface GoalEditorProps {
  goal?: Goal;
  onClose: () => void;
  onSave?: () => void;
}

export function GoalEditor({ goal, onClose, onSave }: GoalEditorProps) {
  const { createGoal, updateGoal } = useGoalStore();
  
  const [title, setTitle] = useState(goal?.title || '');
  const [description, setDescription] = useState(goal?.description || '');
  const [priority, setPriority] = useState(goal?.priority || 'medium');
  const [priorityWeight, setPriorityWeight] = useState(goal?.priorityWeight || 50);
  const [targetDate, setTargetDate] = useState(
    goal?.targetDate ? new Date(goal.targetDate).toISOString().split('T')[0] : ''
  );
  const [successCriteria, setSuccessCriteria] = useState<string[]>(goal?.successCriteria || []);
  const [motivationNotes, setMotivationNotes] = useState(goal?.motivationNotes || '');
  const [tags, setTags] = useState<string[]>(goal?.tags || []);
  const [newCriterion, setNewCriterion] = useState('');
  const [newTag, setNewTag] = useState('');
  
  // Expected outcome
  const [expectedDescription, setExpectedDescription] = useState(
    goal?.expectedOutcome?.description || ''
  );
  const [estimatedDays, setEstimatedDays] = useState(
    goal?.expectedOutcome?.estimatedTimelineDays?.toString() || ''
  );
  const [estimatedHours, setEstimatedHours] = useState(
    goal?.expectedOutcome?.estimatedEffortHours?.toString() || ''
  );
  const [estimatedDifficulty, setEstimatedDifficulty] = useState(
    goal?.expectedOutcome?.estimatedDifficulty?.toString() || ''
  );
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const isEditing = !!goal;
  
  const handleAddCriterion = () => {
    if (newCriterion.trim()) {
      setSuccessCriteria([...successCriteria, newCriterion.trim()]);
      setNewCriterion('');
    }
  };
  
  const handleRemoveCriterion = (index: number) => {
    setSuccessCriteria(successCriteria.filter((_, i) => i !== index));
  };
  
  const handleAddTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      setTags([...tags, newTag.trim()]);
      setNewTag('');
    }
  };
  
  const handleRemoveTag = (tag: string) => {
    setTags(tags.filter(t => t !== tag));
  };
  
  const handleSubmit = async () => {
    setError(null);
    setIsSubmitting(true);
    
    try {
      const expectedOutcome: ExpectedOutcome | undefined = expectedDescription ? {
        description: expectedDescription,
        successMetrics: successCriteria,
        estimatedTimelineDays: estimatedDays ? Number(estimatedDays) : undefined,
        estimatedEffortHours: estimatedHours ? Number(estimatedHours) : undefined,
        estimatedDifficulty: estimatedDifficulty ? Number(estimatedDifficulty) : undefined,
      } : undefined;
      
      const goalData = {
        title,
        description: description || undefined,
        priority: priority as typeof goal extends Goal ? Goal['priority'] : 'medium',
        priorityWeight,
        targetDate: targetDate ? new Date(targetDate).toISOString() : undefined,
        successCriteria,
        motivationNotes: motivationNotes || undefined,
        tags,
        expectedOutcome,
      };
      
      if (isEditing && goal) {
        await updateGoal(goal.id, goalData, 'Goal updated');
      } else {
        await createGoal(goalData);
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
      title={isEditing ? 'Edit Goal' : 'Create New Goal'}
      description="Define your objective and success criteria."
      size="lg"
      footer={
        <div className="flex justify-end gap-3 w-full">
          <Button variant="ghost" onClick={onClose} disabled={isSubmitting}>Cancel</Button>
          <Button onClick={handleSubmit} loading={isSubmitting} disabled={!title.trim()}>
            {isEditing ? 'Save Changes' : 'Create Goal'}
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        {error && (
          <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm flex items-center gap-2">
            <X className="h-4 w-4" /> {error}
          </div>
        )}
        
        {/* Basic Info */}
        <div className="grid gap-4">
          <div className="grid gap-2">
            <label className="text-sm font-medium">Goal Title</label>
            <input
              className="w-full px-3 py-2 bg-secondary/30 border border-white/10 rounded-lg focus:ring-1 focus:ring-primary outline-none"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Master React Performance"
              autoFocus
            />
          </div>
          
          <div className="grid gap-2">
             <label className="text-sm font-medium">Description</label>
             <textarea
               className="w-full px-3 py-2 bg-secondary/30 border border-white/10 rounded-lg focus:ring-1 focus:ring-primary outline-none resize-none min-h-[80px]"
               value={description}
               onChange={(e) => setDescription(e.target.value)}
               placeholder="What do you want to achieve?"
             />
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
           {/* Priority Section */}
           <div className="space-y-4 p-4 bg-secondary/10 rounded-xl border border-white/5">
              <h4 className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
                 <Target className="h-4 w-4" /> Priority Settings
              </h4>
              
              <div className="grid gap-2">
                 <label className="text-xs text-muted-foreground">Level</label>
                 <select
                   className="w-full px-3 py-2 bg-secondary/50 border border-white/10 rounded-lg outline-none cursor-pointer"
                   value={priority}
                   onChange={(e) => setPriority(e.target.value as any)}
                 >
                   {PriorityLevels.map(p => (
                     <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
                   ))}
                 </select>
              </div>
              
              <div className="grid gap-2">
                 <div className="flex justify-between text-xs">
                    <label className="text-muted-foreground">Weight</label>
                    <span>{priorityWeight}</span>
                 </div>
                 <input
                   type="range"
                   min="1"
                   max="100"
                   value={priorityWeight}
                   onChange={(e) => setPriorityWeight(Number(e.target.value))}
                   className="w-full"
                 />
              </div>
           </div>
           
           {/* Timeline Section */}
           <div className="space-y-4 p-4 bg-secondary/10 rounded-xl border border-white/5">
              <h4 className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
                 <Calendar className="h-4 w-4" /> Timeline
              </h4>
              
              <div className="grid gap-2">
                 <label className="text-xs text-muted-foreground">Target Date</label>
                 <input
                   type="date"
                   className="w-full px-3 py-2 bg-secondary/50 border border-white/10 rounded-lg outline-none"
                   value={targetDate}
                   onChange={(e) => setTargetDate(e.target.value)}
                 />
              </div>
              
              <div className="grid grid-cols-2 gap-2">
                 <div className="grid gap-1">
                    <label className="text-xs text-muted-foreground">Est. Days</label>
                    <input
                      type="number"
                      className="w-full px-2 py-1.5 bg-secondary/50 border border-white/10 rounded-lg outline-none text-sm"
                      value={estimatedDays}
                      onChange={(e) => setEstimatedDays(e.target.value)}
                      placeholder="Days"
                    />
                 </div>
                 <div className="grid gap-1">
                    <label className="text-xs text-muted-foreground">Est. Hours</label>
                    <input
                      type="number"
                      className="w-full px-2 py-1.5 bg-secondary/50 border border-white/10 rounded-lg outline-none text-sm"
                      value={estimatedHours}
                      onChange={(e) => setEstimatedHours(e.target.value)}
                      placeholder="Hours"
                    />
                 </div>
              </div>
           </div>
        </div>
        
        {/* Success Criteria */}
        <div className="space-y-2">
           <label className="text-sm font-medium flex items-center gap-2">
             <List className="h-4 w-4" /> Success Criteria
           </label>
           <div className="flex gap-2">
             <input
               className="flex-1 px-3 py-2 bg-secondary/30 border border-white/10 rounded-lg outline-none text-sm"
               value={newCriterion}
               onChange={(e) => setNewCriterion(e.target.value)}
               onKeyDown={(e) => e.key === 'Enter' && handleAddCriterion()}
               placeholder="Add criteria..."
             />
             <Button size="sm" onClick={handleAddCriterion} disabled={!newCriterion.trim()}>
               <Plus className="h-4 w-4" />
             </Button>
           </div>
           {successCriteria.length > 0 && (
             <ul className="space-y-1 mt-2">
               {successCriteria.map((c, i) => (
                 <li key={i} className="flex justify-between items-center p-2 bg-secondary/20 rounded text-sm group">
                   <span>• {c}</span>
                   <button onClick={() => handleRemoveCriterion(i)} className="text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-destructive">
                     <X className="h-3 w-3" />
                   </button>
                 </li>
               ))}
             </ul>
           )}
        </div>
        
        {/* Tags */}
        <div className="space-y-2">
           <label className="text-sm font-medium">Tags</label>
           <div className="flex gap-2">
             <input
               className="flex-1 px-3 py-2 bg-secondary/30 border border-white/10 rounded-lg outline-none text-sm"
               value={newTag}
               onChange={(e) => setNewTag(e.target.value)}
               onKeyDown={(e) => e.key === 'Enter' && handleAddTag()}
               placeholder="Add tags..."
             />
             <Button size="sm" onClick={handleAddTag} disabled={!newTag.trim()}>
               Add
             </Button>
           </div>
           {tags.length > 0 && (
             <div className="flex flex-wrap gap-2 mt-2">
               {tags.map(tag => (
                 <Badge key={tag} variant="secondary" className="pl-2 pr-1 gap-1">
                   {tag}
                   <button onClick={() => handleRemoveTag(tag)} className="hover:text-destructive ml-1">
                     <X className="h-3 w-3" />
                   </button>
                 </Badge>
               ))}
             </div>
           )}
        </div>
        
        {/* Motivation */}
        <div className="space-y-2">
           <label className="text-sm font-medium">Motivation</label>
           <textarea
             className="w-full px-3 py-2 bg-secondary/30 border border-white/10 rounded-lg outline-none resize-none text-sm"
             rows={2}
             value={motivationNotes}
             onChange={(e) => setMotivationNotes(e.target.value)}
             placeholder="Why is this important?"
           />
        </div>
      </div>
    </Modal>
  );
}
