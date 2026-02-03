'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Filter } from 'lucide-react'; 
import { useGoalStore } from '@/lib/store';
import { Button } from '@/components/ui/Button';
import { GoalCard } from '@/components/goals/GoalCard';
import { GoalsFilter } from '@/components/goals/GoalsFilter';
import { GoalStats } from '@/components/goals/GoalStats';

interface GoalListProps {
  onGoalSelect?: (goalId: string) => void;
}

export function GoalList({ onGoalSelect }: GoalListProps) {
  const router = useRouter();
  const { filteredGoals, selectedGoalId, selectGoal, isLoading, milestones } = useGoalStore();
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  
  const handleSelect = React.useCallback((goalId: string) => {
    selectGoal(goalId);
    if (onGoalSelect) {
      onGoalSelect(goalId);
    } else {
      router.push(`/goals/${goalId}`);
    }
  }, [selectGoal, onGoalSelect, router]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 min-h-[400px]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mb-4" />
        <p className="text-muted-foreground animate-pulse">Loading goals...</p>
      </div>
    );
  }
  
  return (
    <div className="space-y-6 animate-in fade-in duration-500 h-full flex flex-col">
      
      <GoalStats />

      <div className="flex items-center justify-between mb-2 shrink-0">
        <h2 className="text-xl font-semibold text-foreground">My Goals</h2>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => setIsFilterOpen(true)}
          className="gap-2"
        >
          <Filter className="h-4 w-4" />
          Filter & Sort
        </Button>
      </div>

      <GoalsFilter isOpen={isFilterOpen} onClose={() => setIsFilterOpen(false)} />

      {filteredGoals.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 border border-dashed border-white/10 rounded-xl bg-slate-900/50">
          <div className="p-4 bg-slate-800/50 rounded-full mb-4">
             <Filter className="h-8 w-8 text-muted-foreground" />
          </div>
          <p className="text-lg font-medium mb-1">No goals found</p>
          <p className="text-sm text-muted-foreground max-w-xs text-center">
            Try adjusting your filters or create a new goal to get started.
          </p>
        </div>
      ) : (
        <div className="space-y-4 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-secondary scrollbar-track-transparent flex-1">
            {filteredGoals.map((goal) => (
                <GoalCard 
                    key={goal.id}
                    goal={goal}
                    milestonesCount={milestones.filter(m => m.goalId === goal.id).length}
                    isSelected={goal.id === selectedGoalId}
                    onClick={() => handleSelect(goal.id)}
                />
            ))}
        </div>
      )}
    </div>
  );
}
