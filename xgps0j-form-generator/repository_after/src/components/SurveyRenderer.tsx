'use client';

import { Survey, Response, Question, ResponseValue } from '@/types/survey';
import { validateResponseValue } from '@/utils/helpers';
import { useState } from 'react';

interface SurveyRendererProps {
  survey: Survey;
  response: Response;
  validationErrors: Record<string, string>;
  onAnswerChange: (questionId: string, value: ResponseValue) => void;
}

export default function SurveyRenderer({ 
  survey, 
  response, 
  validationErrors, 
  onAnswerChange 
}: SurveyRendererProps) {
  const [focusedQuestion, setFocusedQuestion] = useState<string | null>(null);

  const getAnswerValue = (questionId: string): ResponseValue => {
    const answer = response.answers.find(a => a.questionId === questionId);
    return answer?.value || '';
  };

  const renderQuestion = (question: Question) => {
    const value = getAnswerValue(question.id);
    const error = validationErrors[question.id];
    const isFocused = focusedQuestion === question.id;

    return (
      <div key={question.id} className="card space-y-4">
        <div className="space-y-2">
          <h3 className="text-lg font-medium text-gray-900">
            {question.title}
            {question.required && <span className="text-red-500 ml-1">*</span>}
          </h3>
          {question.description && (
            <p className="text-sm text-gray-600">{question.description}</p>
          )}
        </div>

        <div className="space-y-3">
          {renderQuestionInput(question, value, error, isFocused)}
          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}
        </div>
      </div>
    );
  };

  const renderQuestionInput = (
    question: Question, 
    value: ResponseValue, 
    error: string | undefined,
    isFocused: boolean
  ) => {
    const inputClass = `input ${error ? 'input-error' : ''}`;
    
    switch (question.type) {
      case 'short_text':
        return (
          <input
            type="text"
            value={value as string || ''}
            onChange={(e) => onAnswerChange(question.id, e.target.value)}
            onFocus={() => setFocusedQuestion(question.id)}
            onBlur={() => setFocusedQuestion(null)}
            className={inputClass}
            placeholder={question.placeholder}
            maxLength={question.maxLength}
          />
        );

      case 'long_text':
        return (
          <textarea
            value={value as string || ''}
            onChange={(e) => onAnswerChange(question.id, e.target.value)}
            onFocus={() => setFocusedQuestion(question.id)}
            onBlur={() => setFocusedQuestion(null)}
            className={`textarea ${error ? 'input-error' : ''}`}
            placeholder={question.placeholder}
            maxLength={question.maxLength}
            rows={4}
          />
        );

      case 'single_choice':
        return (
          <div className="space-y-2">
            {question.options.map((option) => (
              <label key={option.id} className="flex items-center">
                <input
                  type="radio"
                  name={question.id}
                  value={option.value}
                  checked={value === option.value}
                  onChange={(e) => onAnswerChange(question.id, e.target.value)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                />
                <span className="ml-2 text-sm text-gray-900">{option.label}</span>
              </label>
            ))}
          </div>
        );

      case 'multiple_choice':
        const selectedValues = Array.isArray(value) ? value : [];
        return (
          <div className="space-y-2">
            {question.options.map((option) => (
              <label key={option.id} className="flex items-center">
                <input
                  type="checkbox"
                  value={option.value}
                  checked={selectedValues.includes(option.value)}
                  onChange={(e) => {
                    const newValues = e.target.checked
                      ? [...selectedValues, option.value]
                      : selectedValues.filter(v => v !== option.value);
                    onAnswerChange(question.id, newValues);
                  }}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <span className="ml-2 text-sm text-gray-900">{option.label}</span>
              </label>
            ))}
          </div>
        );

      case 'rating_scale':
        return (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm text-gray-600">
              {question.minLabel && <span>{question.minLabel}</span>}
              {question.maxLabel && <span>{question.maxLabel}</span>}
            </div>
            <div className="flex items-center space-x-2">
              {Array.from({ length: question.maxValue - question.minValue + 1 }, (_, i) => {
                const ratingValue = question.minValue + i;
                return (
                  <label key={ratingValue} className="flex flex-col items-center">
                    <input
                      type="radio"
                      name={question.id}
                      value={ratingValue}
                      checked={value === ratingValue}
                      onChange={(e) => onAnswerChange(question.id, parseInt(e.target.value))}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                    />
                    <span className="text-xs text-gray-500 mt-1">{ratingValue}</span>
                  </label>
                );
              })}
            </div>
          </div>
        );

      case 'numeric_input':
        return (
          <input
            type="number"
            value={value as number || ''}
            onChange={(e) => {
              const numValue = question.allowDecimals 
                ? parseFloat(e.target.value) 
                : parseInt(e.target.value);
              onAnswerChange(question.id, isNaN(numValue) ? '' : numValue);
            }}
            onFocus={() => setFocusedQuestion(question.id)}
            onBlur={() => setFocusedQuestion(null)}
            className={inputClass}
            placeholder={question.placeholder}
            min={question.minValue}
            max={question.maxValue}
            step={question.allowDecimals ? "0.01" : "1"}
          />
        );

      case 'boolean':
        return (
          <div className="flex space-x-4">
            <label className="flex items-center">
              <input
                type="radio"
                name={question.id}
                value="true"
                checked={value === true}
                onChange={() => onAnswerChange(question.id, true)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
              />
              <span className="ml-2 text-sm text-gray-900">{question.trueLabel}</span>
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                name={question.id}
                value="false"
                checked={value === false}
                onChange={() => onAnswerChange(question.id, false)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
              />
              <span className="ml-2 text-sm text-gray-900">{question.falseLabel}</span>
            </label>
          </div>
        );

      default:
        return <div>Unsupported question type</div>;
    }
  };

  // Group questions by section
  const questionsBySection = survey.questions.reduce((acc, question) => {
    const sectionId = question.sectionId || 'no-section';
    if (!acc[sectionId]) {
      acc[sectionId] = [];
    }
    acc[sectionId].push(question);
    return acc;
  }, {} as Record<string, Question[]>);

  // Sort questions within each section
  Object.keys(questionsBySection).forEach(sectionId => {
    questionsBySection[sectionId].sort((a, b) => a.order - b.order);
  });

  return (
    <div className="space-y-8">
      {Object.entries(questionsBySection).map(([sectionId, questions]) => {
        const section = survey.sections.find(s => s.id === sectionId);
        
        return (
          <div key={sectionId} className="space-y-6">
            {section && (
              <div className="border-b border-gray-200 pb-4">
                <h2 className="text-xl font-semibold text-gray-900">
                  {section.title}
                </h2>
                {section.description && (
                  <p className="text-gray-600 mt-1">{section.description}</p>
                )}
              </div>
            )}
            
            <div className="space-y-6">
              {questions.map(renderQuestion)}
            </div>
          </div>
        );
      })}
    </div>
  );
}