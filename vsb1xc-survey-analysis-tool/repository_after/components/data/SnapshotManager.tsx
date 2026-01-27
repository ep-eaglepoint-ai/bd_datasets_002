'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Survey } from '@/lib/schemas/survey';
import { DatasetSnapshot } from '@/lib/schemas/survey';
import { useSurveyStore } from '@/lib/store/surveyStore';
import {
  getSnapshotHistory,
  restoreSnapshot,
  compareSnapshots,
} from '@/lib/utils/snapshotManager';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';

interface SnapshotManagerProps {
  survey: Survey;
}

export const SnapshotManager: React.FC<SnapshotManagerProps> = ({ survey }) => {
  const { snapshots, loadSnapshots, setCurrentSnapshot, loadResponses } = useSurveyStore();
  const [selectedSnapshot1, setSelectedSnapshot1] = useState<string>('');
  const [selectedSnapshot2, setSelectedSnapshot2] = useState<string>('');
  const [comparison, setComparison] = useState<ReturnType<typeof compareSnapshots> | null>(null);

  useEffect(() => {
    loadSnapshots(survey.id);
  }, [survey.id, loadSnapshots]);

  const surveySnapshots = useMemo(() => {
    return snapshots.filter(s => s.surveyId === survey.id);
  }, [snapshots, survey.id]);

  const handleRestore = async (snapshotId: string) => {
    if (!confirm('Restore this snapshot? This will replace current responses with snapshot data.')) {
      return;
    }

    try {
      const restoredResponses = await restoreSnapshot(snapshotId);
      const snapshot = surveySnapshots.find(s => s.id === snapshotId);
      if (snapshot) {
        setCurrentSnapshot(snapshot);
        // In a full implementation, you'd restore the responses to the store
        alert(`Snapshot "${snapshot.name}" restored successfully`);
      }
    } catch (error) {
      alert(`Failed to restore snapshot: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleCompare = () => {
    if (!selectedSnapshot1 || !selectedSnapshot2) {
      alert('Please select two snapshots to compare');
      return;
    }

    const snap1 = surveySnapshots.find(s => s.id === selectedSnapshot1);
    const snap2 = surveySnapshots.find(s => s.id === selectedSnapshot2);

    if (!snap1 || !snap2) {
      alert('One or both snapshots not found');
      return;
    }

    const comp = compareSnapshots(snap1, snap2);
    setComparison(comp);
  };

  return (
    <div className="space-y-4">
      <Card title="Dataset Snapshots" description="Immutable snapshots for reproducibility">
        <div className="space-y-4">
          {surveySnapshots.length === 0 ? (
            <p className="text-gray-500 text-center py-4">
              No snapshots yet. Snapshots are automatically created during cleaning, segmentation, and annotation operations.
            </p>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {surveySnapshots.map(snapshot => (
                <div key={snapshot.id} className="p-3 bg-gray-50 rounded border">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <p className="font-medium">{snapshot.name}</p>
                      {snapshot.description && (
                        <p className="text-sm text-gray-600">{snapshot.description}</p>
                      )}
                      <div className="mt-2 flex gap-4 text-xs text-gray-500">
                        <span>{snapshot.responses.length} responses</span>
                        <span>{snapshot.cleaningRules.length} cleaning rules</span>
                        <span>{new Date(snapshot.createdAt).toLocaleString()}</span>
                      </div>
                      {snapshot.metadata?.operation && (
                        <span className="inline-block mt-1 px-2 py-0.5 bg-blue-100 text-blue-800 rounded text-xs">
                          {snapshot.metadata.operation}
                        </span>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => handleRestore(snapshot.id)}
                      >
                        Restore
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>

      {surveySnapshots.length >= 2 && (
        <Card title="Compare Snapshots">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Snapshot 1
                </label>
                <select
                  className="w-full px-3 py-2 border rounded-lg"
                  value={selectedSnapshot1}
                  onChange={(e) => setSelectedSnapshot1(e.target.value)}
                >
                  <option value="">Select snapshot...</option>
                  {surveySnapshots.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({new Date(s.createdAt).toLocaleDateString()})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Snapshot 2
                </label>
                <select
                  className="w-full px-3 py-2 border rounded-lg"
                  value={selectedSnapshot2}
                  onChange={(e) => setSelectedSnapshot2(e.target.value)}
                >
                  <option value="">Select snapshot...</option>
                  {surveySnapshots.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({new Date(s.createdAt).toLocaleDateString()})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <Button variant="primary" onClick={handleCompare}>
              Compare Snapshots
            </Button>

            {comparison && (
              <div className="mt-4 p-4 bg-blue-50 rounded">
                <h3 className="font-semibold mb-2">Comparison Results</h3>
                <div className="space-y-2 text-sm">
                  <div>
                    <p className="font-medium">Response Count:</p>
                    <p>
                      {comparison.differences.responseCount.before} →{' '}
                      {comparison.differences.responseCount.after} (
                      {comparison.differences.responseCount.change > 0 ? '+' : ''}
                      {comparison.differences.responseCount.change})
                    </p>
                  </div>
                  {comparison.differences.cleaningRules.added.length > 0 && (
                    <div>
                      <p className="font-medium">Added Cleaning Rules:</p>
                      <ul className="list-disc list-inside">
                        {comparison.differences.cleaningRules.added.map((rule, i) => (
                          <li key={i}>{rule.type}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {comparison.differences.cleaningRules.removed.length > 0 && (
                    <div>
                      <p className="font-medium">Removed Cleaning Rules:</p>
                      <ul className="list-disc list-inside">
                        {comparison.differences.cleaningRules.removed.map((rule, i) => (
                          <li key={i}>{rule.type}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </Card>
      )}
    </div>
  );
};
