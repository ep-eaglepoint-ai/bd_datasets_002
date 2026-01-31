'use client';

import React, { useState, useEffect } from 'react';
import { useGoalStore } from '@/lib/store';
import { GoalList } from '@/components/GoalList';
import { GoalDetail } from '@/components/GoalDetail';
import { GoalForm } from '@/components/GoalForms';
import { AnalyticsDashboard } from '@/components/AnalyticsDashboard';
import { AppLayout } from '@/components/layout/AppLayout';
import { Modal } from '@/components/ui/Modal';
import { DataExportModal } from '@/components/forms/DataExportModal';
import { DataImportModal } from '@/components/forms/DataImportModal';

export default function Home() {
  const { initialize, isLoading, selectedGoalId, selectGoal } = useGoalStore();
  
  const [activeView, setActiveView] = useState<'goals' | 'analytics' | 'settings'>('goals');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  
  // Initialize store on mount
  useEffect(() => {
    initialize();
  }, [initialize]);
  
  // Handle detail modal close
  const closeDetail = () => selectGoal(null);

  return (
    <AppLayout 
      activeView={activeView} 
      onViewChange={setActiveView}
      onCreateClick={() => setShowCreateForm(true)}
      onExportClick={() => setShowExportModal(true)}
      onImportClick={() => setShowImportModal(true)}
    >
      <div className="relative">
        {/* Main Content Areas */}
        {activeView === 'goals' && (
          <GoalList onGoalSelect={(id) => selectGoal(id)} />
        )}
        
        {activeView === 'analytics' && (
          <AnalyticsDashboard />
        )}

        {activeView === 'settings' && (
          <div className="flex items-center justify-center h-[50vh] text-muted-foreground">
             Settings coming soon...
          </div>
        )}
        
        {/* Detail View Modal/Slide-over */}
        {selectedGoalId && (
          <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
             <div className="w-full max-w-4xl h-full bg-background border-l border-white/10 shadow-2xl animate-in slide-in-from-right duration-300">
                <GoalDetail goalId={selectedGoalId} onClose={closeDetail} />
             </div>
             {/* Click outside to close */}
             <div className="absolute inset-0 -z-10" onClick={closeDetail} />
          </div>
        )}
        
        {/* Create Modal */}
        {showCreateForm && (
           <GoalForm onClose={() => setShowCreateForm(false)} />
        )}

        {/* Export Modal */}
        {showExportModal && (
           <DataExportModal onClose={() => setShowExportModal(false)} />
        )}

        {/* Import Modal */}
        {showImportModal && (
           <DataImportModal onClose={() => setShowImportModal(false)} />
        )}
      </div>
    </AppLayout>
  );
}

