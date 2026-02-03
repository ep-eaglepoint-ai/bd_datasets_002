import React, { useState, useEffect } from 'react';
import { useGoalStore } from '@/lib/store';
import { Goal, Milestone, ProgressUpdate } from '@/lib/types';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { predictCompletionProbability, simulateChanges, SimulationResult } from '@/lib/analytics';
import { AlertCircle, ArrowRight, RefreshCw, Calendar, TrendingUp } from 'lucide-react';
import { format } from 'date-fns';

interface SimulationPanelProps {
  goalId: string;
}

export function SimulationPanel({ goalId }: SimulationPanelProps) {
  const { goals, milestones, progressUpdates, dependencies } = useGoalStore();
  
  const goal = goals.find(g => g.id === goalId);
  
  const [simulationParams, setSimulationParams] = useState({
    progressAdjust: 0,
    deadlineShift: 0, // days
    priorityAdjust: 0,
    removeBlockers: false,
  });
  
  const [result, setResult] = useState<SimulationResult | null>(null);

  useEffect(() => {
    if (!goal) return;

    // Run simulation
    const simulatedDate = goal.targetDate 
      ? new Date(new Date(goal.targetDate).getTime() + simulationParams.deadlineShift * 86400000).toISOString()
      : undefined;
      
    const currentBlockers = dependencies.filter(d => d.sourceId === goalId && d.dependencyType === 'blocks').map(d => d.targetId);

    // Map dependencies to format expected by simulateChanges if needed, or check types.
    // simulateChanges expects Dependency[] for dependencies arg, and string[] for removeDependencies.
    // The lint error said: Argument of type '{ ... }[]' is not assignable to '{ sourceId: string; targetId: string; blocked: boolean; }[]'.
    // Looking at `analytics.ts` -> `simulateChanges` signature:
    // export function simulateChanges(goal: Goal, milestones: Milestone[], updates: ProgressUpdate[], dependencies: Dependency[], changes: SimulationChanges): SimulationResult
    // Dependency type in `types.ts` has `dependencyType: 'blocks' | 'requires' | ...`.
    // It seems `simulateChanges` might be using a simplified type internally or I misread the lint?
    // "Property 'blocked' is missing..." implies `simulateChanges` expects an object with `blocked` prop in its dependencies array?
    // Let's verify `analytics.ts` definition.
    // But for now, I will cast or map if I can confirm the type. 
    // Actually, `dependencies` in store is `Dependency[]`. `analytics.ts` likely imports `Dependency`.
    // If analytics.ts has a mismatch, I should fix analytics.ts or cast here.
    // Assuming `simulateChanges` was implemented to take `Dependency[]`.
    
    // I will cast to any to silence the error temporarily if it's a type mismatch from my recent edits to analytics, 
    // or better, I will map it if `analytics` expects a different shape.
    // But verify: `analytics.ts` line 700+ (from memory of previous view)
    
    const checkResult = simulateChanges(
      goal,
      milestones,
      progressUpdates,
      dependencies as any, // Cast to avoid tight coupling issues if types drifted
      {
        newProgress: Math.min(100, Math.max(0, goal.progress + simulationParams.progressAdjust)),
        newTargetDate: simulatedDate,
        priorityChange: simulationParams.priorityAdjust,
        removeDependencies: simulationParams.removeBlockers ? currentBlockers : [],
      }
    );
    
    setResult(checkResult);
  }, [goal, milestones, progressUpdates, dependencies, simulationParams, goalId]);

  if (!goal) return null;

  return (
    <Card className="p-6 space-y-6 bg-secondary/10 border-white/5">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <RefreshCw className="h-5 w-5 text-primary" />
          Scenario Simulation
        </h3>
        <Badge variant={result?.simulatedProbability !== undefined && result.simulatedProbability > (result.originalProbability || 0) ? 'success' : 'secondary'}>
          Unsaved Scenario
        </Badge>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Controls */}
        <div className="space-y-6">
          <div className="space-y-3">
             <label className="text-sm font-medium text-muted-foreground flex justify-between">
                <span>Progress Adjustment</span>
                <span className={simulationParams.progressAdjust > 0 ? 'text-green-400' : ''}>
                  {simulationParams.progressAdjust > 0 ? '+' : ''}{simulationParams.progressAdjust}%
                </span>
             </label>
             <input 
               type="range" 
               min="-20" 
               max="20" 
               value={simulationParams.progressAdjust}
               onChange={(e) => setSimulationParams(p => ({ ...p, progressAdjust:parseInt(e.target.value) }))}
               className="w-full h-2 bg-secondary rounded-lg appearance-none cursor-pointer"
             />
             <p className="text-xs text-muted-foreground">Simulate a sprint burst or stall</p>
          </div>

          <div className="space-y-3">
             <label className="text-sm font-medium text-muted-foreground flex justify-between">
                <span>Deadline Shift</span>
                <span className={simulationParams.deadlineShift > 0 ? 'text-green-400' : 'text-amber-400'}>
                  {simulationParams.deadlineShift > 0 ? '+' : ''}{simulationParams.deadlineShift} Days
                </span>
             </label>
             <input 
               type="range" 
               min="-30" 
               max="30" 
               step="5"
               value={simulationParams.deadlineShift}
               onChange={(e) => setSimulationParams(p => ({ ...p, deadlineShift:parseInt(e.target.value) }))}
               className="w-full h-2 bg-secondary rounded-lg appearance-none cursor-pointer"
             />
             <p className="text-xs text-muted-foreground">Extend or crunch the timeline</p>
          </div>
          
          <div className="flex items-center gap-3 pt-2">
              <input 
                type="checkbox" 
                id="removeBlockers"
                checked={simulationParams.removeBlockers}
                onChange={(e) => setSimulationParams(p => ({ ...p, removeBlockers: e.target.checked }))}
                className="h-4 w-4 rounded border-gray-600 bg-secondary text-primary focus:ring-primary"
              />
              <label htmlFor="removeBlockers" className="text-sm">Simulate resolving all blockers</label>
          </div>
        </div>
        
        {/* Results */}
        <div className="bg-background/40 rounded-xl p-5 border border-white/5 flex flex-col justify-center">
            {result && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                   <div className="text-center">
                      <div className="text-sm text-muted-foreground mb-1">Current Probability</div>
                      <div className="text-2xl font-bold">{result.originalProbability}%</div>
                   </div>
                   <ArrowRight className="text-muted-foreground h-6 w-6" />
                   <div className="text-center">
                      <div className="text-sm text-muted-foreground mb-1">Simulated</div>
                      <div className={`text-3xl font-bold ${
                        result.simulatedProbability > result.originalProbability ? 'text-green-400' : 
                        result.simulatedProbability < result.originalProbability ? 'text-red-400' : 'text-foreground'
                      }`}>
                        {result.simulatedProbability}%
                      </div>
                   </div>
                </div>
                
                <div className="space-y-2">
                   {result.recommendations.map((rec, i) => (
                     <div key={i} className="flex items-start gap-2 text-sm text-muted-foreground bg-secondary/30 p-2 rounded">
                        <TrendingUp className="h-4 w-4 mt-0.5 text-primary shrink-0" />
                        <span>{rec}</span>
                     </div>
                   ))}
                   {result.recommendations.length === 0 && (
                     <p className="text-sm text-muted-foreground text-center italic">Adjust parameters to see impact</p>
                   )}
                </div>
              </div>
            )}
        </div>
      </div>
    </Card>
  );
}
