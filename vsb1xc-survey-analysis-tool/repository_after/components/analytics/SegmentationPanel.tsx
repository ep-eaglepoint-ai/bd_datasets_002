'use client';

import React, { useState, useMemo } from 'react';
import { Survey, SurveyResponse } from '@/lib/schemas/survey';
import { useSurveyStore } from '@/lib/store/surveyStore';
import {
  createSegment,
  analyzeSegment,
  compareSegments,
  validateSegmentComparison,
} from '@/lib/utils/segmentation';
import { createSnapshotForSegmentation } from '@/lib/utils/snapshotManager';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';

interface SegmentationPanelProps {
  survey: Survey;
  responses: SurveyResponse[];
}

export const SegmentationPanel: React.FC<SegmentationPanelProps> = ({ survey, responses }) => {
  const { segments, addSegment } = useSurveyStore();
  const [segmentName, setSegmentName] = useState('');
  const [selectedQuestion, setSelectedQuestion] = useState('');
  const [operator, setOperator] = useState<'equals' | 'in'>('equals');
  const [filterValue, setFilterValue] = useState('');
  const [comparisonQuestion, setComparisonQuestion] = useState('');

  const surveySegments = useMemo(() => {
    return segments.filter(s => s.surveyId === survey.id);
  }, [segments, survey.id]);

  const handleCreateSegment = async () => {
    if (!segmentName.trim() || !selectedQuestion) {
      alert('Please provide segment name and select a question');
      return;
    }

    const question = survey.questions.find(q => q.id === selectedQuestion);
    if (!question) return;

    // Parse filter value based on operator
    let parsedValue: string | number | Array<string | number> = filterValue;
    
    if (operator === 'in') {
      parsedValue = filterValue.split(',').map(v => v.trim());
    } else if (question.type === 'numeric' || question.type === 'rating-scale') {
      const num = parseFloat(filterValue);
      if (!isNaN(num)) {
        parsedValue = num;
      }
    }

    const segment = createSegment(responses, survey, segmentName, {
      questionId: selectedQuestion,
      operator,
      value: parsedValue,
    });

    await addSegment(segment);
    
    // Create snapshot for segmentation change
    const segmentResponses = responses.filter(r => segment.responseIds.includes(r.id));
    await createSnapshotForSegmentation(survey.id, segmentResponses, segment);
    
    setSegmentName('');
    setFilterValue('');
  };

  const comparison = useMemo(() => {
    if (surveySegments.length === 0 || !comparisonQuestion) return null;
    return compareSegments(surveySegments, responses, survey, comparisonQuestion);
  }, [surveySegments, responses, survey, comparisonQuestion]);

  const validation = useMemo(() => {
    if (!comparison) return null;
    return validateSegmentComparison(comparison);
  }, [comparison]);

  return (
    <div className="space-y-4">
      <Card title="Create Segment" description="Segment responses by demographic or categorical variables">
        <div className="space-y-4">
          <Input
            label="Segment Name"
            value={segmentName}
            onChange={(e) => setSegmentName(e.target.value)}
            placeholder="e.g., Age 18-25, Female, High Income"
          />

          <Select
            label="Filter By Question"
            options={survey.questions.map(q => ({
              value: q.id,
              label: q.title,
            }))}
            value={selectedQuestion}
            onChange={(e) => setSelectedQuestion(e.target.value)}
          />

          <Select
            label="Operator"
            options={[
              { value: 'equals', label: 'Equals' },
              { value: 'not-equals', label: 'Not Equals' },
              { value: 'in', label: 'In (comma-separated)' },
              { value: 'contains', label: 'Contains' },
              { value: 'greater-than', label: 'Greater Than' },
              { value: 'less-than', label: 'Less Than' },
            ]}
            value={operator}
            onChange={(e) => setOperator(e.target.value as any)}
          />

          <Input
            label="Filter Value"
            value={filterValue}
            onChange={(e) => setFilterValue(e.target.value)}
            placeholder={operator === 'in' ? 'value1, value2, value3' : 'Enter value'}
          />

          <Button variant="primary" onClick={handleCreateSegment}>
            Create Segment
          </Button>
        </div>
      </Card>

      {surveySegments.length > 0 && (
        <Card title="Segments">
          <div className="space-y-2 mb-4">
            {surveySegments.map(segment => {
              const analysis = analyzeSegment(segment, responses, survey);
              return (
                <div key={segment.id} className="p-3 bg-gray-50 rounded">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium">{segment.name}</p>
                      <p className="text-sm text-gray-600">
                        {analysis.summary.count} responses (
                        {(analysis.summary.proportion * 100).toFixed(1)}% of total)
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-4">
            <Select
              label="Compare Segments By Question"
              options={survey.questions.map(q => ({
                value: q.id,
                label: q.title,
              }))}
              value={comparisonQuestion}
              onChange={(e) => setComparisonQuestion(e.target.value)}
            />

            {comparison && (
              <div className="mt-4">
                <h3 className="font-semibold mb-2">Comparative Analysis</h3>
                {validation && (
                  <div className="mb-4 p-3 bg-yellow-50 rounded">
                    {validation.warnings.length > 0 && (
                      <div>
                        <p className="font-medium text-yellow-800">Warnings:</p>
                        <ul className="list-disc list-inside text-sm text-yellow-700">
                          {validation.warnings.map((w, i) => (
                            <li key={i}>{w}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {validation.recommendations.length > 0 && (
                      <div className="mt-2">
                        <p className="font-medium text-blue-800">Recommendations:</p>
                        <ul className="list-disc list-inside text-sm text-blue-700">
                          {validation.recommendations.map((r, i) => (
                            <li key={i}>{r}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}

                <div className="space-y-4">
                  {comparison.comparisons[0]?.segmentComparisons.map(segComp => (
                    <div key={segComp.segmentId} className="p-3 bg-gray-50 rounded">
                      <p className="font-medium">{segComp.segmentName}</p>
                      {segComp.mean !== undefined && (
                        <p className="text-sm">Mean: {segComp.mean.toFixed(2)}</p>
                      )}
                      {segComp.median !== undefined && (
                        <p className="text-sm">Median: {segComp.median.toFixed(2)}</p>
                      )}
                      {segComp.proportion !== undefined && (
                        <p className="text-sm">
                          Proportion: {(segComp.proportion * 100).toFixed(1)}%
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Card>
      )}
    </div>
  );
};
