'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Survey, Question, QuestionType } from '@/lib/schemas/survey';
import { useSurveyStore } from '@/lib/store/surveyStore';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { QuestionEditor } from './QuestionEditor';
import { Select } from '@/components/ui/Select';

const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

const createDefaultQuestion = (type: QuestionType, order: number): Question => {
  const base = {
    id: generateId(),
    title: '',
    required: false,
    order,
  };

  switch (type) {
    case 'multiple-choice':
      return {
        ...base,
        type: 'multiple-choice',
        options: [
          { id: generateId(), label: 'Option 1', value: 'option1' },
          { id: generateId(), label: 'Option 2', value: 'option2' },
        ],
        allowMultiple: false,
        allowOther: false,
      };
    case 'rating-scale':
      return {
        ...base,
        type: 'rating-scale',
        scale: { min: 1, max: 5, step: 1 },
      };
    case 'numeric':
      return { ...base, type: 'numeric' };
    case 'text':
      return { ...base, type: 'text', multiline: false };
    case 'ranking':
      return {
        ...base,
        type: 'ranking',
        ranking: {
          options: [
            { id: generateId(), label: 'Option 1' },
            { id: generateId(), label: 'Option 2' },
          ],
          allowTies: false,
        },
      };
    case 'matrix':
      return {
        ...base,
        type: 'matrix',
        matrix: {
          rows: [{ id: generateId(), label: 'Row 1' }],
          columns: [{ id: generateId(), label: 'Column 1' }],
          type: 'single',
        },
      };
  }
};

interface SurveyBuilderProps {
  surveyId?: string;
}

export const SurveyBuilder: React.FC<SurveyBuilderProps> = ({ surveyId }) => {
  const router = useRouter();
  const { currentSurvey, createSurvey, updateSurvey, setCurrentSurvey, loadSurveys } = useSurveyStore();
  const [survey, setSurvey] = useState<Partial<Survey>>({
    title: '',
    description: '',
    questions: [],
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (surveyId && currentSurvey?.id === surveyId) {
      setSurvey(currentSurvey);
    } else if (surveyId) {
      loadSurveys().then(() => {
        // Find survey by ID
      });
    }
  }, [surveyId, currentSurvey, loadSurveys]);

  const handleAddQuestion = (type: QuestionType) => {
    const newQuestion = createDefaultQuestion(type, survey.questions?.length || 0);
    setSurvey({
      ...survey,
      questions: [...(survey.questions || []), newQuestion],
    });
  };

  const handleUpdateQuestion = (index: number, updatedQuestion: Question) => {
    const newQuestions = [...(survey.questions || [])];
    newQuestions[index] = updatedQuestion;
    setSurvey({ ...survey, questions: newQuestions });
  };

  const handleDeleteQuestion = (index: number) => {
    const newQuestions = (survey.questions || []).filter((_, i) => i !== index);
    // Reorder questions
    newQuestions.forEach((q, i) => {
      q.order = i;
    });
    setSurvey({ ...survey, questions: newQuestions });
  };

  const handleMoveQuestion = (index: number, direction: 'up' | 'down') => {
    const newQuestions = [...(survey.questions || [])];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newQuestions.length) return;

    [newQuestions[index], newQuestions[targetIndex]] = [
      newQuestions[targetIndex],
      newQuestions[index],
    ];
    newQuestions.forEach((q, i) => {
      q.order = i;
    });
    setSurvey({ ...survey, questions: newQuestions });
  };

  const handleSave = async () => {
    const newErrors: Record<string, string> = {};

    if (!survey.title || survey.title.trim() === '') {
      newErrors.title = 'Survey title is required';
    }

    if (!survey.questions || survey.questions.length === 0) {
      newErrors.questions = 'At least one question is required';
    }

    // Comprehensive validation for each question
    survey.questions?.forEach((q, index) => {
      if (!q.title || q.title.trim() === '') {
        newErrors[`question-${index}`] = 'Question title is required';
      }

      // Type-specific validation
      if (q.type === 'multiple-choice') {
        if (!q.options || q.options.length < 2) {
          newErrors[`question-${index}`] = 'Multiple choice questions need at least 2 options';
        }
        // Check for duplicate option values
        const optionValues = q.options.map(opt => String(opt.value));
        const uniqueValues = new Set(optionValues);
        if (optionValues.length !== uniqueValues.size) {
          newErrors[`question-${index}`] = 'Multiple choice options must have unique values';
        }
      }

      if (q.type === 'rating-scale') {
        if (q.scale.min >= q.scale.max) {
          newErrors[`question-${index}`] = 'Rating scale minimum must be less than maximum';
        }
        if (q.scale.min < 1 || q.scale.max > 100) {
          newErrors[`question-${index}`] = 'Rating scale must be between 1 and 100';
        }
      }

      if (q.type === 'numeric') {
        if (q.min !== undefined && q.max !== undefined && q.min >= q.max) {
          newErrors[`question-${index}`] = 'Numeric range minimum must be less than maximum';
        }
      }

      if (q.type === 'ranking') {
        if (!q.ranking.options || q.ranking.options.length < 2) {
          newErrors[`question-${index}`] = 'Ranking questions need at least 2 options';
        }
      }

      if (q.type === 'matrix') {
        if (!q.matrix.rows || q.matrix.rows.length === 0) {
          newErrors[`question-${index}`] = 'Matrix questions need at least one row';
        }
        if (!q.matrix.columns || q.matrix.columns.length === 0) {
          newErrors[`question-${index}`] = 'Matrix questions need at least one column';
        }
      }
    });

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    try {
      // Validate with Zod schema before saving
      const surveyToSave = {
        id: surveyId || `survey-${Date.now()}`,
        title: survey.title!,
        description: survey.description,
        questions: survey.questions!,
        metadata: survey.metadata,
        createdAt: currentSurvey?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // This will throw if validation fails
      const { SurveySchema } = await import('@/lib/schemas/survey');
      SurveySchema.parse(surveyToSave);

      if (surveyId && currentSurvey) {
        await updateSurvey(surveyToSave as Survey);
      } else {
        const newSurvey = await createSurvey({
          title: survey.title!,
          description: survey.description,
          questions: survey.questions!,
          metadata: survey.metadata,
        });
        router.push(`/surveys/${newSurvey.id}`);
      }
    } catch (error) {
      if (error instanceof Error) {
        setErrors({ general: error.message });
      } else {
        setErrors({ general: 'Failed to save survey. Please check all fields are valid.' });
      }
      console.error('Failed to save survey:', error);
    }
  };

  const questionTypes: Array<{ value: QuestionType; label: string }> = [
    { value: 'multiple-choice', label: 'Multiple Choice' },
    { value: 'rating-scale', label: 'Rating Scale' },
    { value: 'numeric', label: 'Numeric' },
    { value: 'text', label: 'Text' },
    { value: 'ranking', label: 'Ranking' },
    { value: 'matrix', label: 'Matrix' },
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-4">
          {surveyId ? 'Edit Survey' : 'Create New Survey'}
        </h1>

        <Card>
          <Input
            label="Survey Title"
            value={survey.title || ''}
            onChange={(e) => setSurvey({ ...survey, title: e.target.value })}
            error={errors.title}
            placeholder="Enter survey title"
          />

          <div className="mt-4">
            <Textarea
              label="Description (optional)"
              value={survey.description || ''}
              onChange={(e) => setSurvey({ ...survey, description: e.target.value })}
              placeholder="Enter survey description"
              rows={3}
            />
          </div>
        </Card>
      </div>

      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Questions</h2>
          <Select
            options={questionTypes}
            value=""
            onChange={(e) => {
              if (e.target.value) {
                handleAddQuestion(e.target.value as QuestionType);
                e.target.value = '';
              }
            }}
            className="w-48"
          />
        </div>

        {errors.questions && (
          <p className="text-red-600 text-sm mb-4">{errors.questions}</p>
        )}

        {survey.questions?.map((question, index) => (
          <QuestionEditor
            key={question.id}
            question={question}
            onChange={(updated) => handleUpdateQuestion(index, updated)}
            onDelete={() => handleDeleteQuestion(index)}
            onMoveUp={index > 0 ? () => handleMoveQuestion(index, 'up') : undefined}
            onMoveDown={
              index < (survey.questions?.length || 0) - 1
                ? () => handleMoveQuestion(index, 'down')
                : undefined
            }
          />
        ))}

        {(!survey.questions || survey.questions.length === 0) && (
          <Card>
            <p className="text-gray-500 text-center py-8">
              No questions yet. Add a question to get started.
            </p>
          </Card>
        )}
      </div>

      <div className="flex gap-4">
        <Button onClick={handleSave} variant="primary">
          {surveyId ? 'Update Survey' : 'Create Survey'}
        </Button>
        <Button onClick={() => router.back()} variant="outline">
          Cancel
        </Button>
      </div>
    </div>
  );
};
