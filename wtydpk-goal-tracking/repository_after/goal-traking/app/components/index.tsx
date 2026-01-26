'use client';

// Main Components
export { GoalList } from './GoalList';
export { GoalDetail } from './GoalDetail';
export { GoalForm, MilestoneForm, ProgressUpdateForm } from './GoalForms';
export { AnalyticsDashboard } from './AnalyticsDashboard';

// Sub-components (re-exporting for convenience, though direct imports are preferred)
export { GoalCard } from './goals/GoalCard';
export { GoalStats } from './goals/GoalStats';
export { GoalsFilter } from './goals/GoalsFilter';
export { MilestoneTree } from './goals/MilestoneTree';
export { MilestoneNode } from './goals/MilestoneNode';
export { GoalAnalytics } from './analytics/GoalAnalytics';

// UI Primitives
export { Card } from './ui/Card';
export { Button } from './ui/Button';
export { Badge } from './ui/Badge';
export { ProgressBar } from './ui/ProgressBar';
export { Modal } from './ui/Modal';
export { Tabs } from './ui/Tabs';

// Charts
export { ProgressTimelineChart } from './analytics/charts/ProgressTimeline';
export { GoalStateDistributionChart } from './analytics/charts/StateDistribution';
export { ConsistencyHeatmap } from './analytics/charts/ConsistencyHeatmap';
export { MotivationTrendChart } from './analytics/charts/MotivationTrend';
export { PriorityDistributionChart } from './analytics/charts/PriorityDistribution';
export { TrendSummaryCard } from './analytics/charts/TrendSummary';
