'use client';

import React, { useMemo } from 'react';
import {
  RadialBarChart,
  RadialBar,
  ResponsiveContainer,
  Cell,
  Legend,
  Tooltip,
} from 'recharts';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { AlertTriangle, CheckCircle2, XCircle, HelpCircle } from 'lucide-react';

interface CompletionProbabilityChartProps {
  probability: number;
  confidence: 'high' | 'medium' | 'low' | 'insufficient_data';
  riskFactors: string[];
  positiveFactors: string[];
}

export function CompletionProbabilityChart({ 
  probability, 
  confidence, 
  riskFactors, 
  positiveFactors 
}: CompletionProbabilityChartProps) {
  const data = useMemo(() => [
    { name: 'Probability', value: probability, fill: 'hsl(var(--primary))' },
    { name: 'Remaining', value: 100 - probability, fill: 'hsl(var(--muted))' },
  ], [probability]);

  const getConfidenceColor = (conf: string) => {
    switch (conf) {
      case 'high': return 'success';
      case 'medium': return 'warning';
      case 'low': return 'destructive';
      default: return 'secondary';
    }
  };

  const getConfidenceIcon = (conf: string) => {
    switch (conf) {
      case 'high': return <CheckCircle2 className="w-4 h-4" />;
      case 'medium': return <AlertTriangle className="w-4 h-4" />;
      case 'low': return <XCircle className="w-4 h-4" />;
      default: return <HelpCircle className="w-4 h-4" />;
    }
  };

  const getProbabilityColor = (prob: number) => {
    if (prob >= 70) return 'hsl(142, 76%, 36%)'; // green
    if (prob >= 40) return 'hsl(45, 93%, 47%)'; // yellow
    return 'hsl(0, 84%, 60%)'; // red
  };

  return (
    <Card variant="glass" className="h-[400px] flex flex-col">
      <div className="mb-4 flex justify-between items-start">
        <div>
          <h3 className="text-lg font-semibold tracking-tight">Completion Probability</h3>
          <p className="text-xs text-muted-foreground">Based on current progress and patterns</p>
        </div>
        <Badge variant={getConfidenceColor(confidence)} className="gap-1">
          {getConfidenceIcon(confidence)}
          {confidence} confidence
        </Badge>
      </div>
      
      <div className="flex-1 w-full min-h-0 relative">
        <ResponsiveContainer width="100%" height="100%">
          <RadialBarChart 
            cx="50%" 
            cy="50%" 
            innerRadius="60%" 
            outerRadius="90%" 
            data={[data[0]]}
            startAngle={180}
            endAngle={0}
          >
            <RadialBar
              dataKey="value"
              cornerRadius={10}
              fill={getProbabilityColor(probability)}
              background={{ fill: 'hsl(var(--muted))' }}
            />
          </RadialBarChart>
        </ResponsiveContainer>
        
        {/* Center text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span 
            className="text-5xl font-bold"
            style={{ color: getProbabilityColor(probability) }}
          >
            {probability}%
          </span>
          <span className="text-sm text-muted-foreground">Success Rate</span>
        </div>
      </div>

      {/* Risk and Positive Factors */}
      <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-border/50">
        <div>
          <h4 className="text-xs font-semibold text-destructive mb-2 flex items-center gap-1">
            <XCircle className="w-3 h-3" /> Risk Factors
          </h4>
          <ul className="space-y-1">
            {riskFactors.slice(0, 3).map((factor, i) => (
              <li key={i} className="text-xs text-muted-foreground truncate">
                • {factor}
              </li>
            ))}
            {riskFactors.length === 0 && (
              <li className="text-xs text-muted-foreground italic">None identified</li>
            )}
          </ul>
        </div>
        <div>
          <h4 className="text-xs font-semibold text-green-500 mb-2 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> Positive Factors
          </h4>
          <ul className="space-y-1">
            {positiveFactors.slice(0, 3).map((factor, i) => (
              <li key={i} className="text-xs text-muted-foreground truncate">
                • {factor}
              </li>
            ))}
            {positiveFactors.length === 0 && (
              <li className="text-xs text-muted-foreground italic">None identified</li>
            )}
          </ul>
        </div>
      </div>
    </Card>
  );
}
