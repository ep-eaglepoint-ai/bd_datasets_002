import React from 'react';
import { Search, Filter as FilterIcon, X } from 'lucide-react';
import { GoalState, PriorityLevel, GoalStates, PriorityLevels } from '@/lib/types';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { useGoalStore } from '@/lib/store';

interface GoalsFilterProps {
  isOpen: boolean;
  onClose: () => void;
}

export function GoalsFilter({ isOpen, onClose }: GoalsFilterProps) {
  const { filter, setFilter, clearFilter, sortOptions, setSortOptions } = useGoalStore();
  
  const [localStates, setLocalStates] = React.useState<GoalState[]>(filter.states || []);
  const [localPriorities, setLocalPriorities] = React.useState<PriorityLevel[]>(filter.priorities || []);
  const [localSearch, setLocalSearch] = React.useState(filter.searchQuery || '');
  
  const toggleState = (state: GoalState) => {
    setLocalStates(prev => 
      prev.includes(state) ? prev.filter(s => s !== state) : [...prev, state]
    );
  };
  
  const togglePriority = (priority: PriorityLevel) => {
    setLocalPriorities(prev => 
      prev.includes(priority) ? prev.filter(p => p !== priority) : [...prev, priority]
    );
  };
  
  const applyFilters = () => {
    setFilter({
      states: localStates.length > 0 ? localStates : undefined,
      priorities: localPriorities.length > 0 ? localPriorities : undefined,
      searchQuery: localSearch || undefined,
    });
    onClose();
  };
  
  const handleClear = () => {
    setLocalStates([]);
    setLocalPriorities([]);
    setLocalSearch('');
    clearFilter();
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Filter Goals"
      description="Narrow down your goals by state, priority, or search terms."
      size="md"
      footer={
        <div className="flex gap-3 justify-end w-full">
          <Button variant="ghost" onClick={handleClear} className="text-muted-foreground hover:text-foreground">
            Reset Filters
          </Button>
          <Button onClick={applyFilters} className="px-8">
            Apply Results
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Search */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <Search className="h-4 w-4" /> Search
          </label>
          <input
            type="text"
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            placeholder="Search by title, description or tags..."
            className="w-full px-4 py-3 rounded-lg bg-secondary/30 border border-white/10 focus:border-primary/50 focus:ring-1 focus:ring-primary/50 outline-none transition-all placeholder:text-muted-foreground/50 text-foreground"
          />
        </div>

        {/* States */}
        <div className="space-y-3">
          <label className="text-sm font-medium text-muted-foreground">Status</label>
          <div className="flex flex-wrap gap-2">
            {GoalStates.map(state => (
              <button
                key={state}
                onClick={() => toggleState(state)}
                className={`
                  px-3 py-1.5 rounded-full text-sm font-medium transition-all border
                  ${localStates.includes(state)
                    ? 'bg-primary/20 text-primary border-primary/30 shadow-[0_0_10px_rgba(var(--primary),0.2)]'
                    : 'bg-secondary/30 text-muted-foreground border-transparent hover:bg-secondary/50 hover:text-foreground'}
                `}
              >
                {state.charAt(0).toUpperCase() + state.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Priorities */}
        <div className="space-y-3">
          <label className="text-sm font-medium text-muted-foreground">Priority</label>
          <div className="flex flex-wrap gap-2">
            {PriorityLevels.map(priority => (
              <button
                key={priority}
                onClick={() => togglePriority(priority)}
                className={`
                  px-3 py-1.5 rounded-full text-sm font-medium transition-all border
                  ${localPriorities.includes(priority)
                    ? 'bg-accent/20 text-accent-foreground border-accent/30'
                    : 'bg-secondary/30 text-muted-foreground border-transparent hover:bg-secondary/50 hover:text-foreground'}
                `}
              >
                {priority.charAt(0).toUpperCase() + priority.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Sort */}
        <div className="space-y-2">
           <label className="text-sm font-medium text-muted-foreground">Sort Order</label>
           <select
             value={`${sortOptions.field}-${sortOptions.direction}`}
             onChange={(e) => {
               const [field, direction] = e.target.value.split('-');
               setSortOptions({ 
                 field: field as typeof sortOptions.field, 
                 direction: direction as 'asc' | 'desc' 
               });
             }}
             className="w-full px-4 py-2.5 rounded-lg bg-secondary/30 border border-white/10 outline-none text-foreground appearance-none cursor-pointer hover:bg-secondary/50 transition-colors"
           >
             <option value="createdAt-desc">Newest First</option>
             <option value="createdAt-asc">Oldest First</option>
             <option value="priority-desc">Highest Priority</option>
             <option value="progress-desc">Most Progress</option>
             <option value="targetDate-asc">Due Soonest</option>
             <option value="title-asc">Alphabetical (A-Z)</option>
           </select>
        </div>
      </div>
    </Modal>
  );
}
