'use client';

import React, { useState, useMemo } from 'react';
import { SurveyResponse, Survey, DataType } from '@/lib/schemas/survey';
import { useSurveyStore } from '@/lib/store/surveyStore';
import {
  CleaningRule,
  CleaningRuleType,
  applyCleaningPipeline,
  inferDataTypes,
} from '@/lib/utils/dataCleaning';
import { createSnapshotBeforeCleaning, createSnapshotAfterCleaning } from '@/lib/utils/snapshotManager';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Select } from '@/components/ui/Select';
import { Input } from '@/components/ui/Input';

interface DataCleaningPanelProps {
  survey: Survey;
  responses: SurveyResponse[];
}

export const DataCleaningPanel: React.FC<DataCleaningPanelProps> = ({
  survey,
  responses,
}) => {
  const { createSnapshot, setCurrentSnapshot } = useSurveyStore();
  const [rules, setRules] = useState<CleaningRule[]>([]);
  const [selectedQuestion, setSelectedQuestion] = useState<string>('');
  const [snapshotName, setSnapshotName] = useState('');
  const [previewResult, setPreviewResult] = useState<{
    snapshot: any;
    result: any;
  } | null>(null);

  // Infer data types for all questions
  const typeInferences = useMemo(() => {
    const inferences: Record<string, ReturnType<typeof inferDataTypes>> = {};
    survey.questions.forEach(question => {
      inferences[question.id] = inferDataTypes(responses, question.id);
    });
    return inferences;
  }, [survey, responses]);

  const addRule = (type: CleaningRuleType) => {
    const rule: CleaningRule = {
      id: `rule-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      config: {},
      appliedAt: new Date().toISOString(),
    };

    // Set default config based on rule type
    if (type === 'standardize-labels' || type === 'coerce-types' || type === 'flag-outliers') {
      rule.config.questionId = selectedQuestion || survey.questions[0]?.id || '';
    }
    if (type === 'coerce-types') {
      const questionId = rule.config.questionId as string;
      const inference = typeInferences[questionId];
      rule.config.targetType = inference?.inferredType || 'text';
    }
    if (type === 'handle-missing') {
      rule.config.strategy = 'keep';
    }
    if (type === 'remove-duplicates') {
      rule.config.strategy = 'id';
    }

    setRules([...rules, rule]);
  };

  const removeRule = (ruleId: string) => {
    setRules(rules.filter(r => r.id !== ruleId));
  };

  const updateRule = (ruleId: string, updates: Partial<CleaningRule>) => {
    setRules(rules.map(r => r.id === ruleId ? { ...r, ...updates } : r));
  };

  const previewCleaning = async () => {
    if (rules.length === 0) return;

    try {
      const { snapshot, result } = await applyCleaningPipeline(
        responses,
        rules,
        survey.id,
        snapshotName || `Cleaned ${new Date().toLocaleString()}`
      );
      setPreviewResult({ snapshot, result });
    } catch (error) {
      console.error('Preview failed:', error);
      alert('Failed to preview cleaning');
    }
  };

  const applyCleaning = async () => {
    if (rules.length === 0 || !snapshotName.trim()) {
      alert('Please add cleaning rules and provide a snapshot name');
      return;
    }

    try {
      // Automatically create before snapshot
      await createSnapshotBeforeCleaning(survey.id, responses, rules);
      
      const { snapshot, result } = await applyCleaningPipeline(
        responses,
        rules,
        survey.id,
        snapshotName
      );

      // After snapshot is already created in applyCleaningPipeline
      setCurrentSnapshot(snapshot);
      alert(`Cleaning applied! ${result.stats.cleanedCount} responses in cleaned dataset. Snapshots created for reproducibility.`);
    } catch (error) {
      console.error('Failed to apply cleaning:', error);
      alert('Failed to apply cleaning');
    }
  };

  const ruleTypes: Array<{ value: CleaningRuleType; label: string }> = [
    { value: 'remove-duplicates', label: 'Remove Duplicates' },
    { value: 'trim-whitespace', label: 'Trim Whitespace' },
    { value: 'normalize-text', label: 'Normalize Text' },
    { value: 'fix-encoding', label: 'Fix Encoding Issues' },
    { value: 'standardize-labels', label: 'Standardize Labels' },
    { value: 'handle-missing', label: 'Handle Missing Values' },
    { value: 'flag-outliers', label: 'Flag Outliers' },
    { value: 'coerce-types', label: 'Coerce Types' },
  ];

  return (
    <div className="space-y-4">
      <Card title="Data Cleaning Pipeline" description="Apply cleaning operations in a non-destructive way">
        <div className="space-y-4">
          <div>
            <Input
              label="Snapshot Name"
              value={snapshotName}
              onChange={(e) => setSnapshotName(e.target.value)}
              placeholder="Enter name for cleaned dataset snapshot"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Question (for question-specific rules)
            </label>
            <Select
              options={survey.questions.map(q => ({
                value: q.id,
                label: `${q.title} (${typeInferences[q.id]?.inferredType || 'unknown'})`,
              }))}
              value={selectedQuestion}
              onChange={(e) => setSelectedQuestion(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Add Cleaning Rule
            </label>
            <div className="flex flex-wrap gap-2">
              {ruleTypes.map(type => (
                <Button
                  key={type.value}
                  variant="outline"
                  size="sm"
                  onClick={() => addRule(type.value)}
                >
                  + {type.label}
                </Button>
              ))}
            </div>
          </div>

          {rules.length > 0 && (
            <div className="mt-4">
              <h3 className="font-semibold mb-2">Cleaning Rules ({rules.length})</h3>
              <div className="space-y-2">
                {rules.map((rule, index) => (
                  <div
                    key={rule.id}
                    className="p-3 bg-gray-50 rounded border flex justify-between items-start"
                  >
                    <div className="flex-1">
                      <div className="font-medium">
                        {index + 1}. {rule.type.replace(/-/g, ' ')}
                      </div>
                      {rule.type === 'coerce-types' && (
                        <div className="mt-2">
                          <Select
                            options={[
                              { value: 'numeric', label: 'Numeric' },
                              { value: 'text', label: 'Text' },
                              { value: 'categorical', label: 'Categorical' },
                              { value: 'ordinal', label: 'Ordinal' },
                              { value: 'boolean', label: 'Boolean' },
                            ]}
                            value={rule.config.targetType as string}
                            onChange={(e) =>
                              updateRule(rule.id, {
                                config: { ...rule.config, targetType: e.target.value },
                              })
                            }
                          />
                          <label className="flex items-center gap-2 mt-2">
                            <input
                              type="checkbox"
                              checked={rule.config.strict as boolean || false}
                              onChange={(e) =>
                                updateRule(rule.id, {
                                  config: {
                                    ...rule.config,
                                    options: {
                                      ...(rule.config.options as object || {}),
                                      strict: e.target.checked,
                                    },
                                  },
                                })
                              }
                              className="rounded"
                            />
                            <span className="text-sm">Strict mode (nullify invalid values)</span>
                          </label>
                        </div>
                      )}
                      {rule.type === 'handle-missing' && (
                        <div className="mt-2">
                          <Select
                            options={[
                              { value: 'keep', label: 'Keep' },
                              { value: 'remove', label: 'Remove' },
                              { value: 'impute-mean', label: 'Impute Mean' },
                              { value: 'impute-mode', label: 'Impute Mode' },
                            ]}
                            value={rule.config.strategy as string}
                            onChange={(e) =>
                              updateRule(rule.id, {
                                config: { ...rule.config, strategy: e.target.value },
                              })
                            }
                          />
                        </div>
                      )}
                    </div>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => removeRule(rule.id)}
                    >
                      Remove
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <Button variant="primary" onClick={previewCleaning} disabled={rules.length === 0}>
              Preview
            </Button>
            <Button
              variant="primary"
              onClick={applyCleaning}
              disabled={rules.length === 0 || !snapshotName.trim()}
            >
              Apply Cleaning & Create Snapshot
            </Button>
          </div>

          {previewResult && (
            <div className="mt-4 p-4 bg-blue-50 rounded">
              <h3 className="font-semibold mb-2">Preview Results</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-gray-600">Original</p>
                  <p className="font-semibold">{previewResult.result.stats.originalCount}</p>
                </div>
                <div>
                  <p className="text-gray-600">Cleaned</p>
                  <p className="font-semibold text-green-600">
                    {previewResult.result.stats.cleanedCount}
                  </p>
                </div>
                <div>
                  <p className="text-gray-600">Removed</p>
                  <p className="font-semibold text-red-600">
                    {previewResult.result.stats.removedCount}
                  </p>
                </div>
                <div>
                  <p className="text-gray-600">Flagged</p>
                  <p className="font-semibold text-yellow-600">
                    {previewResult.result.stats.flaggedCount}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Type Inference Display with Override */}
      <Card title="Data Type Inference & Override">
        <div className="space-y-2">
          {survey.questions.map(question => {
            const inference = typeInferences[question.id];
            if (!inference) return null;

            const hasOverrideRule = rules.some(
              r => r.type === 'coerce-types' && r.config.questionId === question.id
            );

            return (
              <div key={question.id} className="p-3 bg-gray-50 rounded">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <p className="font-medium">{question.title}</p>
                    <p className="text-sm text-gray-600">
                      Inferred: <strong>{inference.inferredType}</strong> (
                      {(inference.confidence * 100).toFixed(0)}% confidence)
                    </p>
                    {inference.mixedTypes && (
                      <p className="text-sm text-yellow-600">⚠️ Mixed types detected</p>
                    )}
                    {inference.sampleValues.length > 0 && (
                      <p className="text-xs text-gray-500 mt-1">
                        Sample: {inference.sampleValues.slice(0, 3).map(v => String(v)).join(', ')}
                        {inference.sampleValues.length > 3 ? '...' : ''}
                      </p>
                    )}
                  </div>
                  <div className="ml-4">
                    {!hasOverrideRule ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const overrideRule: CleaningRule = {
                            id: `rule-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                            type: 'coerce-types',
                            config: {
                              questionId: question.id,
                              targetType: inference.inferredType,
                              options: { strict: false, handleMixed: true },
                            },
                            appliedAt: new Date().toISOString(),
                            description: `Override type for ${question.title}`,
                          };
                          setRules([...rules, overrideRule]);
                        }}
                      >
                        Override Type
                      </Button>
                    ) : (
                      <span className="text-sm text-green-600">Type override active</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
};
