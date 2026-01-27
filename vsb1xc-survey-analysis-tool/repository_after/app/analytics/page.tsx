'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useSurveyStore } from '@/lib/store/surveyStore';
import { BiasDetection } from '@/components/analytics/BiasDetection';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

export default function AnalyticsPage() {
  const router = useRouter();
  const { surveys, responses, currentSurvey } = useSurveyStore();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Analytics Dashboard</h1>
          <p className="mt-2 text-gray-600">
            View insights and quality metrics across all surveys
          </p>
        </div>

        {surveys.length === 0 ? (
          <Card>
            <div className="text-center py-12">
              <p className="text-gray-600 mb-4">No surveys available for analytics.</p>
              <Button variant="primary" onClick={() => router.push('/surveys/new')}>
                Create a Survey
              </Button>
            </div>
          </Card>
        ) : (
          <div className="space-y-6">
            {surveys.map(survey => {
              const surveyResponses = responses.filter(r => r.surveyId === survey.id);
              if (surveyResponses.length === 0) return null;

              return (
                <div key={survey.id}>
                  <Card title={survey.title}>
                    <div className="mb-4">
                      <p className="text-sm text-gray-600">
                        {surveyResponses.length} responses
                      </p>
                    </div>
                    <BiasDetection responses={surveyResponses} survey={survey} />
                  </Card>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
