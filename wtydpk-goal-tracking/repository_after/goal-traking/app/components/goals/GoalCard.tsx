import React from 'react';
import { format } from 'date-fns';
import { Calendar, AlertCircle, CheckCircle2, PlayCircle, PauseCircle, XCircle, StopCircle, Clipboard, Hash } from 'lucide-react';
import { Goal, PriorityLevel, GoalState } from '@/lib/types';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { cn } from '@/lib/utils';

interface GoalCardProps {
  goal: Goal;
  milestonesCount: number;
  isSelected?: boolean;
  onClick?: () => void;
}

const PriorityColors: Record<PriorityLevel, 'destructive' | 'warning' | 'info' | 'success'> = {
  critical: 'destructive',
  high: 'warning',
  medium: 'info',
  low: 'success',
};

const StateIcons: Record<GoalState, React.ReactNode> = {
  planned: <Clipboard className="h-3 w-3" />,
  active: <PlayCircle className="h-3 w-3" />,
  paused: <PauseCircle className="h-3 w-3" />,
  completed: <CheckCircle2 className="h-3 w-3" />,
  failed: <XCircle className="h-3 w-3" />,
  abandoned: <StopCircle className="h-3 w-3" />,
};

const StateColors: Record<GoalState, 'default' | 'primary' | 'secondary' | 'success' | 'destructive' | 'outline'> = {
  planned: 'secondary',
  active: 'primary',
  paused: 'secondary',
  completed: 'success',
  failed: 'destructive',
  abandoned: 'destructive',
};

export function GoalCard({ goal, milestonesCount, isSelected, onClick }: GoalCardProps) {
  const isOverdue = goal.targetDate && new Date(goal.targetDate) < new Date() && goal.state !== 'completed';

  return (
    <Card
      variant="glass"
      hoverEffect
      className={cn(
        "cursor-pointer group relative overflow-hidden transition-all duration-300",
        isSelected ? "ring-2 ring-primary border-primary/50 bg-primary/5" : ""
      )}
      onClick={onClick}
    >
      <div className="flex justify-between items-start gap-4 mb-3">
        <h3 className="font-semibold text-lg leading-tight group-hover:text-primary transition-colors line-clamp-1">
          {goal.title}
        </h3>
        <Badge variant={PriorityColors[goal.priority]} className="uppercase text-[10px] tracking-wider shrink-0">
          {goal.priority}
        </Badge>
      </div>

      {goal.description && (
        <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
          {goal.description}
        </p>
      )}

      <div className="space-y-4">
        <ProgressBar 
          value={goal.progress} 
          size="sm" 
          variant={goal.state === 'completed' ? 'success' : 'gradient'} 
        />
        
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-3">
             <Badge variant="outline" className={cn("gap-1.5 px-2 py-0.5 border-dashed", 
                goal.state === 'active' ? "border-primary/50 text-primary" : ""
             )}>
                {StateIcons[goal.state]}
                <span className="capitalize">{goal.state}</span>
             </Badge>
             
             {milestonesCount > 0 && (
               <div className="flex items-center gap-1.5">
                 <Hash className="h-3 w-3" />
                 <span>{milestonesCount} milestones</span>
               </div>
             )}
          </div>

          {goal.targetDate && (
            <div className={cn(
              "flex items-center gap-1.5",
              isOverdue ? "text-destructive font-medium" : ""
            )}>
              <Calendar className="h-3 w-3" />
              <span>{format(new Date(goal.targetDate), 'MMM d, yyyy')}</span>
              {isOverdue && <AlertCircle className="h-3 w-3" />}
            </div>
          )}
        </div>

        {goal.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {goal.tags.slice(0, 3).map(tag => (
              <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded bg-secondary/50 text-secondary-foreground">
                #{tag}
              </span>
            ))}
            {goal.tags.length > 3 && (
              <span className="text-[10px] px-1.5 py-0.5 text-muted-foreground">
                +{goal.tags.length - 3}
              </span>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}
