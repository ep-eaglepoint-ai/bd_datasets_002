'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useSurveyStore } from '@/store/surveyStore';
import { databaseService } from '@/services/database';
import { Response, ResponseAnswer } from '@/types/survey';
import { generateId } from '@/utils/helpers';
import SurveyRenderer from '@/components/SurveyRenderer';
import LoadingSpinner from '@/components/LoadingSpinner';
import ErrorMessage from '@/components/ErrorMessage';
import { EyeIcon, XIcon } from 'lucide-react';

export default function PreviewSurveyPage() {
  const params = useParams();
  const surveyId = params.id as string;
  
  const { currentSurvey, isLoading, error, loadSurvey, clearError } = useSurveyStore();
  
  const [previewResponse, setPreviewResponse] = useState<Response | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const initializePage = async () => {
      try {
        await databaseService.init();
        await loadSurvey(surveyId);
      } catch (error) {
        console.error('Failed to load survey:', error);
      }
    };

    initializePage();
  }, [surveyId, loadSurvey]);

  useEffect(() => {
    if (currentSurvey && !previewResponse) {
      // Initialize preview response (not saved to database)
      const newResponse: Response = {
        id: generateId(),
        surveyId: currentSurvey.id,
        surveyVersion: currentSurvey.version,
        answers: [],
        startedAt: new Date(),
        isComplete: false,
        completionRate: 0,
      };
      setPreviewResponse(newResponse);
    }
  }, [currentSurvey, previewResponse]);

  const handleAnswerChange = (questionId: string, value: any) => {
    if (!previewResponse || !currentSurvey) return;

    const existingAnswerIndex = previewResponse.answers.findIndex(
      answer => answer.questionId === questionId
    );

    const newAnswer: ResponseAnswer = {
      questionId,
      value,
      timestamp: currentSurvey.settings.collectTimestamps ? new Date() : undefined,
    };

    let updatedAnswers;
    if (existingAnswerIndex >= 0) {
      updatedAnswers = [...previewResponse.answers];
      updatedAnswers[existingAnswerIndex] = newAnswer;
    } else {
      updatedAnswers = [...previewResponse.answers, newAnswer];
    }

    const completionRate = updatedAnswers.length / currentSurvey.questions.length;

    const updatedResponse: Response = {
      ...previewResponse,
      answers: updatedAnswers,
      completionRate,
    };

    setPreviewResponse(updatedResponse);

    // Clear validation error for this question
    if (validationErrors[questionId]) {
      const newErrors = { ...validationErrors };
      delete newErrors[questionId];
      setValidationErrors(newErrors);
    }
  };

  const handleReset = () => {
    if (currentSurvey) {
      const newResponse: Response = {
        id: generateId(),
        surveyId: currentSurvey.id,
        surveyVersion: currentSurvey.version,
        answers: [],
        startedAt: new Date(),
        isComplete: false,
        completionRate: 0,
      };
      setPreviewResponse(newResponse);
      setValidationErrors({});
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full">
          <ErrorMessage message={error} onDismiss={clearError} />
        </div>
      </div>
    );
  }

  if (!currentSurvey) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full">
          <ErrorMessage message="Survey not found" />
        </div>
      </div>
    );
  }

  if (!previewResponse) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Preview Header */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <EyeIcon className="h-5 w-5 text-blue-600 mr-2" />
              <div>
                <h2 className="text-sm font-medium text-blue-900">
                  Preview Mode
                </h2>
                <p className="text-xs text-blue-700">
                  This is how respondents will see your survey. Responses are not saved.
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={handleReset}
                className="btn-secondary text-xs"
              >
                Reset
              </button>
              <button
                onClick={() => window.close()}
                className="text-blue-600 hover:text-blue-800"
              >
                <XIcon className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Survey Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            {currentSurvey.title}
          </h1>
          {currentSurvey.description && (
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              {currentSurvey.description}
            </p>
          )}
        </div>

        {/* Progress Bar */}
        {currentSurvey.settings.showProgressBar && (
          <div className="mb-8">
            <div className="flex justify-between text-sm text-gray-600 mb-2">
              <span>Progress</span>
              <span>{Math.round(previewResponse.completionRate * 100)}% complete</span>
            </div>
            <div className="progress-bar">
              <div 
                className="progress-fill"
                style={{ width: `${previewResponse.completionRate * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* Survey Form */}
        <SurveyRenderer
          survey={currentSurvey}
          response={previewResponse}
          validationErrors={validationErrors}
          onAnswerChange={handleAnswerChange}
        />

        {/* Preview Actions */}
        <div className="mt-8 flex justify-center">
          <div className="bg-gray-100 rounded-lg p-4 text-center">
            <p className="text-sm text-gray-600 mb-2">
              Preview Mode - Submit button would appear here
            </p>
            <button
              className="btn-primary"
              disabled
            >
              Submit Survey (Preview)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}