'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSurveyStore } from '@/lib/store/surveyStore';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

export default function SurveysPage() {
  const router = useRouter();
  const { surveys, loadSurveys, deleteSurvey, setCurrentSurvey } = useSurveyStore();

  useEffect(() => {
    loadSurveys();
  }, [loadSurveys]);

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this survey?')) {
      await deleteSurvey(id);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6 flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">Surveys</h1>
          <Button variant="primary" onClick={() => router.push('/surveys/new')}>
            Create New Survey
          </Button>
        </div>

        {surveys.length === 0 ? (
          <Card>
            <div className="text-center py-12">
              <p className="text-gray-600 mb-4">No surveys yet.</p>
              <Button variant="primary" onClick={() => router.push('/surveys/new')}>
                Create Your First Survey
              </Button>
            </div>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {surveys.map(survey => (
              <Card
                key={survey.id}
                className="cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => {
                  setCurrentSurvey(survey);
                  router.push(`/surveys/${survey.id}`);
                }}
              >
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-lg font-semibold">{survey.title}</h3>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={(e) => handleDelete(survey.id, e)}
                  >
                    Delete
                  </Button>
                </div>
                {survey.description && (
                  <p className="text-sm text-gray-600 mb-3">{survey.description}</p>
                )}
                <div className="flex justify-between items-center text-sm text-gray-500">
                  <span>{survey.questions.length} questions</span>
                  <span>{new Date(survey.updatedAt).toLocaleDateString()}</span>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
