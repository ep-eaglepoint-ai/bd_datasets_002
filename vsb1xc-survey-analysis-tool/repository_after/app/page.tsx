'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSurveyStore } from '@/lib/store/surveyStore';
import { storage } from '@/lib/storage/indexeddb';

export default function Home() {
  const router = useRouter();
  const { loadSurveys, surveys } = useSurveyStore();

  useEffect(() => {
    const init = async () => {
      await storage.init();
      await loadSurveys();
    };
    init();
  }, [loadSurveys]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Survey Analysis Tool</h1>
          <p className="mt-2 text-gray-600">
            Professional survey and research analysis application
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <button
            onClick={() => router.push('/surveys/new')}
            className="bg-primary-600 text-white px-6 py-4 rounded-lg shadow-md hover:bg-primary-700 transition-colors text-left"
          >
            <h2 className="text-xl font-semibold mb-2">Create New Survey</h2>
            <p className="text-primary-100">Design a new survey with multiple question types</p>
          </button>

          <button
            onClick={() => router.push('/surveys')}
            className="bg-white border-2 border-gray-300 px-6 py-4 rounded-lg shadow-md hover:border-primary-500 transition-colors text-left"
          >
            <h2 className="text-xl font-semibold mb-2">View Surveys</h2>
            <p className="text-gray-600">
              {surveys.length} {surveys.length === 1 ? 'survey' : 'surveys'} available
            </p>
          </button>

          <button
            onClick={() => router.push('/analytics')}
            className="bg-white border-2 border-gray-300 px-6 py-4 rounded-lg shadow-md hover:border-primary-500 transition-colors text-left"
          >
            <h2 className="text-xl font-semibold mb-2">Analytics Dashboard</h2>
            <p className="text-gray-600">View insights and visualizations</p>
          </button>
        </div>

        {surveys.length > 0 && (
          <div className="mt-8">
            <h2 className="text-xl font-semibold mb-4">Recent Surveys</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {surveys.slice(0, 6).map(survey => (
                <div
                  key={survey.id}
                  onClick={() => router.push(`/surveys/${survey.id}`)}
                  className="bg-white p-4 rounded-lg shadow-md hover:shadow-lg transition-shadow cursor-pointer"
                >
                  <h3 className="font-semibold text-lg">{survey.title}</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    {survey.questions.length} questions
                  </p>
                  <p className="text-xs text-gray-400 mt-2">
                    Updated: {new Date(survey.updatedAt).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
