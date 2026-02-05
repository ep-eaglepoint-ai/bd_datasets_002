'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSurveyStore } from '@/lib/store/surveyStore';
import { storage } from '@/lib/storage/indexeddb';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

export default function DashboardPage() {
  const router = useRouter();
  const { loadSurveys, surveys, responses } = useSurveyStore();

  useEffect(() => {
    const init = async () => {
      await storage.init();
      await loadSurveys();
    };
    init();
  }, [loadSurveys]);

  const totalResponses = responses.length;
  const completedSurveys = surveys.filter(s => 
    responses.some(r => r.surveyId === s.id && r.completed)
  ).length;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="mt-2 text-gray-600">
            Overview of your surveys and analytics
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <div className="p-4">
              <p className="text-sm text-gray-600 mb-1">Total Surveys</p>
              <p className="text-3xl font-bold text-gray-900">{surveys.length}</p>
            </div>
          </Card>
          <Card>
            <div className="p-4">
              <p className="text-sm text-gray-600 mb-1">Total Responses</p>
              <p className="text-3xl font-bold text-gray-900">{totalResponses}</p>
            </div>
          </Card>
          <Card>
            <div className="p-4">
              <p className="text-sm text-gray-600 mb-1">Active Surveys</p>
              <p className="text-3xl font-bold text-gray-900">{completedSurveys}</p>
            </div>
          </Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <Card>
            <div className="p-6">
              <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
              <div className="space-y-3">
                <Button
                  variant="primary"
                  className="w-full"
                  onClick={() => router.push('/surveys/new')}
                >
                  Create New Survey
                </Button>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => router.push('/surveys')}
                >
                  View All Surveys
                </Button>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => router.push('/analytics')}
                >
                  View Analytics
                </Button>
              </div>
            </div>
          </Card>

          <Card>
            <div className="p-6">
              <h2 className="text-xl font-semibold mb-4">Recent Surveys</h2>
              {surveys.length === 0 ? (
                <p className="text-gray-600 text-center py-4">No surveys yet</p>
              ) : (
                <div className="space-y-2">
                  {surveys.slice(0, 5).map(survey => {
                    const surveyResponses = responses.filter(r => r.surveyId === survey.id);
                    return (
                      <div
                        key={survey.id}
                        onClick={() => router.push(`/surveys/${survey.id}`)}
                        className="p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors"
                      >
                        <h3 className="font-medium">{survey.title}</h3>
                        <p className="text-sm text-gray-600">
                          {surveyResponses.length} responses • {survey.questions.length} questions
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
