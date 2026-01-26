import React, { useState } from 'react';
import { ChevronRight, ChevronDown, Plus, Edit2, Trash2, BarChart2 } from 'lucide-react';
import { Milestone, GoalState, ValidStateTransitions } from '@/lib/types';
import { useGoalStore } from '@/lib/store';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { cn } from '@/lib/utils';

interface MilestoneNodeProps {
  milestone: Milestone;
  level: number;
  onEdit: (milestone: Milestone) => void;
  onAddChild: (parentId: string) => void;
  onUpdateProgress: (milestone: Milestone) => void;
  onDelete: (id: string) => void;
  onStateChange: (id: string, state: GoalState) => void;
}

export function MilestoneNode({ 
  milestone, 
  level, 
  onEdit, 
  onAddChild, 
  onUpdateProgress,
  onDelete,
  onStateChange,
}: MilestoneNodeProps) {
  const { milestones } = useGoalStore();
  const children = milestones.filter(m => m.parentMilestoneId === milestone.id);
  const [isExpanded, setIsExpanded] = useState(true);
  
  const validTransitions = ValidStateTransitions[milestone.state];
  
  return (
    <div className="group animate-in fade-in slide-up duration-300">
      <div 
        className={cn(
          "flex items-center gap-3 p-3 rounded-xl border transition-all duration-200 mb-2 relative overflow-hidden",
          milestone.state === 'completed' 
            ? "bg-green-500/10 border-green-500/20" 
            : "bg-card border-white/5 hover:border-white/10 hover:bg-white/5"
        )}
        style={{ marginLeft: `${level * 24}px` }}
      >
        {/* Connector Line for nested items */}
        {level > 0 && (
          <div 
             className="absolute left-[-12px] top-1/2 w-3 h-px bg-white/10"
             style={{ left: '-24px', width: '24px' }}
          />
        )}

        {/* Expand/Collapse button */}
        <div className="w-5 flex justify-center shrink-0">
          {children.length > 0 && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </button>
          )}
        </div>
        
        {/* Milestone info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <span className={cn(
              "font-medium truncate",
              milestone.state === 'completed' ? "text-green-400 line-through decoration-green-500/50" : "text-foreground"
            )}>
              {milestone.title}
            </span>
            <Badge variant={
               milestone.priority === 'critical' ? 'destructive' :
               milestone.priority === 'high' ? 'warning' :
               milestone.priority === 'medium' ? 'info' : 'success'
            } className="text-[10px] px-1.5 py-0">
               {milestone.priority}
            </Badge>
          </div>
          
          <div className="flex items-center gap-3 max-w-md">
            <ProgressBar 
               value={milestone.progress} 
               size="sm"
               variant="gradient"
               className="h-1.5"
            />
          </div>
        </div>
        
        {/* Actions - Visible on hover or focus */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity focus-within:opacity-100">
          {validTransitions.length > 0 && (
            <select
              value=""
              onChange={(e) => {
                if (e.target.value) {
                  onStateChange(milestone.id, e.target.value as GoalState);
                }
              }}
              className="text-[10px] px-2 py-1 bg-secondary/50 border border-white/10 rounded text-muted-foreground outline-none cursor-pointer hover:bg-secondary hover:text-foreground transition-colors mr-2"
            >
              <option value="">Status...</option>
              {validTransitions.map(state => (
                <option key={state} value={state}>{state}</option>
              ))}
            </select>
          )}
          
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onUpdateProgress(milestone)} title="Update Progress">
            <BarChart2 className="h-3.5 w-3.5 text-blue-400" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onAddChild(milestone.id)} title="Add Sub-Milestone">
            <Plus className="h-3.5 w-3.5 text-green-400" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(milestone)} title="Edit">
            <Edit2 className="h-3.5 w-3.5 text-muted-foreground" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-red-500/20 hover:text-red-400" onClick={() => onDelete(milestone.id)} title="Delete">
            <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
          </Button>
        </div>
      </div>
      
      {/* Children */}
      {isExpanded && children.length > 0 && (
        <div className="milestone-children">
          {children
            .sort((a, b) => a.order - b.order)
            .map(child => (
              <MilestoneNode
                key={child.id}
                milestone={child}
                level={level + 1}
                onEdit={onEdit}
                onAddChild={onAddChild}
                onUpdateProgress={onUpdateProgress}
                onDelete={onDelete}
                onStateChange={onStateChange}
              />
            ))}
        </div>
      )}
    </div>
  );
}
