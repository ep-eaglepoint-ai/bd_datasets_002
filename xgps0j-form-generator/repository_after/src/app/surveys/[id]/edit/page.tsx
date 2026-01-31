'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSurveyStore } from '@/store/surveyStore';
import { databaseService } from '@/services/database';
import SurveyEditor from '@/components/SurveyEditor';
import Header from '@/components/Header';
import LoadingSpinner from '@/components/LoadingSpinner';
import ErrorMessage from '@/components/ErrorMessage';

export default function EditSurveyPage() {
  const params = useParams();
  const router = useRouter();
  const surveyId = params.id as string;
  
  const { 
    currentSurvey, 
    isLoading, 
    error, 
    loadSurvey, 
    saveSurvey,
    clearError,
    setCurrentSurvey,
    createSurvey
  } = useSurveyStore();

  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  useEffect(() => {
    const initializePage = async () => {
      try {
        await databaseService.init();
        if (surveyId && surveyId !== 'new') {
          await loadSurvey(surveyId);
        } else if (surveyId === 'new') {
          // Create a new survey if it doesn't exist
          const newSurvey = await createSurvey('Untitled Survey', '');
          router.replace(`/surveys/${newSurvey.id}/edit`);
        }
      } catch (error) {
        console.error('Failed to load survey:', error);
      }
    };

    initializePage();
  }, [surveyId, loadSurvey, router, createSurvey]);

  useEffect(() => {
    // Cleanup when component unmounts
    return () => {
      setCurrentSurvey(null);
    };
  }, [setCurrentSurvey]);

  const handleSave = async () => {
    if (currentSurvey) {
      try {
        await saveSurvey(currentSurvey);
        setHasUnsavedChanges(false);
      } catch (error) {
        console.error('Failed to save survey:', error);
      }
    }
  };

  const handleSurveyChange = () => {
    setHasUnsavedChanges(true);
  };

  // Warn about unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="flex items-center justify-center h-96">
          <LoadingSpinner size="lg" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <ErrorMessage message={error} onDismiss={clearError} />
        </div>
      </div>
    );
  }

  if (!currentSurvey) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <ErrorMessage message="Survey not found" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Edit Survey
            </h1>
            <p className="text-gray-600 mt-1">
              Design your survey questions and structure
            </p>
          </div>
          
          <div className="flex items-center space-x-4">
            {hasUnsavedChanges && (
              <span className="text-sm text-yellow-600">
                Unsaved changes
              </span>
            )}
            <button
              onClick={handleSave}
              className="btn-primary"
              disabled={isLoading}
            >
              {isLoading ? <LoadingSpinner size="sm" className="mr-2" /> : null}
              Save Survey
            </button>
          </div>
        </div>

        <SurveyEditor 
          survey={currentSurvey} 
          onChange={handleSurveyChange}
        />
      </main>
    </div>
  );
}