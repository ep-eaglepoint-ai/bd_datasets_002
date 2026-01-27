'use client';

import React, { useState, useMemo } from 'react';
import { Survey } from '@/lib/schemas/survey';
import { ResearchInsight, Segment } from '@/lib/schemas/analytics';
import { useSurveyStore } from '@/lib/store/surveyStore';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Select } from '@/components/ui/Select';

interface ResearchInsightsPanelProps {
  survey: Survey;
  segments: Segment[];
}

export const ResearchInsightsPanel: React.FC<ResearchInsightsPanelProps> = ({
  survey,
  segments,
}) => {
  const { insights, addInsight, updateInsight, deleteInsight } = useSurveyStore();
  const [editingInsight, setEditingInsight] = useState<ResearchInsight | null>(null);
  const [showForm, setShowForm] = useState(false);

  const surveyInsights = useMemo(() => {
    return insights.filter(i => i.surveyId === survey.id);
  }, [insights, survey.id]);

  const [formData, setFormData] = useState({
    title: '',
    content: '',
    type: 'note' as ResearchInsight['type'],
    questionId: '',
    segmentId: '',
    linkedFindings: [] as string[],
  });

  const handleSave = async () => {
    if (!formData.title.trim()) {
      alert('Please provide a title');
      return;
    }

    const insight: ResearchInsight = {
      id: editingInsight?.id || `insight-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      surveyId: survey.id,
      questionId: formData.questionId || undefined,
      segmentId: formData.segmentId || undefined,
      title: formData.title,
      content: formData.content,
      type: formData.type,
      linkedFindings: formData.linkedFindings,
      createdAt: editingInsight?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (editingInsight) {
      await updateInsight(insight);
    } else {
      await addInsight(insight);
    }

    setShowForm(false);
    setEditingInsight(null);
    setFormData({
      title: '',
      content: '',
      type: 'note',
      questionId: '',
      segmentId: '',
      linkedFindings: [],
    });
  };

  const handleEdit = (insight: ResearchInsight) => {
    setEditingInsight(insight);
    setFormData({
      title: insight.title,
      content: insight.content,
      type: insight.type,
      questionId: insight.questionId || '',
      segmentId: insight.segmentId || '',
      linkedFindings: insight.linkedFindings,
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this insight?')) {
      await deleteInsight(id);
    }
  };

  const groupedInsights = useMemo(() => {
    const grouped: {
      question: ResearchInsight[];
      segment: ResearchInsight[];
      general: ResearchInsight[];
    } = {
      question: [],
      segment: [],
      general: [],
    };

    surveyInsights.forEach(insight => {
      if (insight.questionId) {
        grouped.question.push(insight);
      } else if (insight.segmentId) {
        grouped.segment.push(insight);
      } else {
        grouped.general.push(insight);
      }
    });

    return grouped;
  }, [surveyInsights]);

  return (
    <div className="space-y-4">
      <Card title="Research Insights" description="Record hypotheses, interpretations, and caveats">
        <div className="mb-4">
          <Button variant="primary" onClick={() => setShowForm(!showForm)}>
            {showForm ? 'Cancel' : '+ Add Insight'}
          </Button>
        </div>

        {showForm && (
          <div className="p-4 bg-gray-50 rounded-lg space-y-4">
            <Input
              label="Title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Enter insight title"
            />

            <Select
              label="Type"
              options={[
                { value: 'hypothesis', label: 'Hypothesis' },
                { value: 'interpretation', label: 'Interpretation' },
                { value: 'caveat', label: 'Caveat' },
                { value: 'finding', label: 'Finding' },
                { value: 'note', label: 'Note' },
              ]}
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
            />

            <Select
              label="Link to Question (optional)"
              options={[
                { value: '', label: 'None' },
                ...survey.questions.map(q => ({
                  value: q.id,
                  label: q.title,
                })),
              ]}
              value={formData.questionId}
              onChange={(e) => setFormData({ ...formData, questionId: e.target.value })}
            />

            <Select
              label="Link to Segment (optional)"
              options={[
                { value: '', label: 'None' },
                ...segments.map(s => ({
                  value: s.id,
                  label: s.name,
                })),
              ]}
              value={formData.segmentId}
              onChange={(e) => setFormData({ ...formData, segmentId: e.target.value })}
            />

            <Textarea
              label="Content"
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              placeholder="Enter insight content..."
              rows={6}
            />

            <div className="flex gap-2">
              <Button variant="primary" onClick={handleSave}>
                {editingInsight ? 'Update' : 'Save'} Insight
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setShowForm(false);
                  setEditingInsight(null);
                  setFormData({
                    title: '',
                    content: '',
                    type: 'note',
                    questionId: '',
                    segmentId: '',
                    linkedFindings: [],
                  });
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Insights by Question */}
        {groupedInsights.question.length > 0 && (
          <div className="mt-6">
            <h3 className="font-semibold mb-2">Insights by Question</h3>
            <div className="space-y-2">
              {groupedInsights.question.map(insight => {
                const question = survey.questions.find(q => q.id === insight.questionId);
                return (
                  <div key={insight.id} className="p-3 bg-blue-50 rounded border border-blue-200">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="font-medium">{insight.title}</p>
                        <p className="text-xs text-gray-600">
                          Linked to: {question?.title || insight.questionId}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(insight)}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => handleDelete(insight.id)}
                        >
                          Delete
                        </Button>
                      </div>
                    </div>
                    <p className="text-sm text-gray-700">{insight.content}</p>
                    <div className="mt-2 flex gap-2">
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                        {insight.type}
                      </span>
                      <span className="text-xs text-gray-500">
                        {new Date(insight.updatedAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Insights by Segment */}
        {groupedInsights.segment.length > 0 && (
          <div className="mt-6">
            <h3 className="font-semibold mb-2">Insights by Segment</h3>
            <div className="space-y-2">
              {groupedInsights.segment.map(insight => {
                const segment = segments.find(s => s.id === insight.segmentId);
                return (
                  <div key={insight.id} className="p-3 bg-purple-50 rounded border border-purple-200">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="font-medium">{insight.title}</p>
                        <p className="text-xs text-gray-600">
                          Linked to: {segment?.name || insight.segmentId}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(insight)}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => handleDelete(insight.id)}
                        >
                          Delete
                        </Button>
                      </div>
                    </div>
                    <p className="text-sm text-gray-700">{insight.content}</p>
                    <div className="mt-2 flex gap-2">
                      <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded text-xs">
                        {insight.type}
                      </span>
                      <span className="text-xs text-gray-500">
                        {new Date(insight.updatedAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* General Insights */}
        {groupedInsights.general.length > 0 && (
          <div className="mt-6">
            <h3 className="font-semibold mb-2">General Insights</h3>
            <div className="space-y-2">
              {groupedInsights.general.map(insight => (
                <div key={insight.id} className="p-3 bg-gray-50 rounded border">
                  <div className="flex justify-between items-start mb-2">
                    <p className="font-medium">{insight.title}</p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(insight)}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => handleDelete(insight.id)}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                  <p className="text-sm text-gray-700">{insight.content}</p>
                  <div className="mt-2 flex gap-2">
                    <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded text-xs">
                      {insight.type}
                    </span>
                    <span className="text-xs text-gray-500">
                      {new Date(insight.updatedAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {surveyInsights.length === 0 && !showForm && (
          <p className="text-gray-500 text-center py-8">
            No insights recorded yet. Add an insight to document your research findings.
          </p>
        )}
      </Card>
    </div>
  );
};
