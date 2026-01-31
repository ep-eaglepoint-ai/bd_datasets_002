'use client';

import React, { useMemo } from 'react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { AlertTriangle, Clock, ArrowRight, GitBranch } from 'lucide-react';
import { Dependency, Goal, Milestone } from '@/lib/types';
import { differenceInDays, format, parseISO } from 'date-fns';

interface CascadingDelayInfo {
  sourceId: string;
  sourceName: string;
  targetId: string;
  targetName: string;
  delayDays: number;
  impactLevel: 'low' | 'medium' | 'high' | 'critical';
}

interface CascadingDelaysPanelProps {
  goals: Goal[];
  milestones: Milestone[];
  dependencies: Dependency[];
}

export function CascadingDelaysPanel({ goals, milestones, dependencies }: CascadingDelaysPanelProps) {
  const cascadingDelays = useMemo(() => {
    const delays: CascadingDelayInfo[] = [];
    const now = new Date();
    
    // Find items that are blocking others and are behind schedule
    dependencies.forEach(dep => {
      if (dep.dependencyType !== 'blocks') return;
      
      // Find source (the blocker)
      let source: Goal | Milestone | undefined;
      let sourceName = '';
      
      if (dep.sourceType === 'goal') {
        source = goals.find(g => g.id === dep.sourceId);
        sourceName = source?.title || 'Unknown Goal';
      } else {
        source = milestones.find(m => m.id === dep.sourceId);
        sourceName = source?.title || 'Unknown Milestone';
      }
      
      if (!source) return;
      
      // Check if source is behind schedule
      const targetDate = source.targetDate ? parseISO(source.targetDate) : null;
      if (!targetDate || targetDate > now) return;
      
      const delayDays = differenceInDays(now, targetDate);
      if (delayDays <= 0) return;
      
      // Find target (the blocked item)
      let target: Goal | Milestone | undefined;
      let targetName = '';
      
      if (dep.targetType === 'goal') {
        target = goals.find(g => g.id === dep.targetId);
        targetName = target?.title || 'Unknown Goal';
      } else {
        target = milestones.find(m => m.id === dep.targetId);
        targetName = target?.title || 'Unknown Milestone';
      }
      
      if (!target) return;
      
      // Calculate impact level
      let impactLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';
      if (delayDays > 14) impactLevel = 'critical';
      else if (delayDays > 7) impactLevel = 'high';
      else if (delayDays > 3) impactLevel = 'medium';
      
      delays.push({
        sourceId: dep.sourceId,
        sourceName,
        targetId: dep.targetId,
        targetName,
        delayDays,
        impactLevel,
      });
    });
    
    // Sort by delay impact
    return delays.sort((a, b) => b.delayDays - a.delayDays);
  }, [goals, milestones, dependencies]);

  const impactColors = {
    low: 'secondary',
    medium: 'warning',
    high: 'destructive',
    critical: 'destructive',
  } as const;

  if (cascadingDelays.length === 0) {
    return (
      <Card variant="glass" className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-green-500/10 rounded-lg">
            <GitBranch className="h-5 w-5 text-green-500" />
          </div>
          <div>
            <h3 className="font-semibold">Cascading Delays</h3>
            <p className="text-sm text-muted-foreground">No cascading delays detected</p>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          All blocked items are on schedule. Great job keeping dependencies aligned!
        </p>
      </Card>
    );
  }

  const criticalCount = cascadingDelays.filter(d => d.impactLevel === 'critical').length;
  const highCount = cascadingDelays.filter(d => d.impactLevel === 'high').length;

  return (
    <Card variant="glass" className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-destructive/10 rounded-lg">
            <AlertTriangle className="h-5 w-5 text-destructive" />
          </div>
          <div>
            <h3 className="font-semibold">Cascading Delays</h3>
            <p className="text-sm text-muted-foreground">
              {cascadingDelays.length} delay{cascadingDelays.length !== 1 ? 's' : ''} affecting downstream items
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {criticalCount > 0 && (
            <Badge variant="destructive">{criticalCount} Critical</Badge>
          )}
          {highCount > 0 && (
            <Badge variant="warning">{highCount} High</Badge>
          )}
        </div>
      </div>

      <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
        {cascadingDelays.map((delay, index) => (
          <div
            key={`${delay.sourceId}-${delay.targetId}-${index}`}
            className="flex items-center gap-3 p-3 rounded-lg bg-background/50 border border-border/50"
          >
            {/* Source */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{delay.sourceName}</p>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                <span className="text-destructive font-medium">
                  {delay.delayDays} day{delay.delayDays !== 1 ? 's' : ''} overdue
                </span>
              </div>
            </div>

            {/* Arrow */}
            <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />

            {/* Target */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{delay.targetName}</p>
              <p className="text-xs text-muted-foreground">Blocked</p>
            </div>

            {/* Impact Badge */}
            <Badge variant={impactColors[delay.impactLevel]} className="shrink-0">
              {delay.impactLevel}
            </Badge>
          </div>
        ))}
      </div>

      <div className="mt-4 pt-4 border-t border-border/50">
        <p className="text-xs text-muted-foreground">
          💡 Resolve delayed blockers to unblock downstream items and prevent further cascading.
        </p>
      </div>
    </Card>
  );
}
