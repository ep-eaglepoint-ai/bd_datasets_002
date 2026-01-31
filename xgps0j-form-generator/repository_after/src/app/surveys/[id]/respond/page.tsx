'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSurveyStore } from '@/store/surveyStore';
import { databaseService } from '@/services/database';
import { Response, ResponseAnswer } from '@/types/survey';
import { generateId, validateResponseValue } from '@/utils/helpers';
import SurveyRenderer from '@/components/SurveyRenderer';
import LoadingSpinner from '@/components/LoadingSpinner';
import ErrorMessage from '@/components/ErrorMessage';

export default function RespondSurveyPage() {
  const params = useParams();
  const router = useRouter();
  const surveyId = params.id as string;
  
  const { currentSurvey, isLoading, error, loadSurvey, saveResponse, clearError } = useSurveyStore();
  
  const [currentResponse, setCurrentResponse] = useState<Response | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
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
    if (currentSurvey && !currentResponse) {
      // Initialize new response
      const newResponse: Response = {
        id: generateId(),
        surveyId: currentSurvey.id,
        surveyVersion: currentSurvey.version,
        answers: [],
        startedAt: new Date(),
        isComplete: false,
        completionRate: 0,
      };
      setCurrentResponse(newResponse);
    }
  }, [currentSurvey, currentResponse]);

  const handleAnswerChange = (questionId: string, value: any) => {
    if (!currentResponse || !currentSurvey) return;

    const existingAnswerIndex = currentResponse.answers.findIndex(
      answer => answer.questionId === questionId
    );

    const newAnswer: ResponseAnswer = {
      questionId,
      value,
      timestamp: currentSurvey.settings.collectTimestamps ? new Date() : undefined,
    };

    let updatedAnswers;
    if (existingAnswerIndex >= 0) {
      updatedAnswers = [...currentResponse.answers];
      updatedAnswers[existingAnswerIndex] = newAnswer;
    } else {
      updatedAnswers = [...currentResponse.answers, newAnswer];
    }

    const completionRate = updatedAnswers.length / currentSurvey.questions.length;

    const updatedResponse: Response = {
      ...currentResponse,
      answers: updatedAnswers,
      completionRate,
    };

    setCurrentResponse(updatedResponse);

    // Clear validation error for this question
    if (validationErrors[questionId]) {
      const newErrors = { ...validationErrors };
      delete newErrors[questionId];
      setValidationErrors(newErrors);
    }

    // Auto-save partial response
    saveResponse(updatedResponse);
  };

  const validateResponse = (): boolean => {
    if (!currentResponse || !currentSurvey) return false;

    const errors: Record<string, string> = {};
    let isValid = true;

    currentSurvey.questions.forEach(question => {
      const answer = currentResponse.answers.find(a => a.questionId === question.id);
      const value = answer?.value;

      // Only validate if the question is required or has a value
      if (question.required || (value !== null && value !== undefined && value !== '')) {
        const validation = validateResponseValue(question, value || '');
        if (!validation.isValid) {
          errors[question.id] = validation.error!;
          isValid = false;
        }
      }
    });

    setValidationErrors(errors);
    return isValid;
  };

  const handleSubmit = async () => {
    if (!currentResponse || !currentSurvey) return;

    setIsSubmitting(true);

    try {
      // Validate all responses
      if (!validateResponse()) {
        setIsSubmitting(false);
        return;
      }

      // Calculate completion time
      const timeToComplete = Math.floor(
        (new Date().getTime() - currentResponse.startedAt.getTime()) / 1000
      );

      const completedResponse: Response = {
        ...currentResponse,
        completedAt: new Date(),
        isComplete: true,
        completionRate: 1,
        timeToComplete,
      };

      await saveResponse(completedResponse);

      // Redirect to thank you page
      router.push(`/surveys/${surveyId}/thank-you`);
    } catch (error) {
      console.error('Failed to submit response:', error);
      setIsSubmitting(false);
    }
  };

  const handleSaveDraft = async () => {
    if (!currentResponse) return;

    try {
      await saveResponse(currentResponse);
      alert('Draft saved successfully!');
    } catch (error) {
      console.error('Failed to save draft:', error);
      alert('Failed to save draft. Please try again.');
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
          <ErrorMessage message="Survey not found or not published" />
        </div>
      </div>
    );
  }

  if (!currentSurvey.published) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Survey Not Available
          </h1>
          <p className="text-gray-600">
            This survey is not currently published and cannot be accessed.
          </p>
        </div>
      </div>
    );
  }

  if (!currentResponse) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
              <span>{Math.round(currentResponse.completionRate * 100)}% complete</span>
            </div>
            <div className="progress-bar">
              <div 
                className="progress-fill"
                style={{ width: `${currentResponse.completionRate * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* Survey Form */}
        <SurveyRenderer
          survey={currentSurvey}
          response={currentResponse}
          validationErrors={validationErrors}
          onAnswerChange={handleAnswerChange}
        />

        {/* Actions */}
        <div className="mt-8 flex justify-between items-center">
          <button
            onClick={handleSaveDraft}
            className="btn-secondary"
            disabled={isSubmitting}
          >
            Save Draft
          </button>

          <div className="flex items-center space-x-4">
            {Object.keys(validationErrors).length > 0 && (
              <span className="text-sm text-red-600">
                Please fix the errors above
              </span>
            )}
            
            <button
              onClick={handleSubmit}
              className="btn-primary"
              disabled={isSubmitting || Object.keys(validationErrors).length > 0}
            >
              {isSubmitting ? (
                <>
                  <LoadingSpinner size="sm" className="mr-2" />
                  Submitting...
                </>
              ) : (
                'Submit Survey'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}