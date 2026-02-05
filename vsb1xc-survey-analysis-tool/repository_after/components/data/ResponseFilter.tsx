'use client';

import React, { useState, useMemo } from 'react';
import { Survey, SurveyResponse } from '@/lib/schemas/survey';
import { Annotation } from '@/lib/schemas/analytics';
import { BiasFlags } from '@/lib/schemas/analytics';
import {
  ResponseFilter,
  FilterGroup,
  FilterCondition,
  filterResponses,
  createFilterIndex,
  filterResponsesWithIndex,
} from '@/lib/utils/filtering';
import { computeBiasFlags } from '@/lib/utils/biasDetection';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';

interface ResponseFilterProps {
  survey: Survey;
  responses: SurveyResponse[];
  annotations: Annotation[];
  onFilterChange: (filteredResponses: SurveyResponse[]) => void;
}

export const ResponseFilter: React.FC<ResponseFilterProps> = ({
  survey,
  responses,
  annotations,
  onFilterChange,
}) => {
  const [filter, setFilter] = useState<ResponseFilter>({
    groups: [],
    groupLogic: 'AND',
  });
  const [activeGroupIndex, setActiveGroupIndex] = useState(0);

  // Pre-compute bias flags and annotation maps for performance
  const biasFlags = useMemo(() => {
    const map = new Map<string, BiasFlags>();
    responses.forEach(response => {
      map.set(response.id, computeBiasFlags(response, survey, responses));
    });
    return map;
  }, [responses, survey]);

  const annotationData = useMemo(() => {
    return annotations.map(ann => ({
      responseId: ann.responseId,
      codes: ann.codes,
      themes: ann.themes,
    }));
  }, [annotations]);

  // Create index for fast filtering
  const filterIndex = useMemo(() => {
    return createFilterIndex(responses, survey);
  }, [responses, survey]);

  // Apply filter
  const filteredResponses = useMemo(() => {
    if (filter.groups.length === 0 || filter.groups.every(g => g.conditions.length === 0)) {
      return responses;
    }

    // Use indexed filtering for better performance
    return filterResponsesWithIndex(
      responses,
      survey,
      filter,
      filterIndex,
      {
        biasFlags,
        annotations: annotationData,
      }
    );
  }, [responses, survey, filter, filterIndex, biasFlags, annotationData]);

  React.useEffect(() => {
    onFilterChange(filteredResponses);
  }, [filteredResponses, onFilterChange]);

  const addGroup = () => {
    setFilter({
      ...filter,
      groups: [...filter.groups, { conditions: [], logic: 'AND' }],
    });
    setActiveGroupIndex(filter.groups.length);
  };

  const removeGroup = (index: number) => {
    setFilter({
      ...filter,
      groups: filter.groups.filter((_, i) => i !== index),
    });
    if (activeGroupIndex >= filter.groups.length - 1) {
      setActiveGroupIndex(Math.max(0, activeGroupIndex - 1));
    }
  };

  const addCondition = (groupIndex: number) => {
    const newGroups = [...filter.groups];
    newGroups[groupIndex] = {
      ...newGroups[groupIndex],
      conditions: [
        ...newGroups[groupIndex].conditions,
        {
          field: 'question',
          operator: 'equals',
          value: '',
        },
      ],
    };
    setFilter({ ...filter, groups: newGroups });
  };

  const removeCondition = (groupIndex: number, conditionIndex: number) => {
    const newGroups = [...filter.groups];
    newGroups[groupIndex] = {
      ...newGroups[groupIndex],
      conditions: newGroups[groupIndex].conditions.filter((_, i) => i !== conditionIndex),
    };
    setFilter({ ...filter, groups: newGroups });
  };

  const updateCondition = (
    groupIndex: number,
    conditionIndex: number,
    updates: Partial<FilterCondition>
  ) => {
    const newGroups = [...filter.groups];
    newGroups[groupIndex] = {
      ...newGroups[groupIndex],
      conditions: newGroups[groupIndex].conditions.map((cond, i) =>
        i === conditionIndex ? { ...cond, ...updates } : cond
      ),
    };
    setFilter({ ...filter, groups: newGroups });
  };

  const updateGroupLogic = (groupIndex: number, logic: 'AND' | 'OR') => {
    const newGroups = [...filter.groups];
    newGroups[groupIndex] = { ...newGroups[groupIndex], logic };
    setFilter({ ...filter, groups: newGroups });
  };

  const fieldOptions = [
    { value: 'question', label: 'Question Answer' },
    { value: 'demographic', label: 'Demographic Variable' },
    { value: 'timestamp', label: 'Timestamp' },
    { value: 'completion', label: 'Completion Status' },
    { value: 'bias-flag', label: 'Bias Flag' },
    { value: 'annotation', label: 'Annotation Tag' },
  ];

  const operatorOptions: Record<string, Array<{ value: string; label: string }>> = {
    question: [
      { value: 'equals', label: 'Equals' },
      { value: 'not-equals', label: 'Not Equals' },
      { value: 'contains', label: 'Contains' },
      { value: 'greater-than', label: 'Greater Than' },
      { value: 'less-than', label: 'Less Than' },
      { value: 'in', label: 'In (list)' },
      { value: 'not-in', label: 'Not In (list)' },
      { value: 'is-null', label: 'Is Empty' },
      { value: 'is-not-null', label: 'Is Not Empty' },
    ],
    timestamp: [
      { value: 'greater-than', label: 'After' },
      { value: 'less-than', label: 'Before' },
      { value: 'between', label: 'Between' },
    ],
    completion: [
      { value: 'equals', label: 'Equals' },
      { value: 'not-equals', label: 'Not Equals' },
    ],
    'bias-flag': [
      { value: 'equals', label: 'Has Flag' },
    ],
    annotation: [
      { value: 'equals', label: 'Has Tag' },
      { value: 'is-null', label: 'No Annotation' },
    ],
  };

  // Get all unique codes and themes from annotations
  const allCodes = useMemo(() => {
    const codes = new Set<string>();
    annotations.forEach(ann => ann.codes.forEach(code => codes.add(code)));
    return Array.from(codes);
  }, [annotations]);

  const allThemes = useMemo(() => {
    const themes = new Set<string>();
    annotations.forEach(ann => ann.themes.forEach(theme => themes.add(theme)));
    return Array.from(themes);
  }, [annotations]);

  // Get all unique bias flags
  const allBiasFlags = useMemo(() => {
    const flags = new Set<string>();
    Array.from(biasFlags.values()).forEach(flag => {
      flag.flags.forEach(f => flags.add(f));
    });
    return Array.from(flags);
  }, [biasFlags]);

  return (
    <Card
      title="Response Filter"
      description={`${filteredResponses.length} of ${responses.length} responses match filter`}
    >
      <div className="space-y-4">
        <div className="flex gap-2 items-center">
          <Select
            options={[
              { value: 'AND', label: 'All groups (AND)' },
              { value: 'OR', label: 'Any group (OR)' },
            ]}
            value={filter.groupLogic}
            onChange={(e) => setFilter({ ...filter, groupLogic: e.target.value as 'AND' | 'OR' })}
            className="w-48"
          />
          <Button variant="outline" size="sm" onClick={addGroup}>
            + Add Group
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setFilter({ groups: [], groupLogic: 'AND' })}
          >
            Clear All
          </Button>
        </div>

        {filter.groups.map((group, groupIndex) => (
          <div key={groupIndex} className="p-4 border rounded-lg bg-gray-50">
            <div className="flex justify-between items-center mb-2">
              <Select
                options={[
                  { value: 'AND', label: 'All conditions (AND)' },
                  { value: 'OR', label: 'Any condition (OR)' },
                ]}
                value={group.logic}
                onChange={(e) => updateGroupLogic(groupIndex, e.target.value as 'AND' | 'OR')}
                className="w-40"
              />
              <Button
                variant="danger"
                size="sm"
                onClick={() => removeGroup(groupIndex)}
              >
                Remove Group
              </Button>
            </div>

            <div className="space-y-2">
              {group.conditions.map((condition, conditionIndex) => (
                <div key={conditionIndex} className="flex gap-2 items-start p-2 bg-white rounded">
                  <Select
                    options={fieldOptions}
                    value={condition.field}
                    onChange={(e) =>
                      updateCondition(groupIndex, conditionIndex, {
                        field: e.target.value as any,
                        operator: 'equals',
                        value: '',
                      })
                    }
                    className="w-40"
                  />

                  {condition.field === 'question' || condition.field === 'demographic' ? (
                    <Select
                      options={survey.questions.map(q => ({
                        value: q.id,
                        label: q.title,
                      }))}
                      value={condition.questionId || ''}
                      onChange={(e) =>
                        updateCondition(groupIndex, conditionIndex, { questionId: e.target.value })
                      }
                      className="w-48"
                    />
                  ) : null}

                  <Select
                    options={operatorOptions[condition.field] || operatorOptions.question}
                    value={condition.operator}
                    onChange={(e) =>
                      updateCondition(groupIndex, conditionIndex, {
                        operator: e.target.value as any,
                      })
                    }
                    className="w-40"
                  />

                  {condition.operator !== 'is-null' && condition.operator !== 'is-not-null' && (
                    <>
                      {condition.field === 'bias-flag' ? (
                        <Select
                          options={allBiasFlags.map(flag => ({
                            value: flag,
                            label: flag.replace(/-/g, ' '),
                          }))}
                          value={String(condition.value || '')}
                          onChange={(e) =>
                            updateCondition(groupIndex, conditionIndex, { value: e.target.value })
                          }
                          className="w-48"
                        />
                      ) : condition.field === 'annotation' ? (
                        <div className="flex gap-2">
                          <Select
                            options={[
                              { value: 'code', label: 'Code' },
                              { value: 'theme', label: 'Theme' },
                            ]}
                            value={(condition.value as any)?.type || 'code'}
                            onChange={(e) =>
                              updateCondition(groupIndex, conditionIndex, {
                                value: {
                                  type: e.target.value,
                                  value: (condition.value as any)?.value || '',
                                },
                              })
                            }
                            className="w-24"
                          />
                          <Select
                            options={
                              (condition.value as any)?.type === 'theme'
                                ? allThemes.map(t => ({ value: t, label: t }))
                                : allCodes.map(c => ({ value: c, label: c }))
                            }
                            value={(condition.value as any)?.value || ''}
                            onChange={(e) =>
                              updateCondition(groupIndex, conditionIndex, {
                                value: {
                                  type: (condition.value as any)?.type || 'code',
                                  value: e.target.value,
                                },
                              })
                            }
                            className="w-48"
                          />
                        </div>
                      ) : condition.field === 'completion' ? (
                        <Select
                          options={[
                            { value: 'true', label: 'Completed' },
                            { value: 'false', label: 'Not Completed' },
                          ]}
                          value={String(condition.value)}
                          onChange={(e) =>
                            updateCondition(groupIndex, conditionIndex, {
                              value: e.target.value === 'true',
                            })
                          }
                          className="w-32"
                        />
                      ) : condition.field === 'timestamp' && condition.operator === 'between' ? (
                        <div className="flex gap-2">
                          <Input
                            type="date"
                            value={(condition.value as any)?.[0] || ''}
                            onChange={(e) =>
                              updateCondition(groupIndex, conditionIndex, {
                                value: [
                                  e.target.value,
                                  (condition.value as any)?.[1] || e.target.value,
                                ],
                              })
                            }
                            className="w-32"
                          />
                          <Input
                            type="date"
                            value={(condition.value as any)?.[1] || ''}
                            onChange={(e) =>
                              updateCondition(groupIndex, conditionIndex, {
                                value: [
                                  (condition.value as any)?.[0] || e.target.value,
                                  e.target.value,
                                ],
                              })
                            }
                            className="w-32"
                          />
                        </div>
                      ) : (
                        <Input
                          type={condition.field === 'timestamp' ? 'date' : 'text'}
                          value={String(condition.value || '')}
                          onChange={(e) => {
                            let value: unknown = e.target.value;
                            if (condition.field === 'timestamp') {
                              value = e.target.value;
                            } else if (condition.operator === 'in' || condition.operator === 'not-in') {
                              value = e.target.value.split(',').map(v => v.trim());
                            }
                            updateCondition(groupIndex, conditionIndex, { value });
                          }}
                          placeholder={
                            condition.operator === 'in' || condition.operator === 'not-in'
                              ? 'value1, value2, ...'
                              : 'Enter value'
                          }
                          className="w-48"
                        />
                      )}
                    </>
                  )}

                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => removeCondition(groupIndex, conditionIndex)}
                  >
                    ×
                  </Button>
                </div>
              ))}

              <Button
                variant="outline"
                size="sm"
                onClick={() => addCondition(groupIndex)}
              >
                + Add Condition
              </Button>
            </div>
          </div>
        ))}

        {filter.groups.length === 0 && (
          <p className="text-gray-500 text-center py-4">
            No filters applied. Add a filter group to start filtering responses.
          </p>
        )}
      </div>
    </Card>
  );
};
