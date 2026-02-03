import React from 'react';
import { Target, PlayCircle, CheckCircle2, Clipboard, BarChart2, AlertTriangle } from 'lucide-react';
import { useGoalStore } from '@/lib/store';
import { Card } from '@/components/ui/Card';

export function GoalStats() {
  const { goals } = useGoalStore();
  
  const stats = React.useMemo(() => {
    const total = goals.length;
    const active = goals.filter(g => g.state === 'active').length;
    const completed = goals.filter(g => g.state === 'completed').length;
    const planned = goals.filter(g => g.state === 'planned').length;
    
    const avgProgress = total > 0 
      ? Math.round(goals.reduce((sum, g) => sum + g.progress, 0) / total)
      : 0;
    
    const overdue = goals.filter(g => 
      g.targetDate && 
      new Date(g.targetDate) < new Date() && 
      !['completed', 'failed', 'abandoned'].includes(g.state)
    ).length;
    
    return { total, active, completed, planned, avgProgress, overdue };
  }, [goals]);
  
  const statItems = [
    { label: 'Total Goals', value: stats.total, icon: Target, color: 'text-blue-400', bg: 'bg-blue-400/10 border-blue-400/20' },
    { label: 'Active', value: stats.active, icon: PlayCircle, color: 'text-indigo-400', bg: 'bg-indigo-400/10 border-indigo-400/20' },
    { label: 'Completed', value: stats.completed, icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-400/10 border-emerald-400/20' },
    { label: 'Planned', value: stats.planned, icon: Clipboard, color: 'text-slate-400', bg: 'bg-slate-400/10 border-slate-400/20' },
    { label: 'Avg Progress', value: `${stats.avgProgress}%`, icon: BarChart2, color: 'text-purple-400', bg: 'bg-purple-400/10 border-purple-400/20' },
    { label: 'Overdue', value: stats.overdue, icon: AlertTriangle, color: 'text-rose-400', bg: 'bg-rose-400/10 border-rose-400/20' },
  ];
  
  return (
    <div className="grid grid-cols-2 lg:grid-cols-6 gap-3 mb-6">
      {statItems.map(stat => (
        <Card 
          key={stat.label} 
          className={`p-4 border backdrop-blur-sm transition-all hover:scale-105 ${stat.bg}`}
          variant="panel"
        >
          <div className="flex flex-col gap-2">
            <div className={`p-2 w-fit rounded-lg ${stat.bg}`}>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </div>
            <div>
              <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{stat.label}</p>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
