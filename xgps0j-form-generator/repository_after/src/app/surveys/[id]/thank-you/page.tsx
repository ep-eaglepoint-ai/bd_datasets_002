'use client';

import { useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useSurveyStore } from '@/store/surveyStore';
import { databaseService } from '@/services/database';
import { CheckCircleIcon } from 'lucide-react';

export default function ThankYouPage() {
  const params = useParams();
  const surveyId = params.id as string;
  const { currentSurvey, loadSurvey } = useSurveyStore();

  useEffect(() => {
    const initializePage = async () => {
      try {
        await databaseService.init();
        if (surveyId) {
          await loadSurvey(surveyId);
        }
      } catch (error) {
        console.error('Failed to load survey:', error);
      }
    };

    initializePage();
  }, [surveyId, loadSurvey]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-md w-full text-center">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
          <CheckCircleIcon className="mx-auto h-16 w-16 text-green-500 mb-4" />
          
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Thank You!
          </h1>
          
          <p className="text-gray-600 mb-6">
            Your response has been successfully submitted.
            {currentSurvey && (
              <span className="block mt-2 text-sm">
                Survey: "{currentSurvey.title}"
              </span>
            )}
          </p>

          <div className="space-y-3">
            <Link
              href="/"
              className="btn-primary w-full"
            >
              Return to Home
            </Link>
            
            {currentSurvey && (
              <Link
                href={`/surveys/${currentSurvey.id}/respond`}
                className="btn-secondary w-full"
              >
                Take Survey Again
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}