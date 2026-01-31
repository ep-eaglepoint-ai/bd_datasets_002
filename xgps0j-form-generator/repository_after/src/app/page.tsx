'use client';

import { useEffect } from 'react';
import { useSurveyStore } from '@/store/surveyStore';
import { databaseService } from '@/services/database';
import SurveyList from '@/components/SurveyList';
import Header from '@/components/Header';
import LoadingSpinner from '@/components/LoadingSpinner';
import ErrorMessage from '@/components/ErrorMessage';

export default function HomePage() {
  const { surveys, isLoading, error, loadSurveys, clearError } = useSurveyStore();

  useEffect(() => {
    const initializeApp = async () => {
      try {
        await databaseService.init();
        await loadSurveys();
      } catch (error) {
        console.error('Failed to initialize app:', error);
      }
    };

    initializeApp();
  }, [loadSurveys]);

  if (isLoading && surveys.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="flex items-center justify-center h-96">
          <LoadingSpinner size="lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-6">
            <ErrorMessage message={error} onDismiss={clearError} />
          </div>
        )}

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Survey Builder & Analytics
          </h1>
          <p className="text-gray-600">
            Create surveys, collect responses, and analyze results - all offline and secure.
          </p>
        </div>

        <SurveyList surveys={surveys} />
      </main>
    </div>
  );
}