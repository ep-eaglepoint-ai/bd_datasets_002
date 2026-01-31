'use client';

import { useEffect, useState } from 'react';
import { useSurveyStore } from '@/store/surveyStore';
import { databaseService } from '@/services/database';
import { analyticsService } from '@/services/analytics';
import { generateSampleData } from '@/utils/sampleData';
import Header from '@/components/Header';
import LoadingSpinner from '@/components/LoadingSpinner';
import ErrorMessage from '@/components/ErrorMessage';
import { Survey, SurveyAnalytics } from '@/types/survey';
import { BarChart3Icon, TrendingUpIcon, UsersIcon, FileTextIcon, PlusIcon } from 'lucide-react';
import Link from 'next/link';

interface SurveyWithAnalytics extends Survey {
  analytics?: SurveyAnalytics;
  responseCount?: number;
}

export default function AnalyticsOverviewPage() {
  const { surveys, loadSurveys, isLoading, error, clearError } = useSurveyStore();
  const [surveysWithAnalytics, setSurveysWithAnalytics] = useState<SurveyWithAnalytics[]>([]);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [generatingSample, setGeneratingSample] = useState(false);

  useEffect(() => {
    const initializePage = async () => {
      try {
        await databaseService.init();
        await loadSurveys();
      } catch (error) {
        console.error('Failed to initialize analytics page:', error);
      }
    };

    initializePage();
  }, [loadSurveys]);

  useEffect(() => {
    if (surveys.length > 0) {
      loadAnalyticsForSurveys();
    }
  }, [surveys]);

  const loadAnalyticsForSurveys = async () => {
    setAnalyticsLoading(true);
    try {
      const surveysWithAnalyticsData = await Promise.all(
        surveys.map(async (survey) => {
          try {
            const responses = await databaseService.getResponsesBySurvey(survey.id);
            let analytics: SurveyAnalytics | undefined = undefined;
            
            if (responses.length > 0) {
              analytics = await analyticsService.computeSurveyAnalytics(survey.id);
            }

            return {
              ...survey,
              analytics,
              responseCount: responses.length,
            };
          } catch (error) {
            console.error(`Failed to load analytics for survey ${survey.id}:`, error);
            return {
              ...survey,
              analytics: undefined,
              responseCount: 0,
            };
          }
        })
      );

      setSurveysWithAnalytics(surveysWithAnalyticsData);
    } catch (error) {
      console.error('Failed to load analytics:', error);
    } finally {
      setAnalyticsLoading(false);
    }
  };

  const totalResponses = surveysWithAnalytics.reduce((sum, survey) => sum + (survey.responseCount || 0), 0);
  const totalCompletedResponses = surveysWithAnalytics.reduce(
    (sum, survey) => sum + (survey.analytics?.completedResponses || 0), 
    0
  );
  const averageCompletionRate = surveysWithAnalytics.length > 0 
    ? surveysWithAnalytics.reduce((sum, survey) => sum + (survey.analytics?.completionRate || 0), 0) / surveysWithAnalytics.length
    : 0;

  const handleGenerateSampleData = async () => {
    setGeneratingSample(true);
    try {
      await generateSampleData();
      await loadSurveys();
      // Reload analytics after generating sample data
      setTimeout(() => {
        loadAnalyticsForSurveys();
      }, 500);
    } catch (error) {
      console.error('Failed to generate sample data:', error);
      alert('Failed to generate sample data. Please try again.');
    } finally {
      setGeneratingSample(false);
    }
  };

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

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center">
                <BarChart3Icon className="h-8 w-8 mr-3" />
                Analytics Overview
              </h1>
              <p className="text-gray-600">
                Comprehensive analytics across all your surveys
              </p>
            </div>
            
            {surveys.length === 0 && (
              <div className="flex items-center space-x-3">
                <button
                  onClick={handleGenerateSampleData}
                  disabled={generatingSample}
                  className="btn-primary"
                >
                  {generatingSample ? (
                    <>
                      <LoadingSpinner size="sm" className="mr-2" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <PlusIcon className="h-4 w-4 mr-2" />
                      Generate Sample Data
                    </>
                  )}
                </button>
                <Link href="/surveys/new" className="btn-secondary">
                  Create Survey
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Global Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="card">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <FileTextIcon className="h-8 w-8 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Surveys</p>
                <p className="text-2xl font-bold text-gray-900">{surveys.length}</p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <UsersIcon className="h-8 w-8 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Responses</p>
                <p className="text-2xl font-bold text-gray-900">{totalResponses}</p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <TrendingUpIcon className="h-8 w-8 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Completed</p>
                <p className="text-2xl font-bold text-gray-900">{totalCompletedResponses}</p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <BarChart3Icon className="h-8 w-8 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Avg Completion</p>
                <p className="text-2xl font-bold text-gray-900">
                  {Math.round(averageCompletionRate * 100)}%
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Survey List with Analytics */}
        {analyticsLoading ? (
          <div className="card">
            <div className="flex items-center justify-center py-12">
              <LoadingSpinner size="lg" className="mr-3" />
              <span className="text-gray-600">Loading analytics data...</span>
            </div>
          </div>
        ) : surveysWithAnalytics.length === 0 ? (
          <div className="card text-center py-12">
            <BarChart3Icon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No surveys found</h3>
            <p className="mt-1 text-sm text-gray-500">
              Create your first survey or generate sample data to see analytics here.
            </p>
            <div className="mt-6 flex items-center justify-center space-x-3">
              <button
                onClick={handleGenerateSampleData}
                disabled={generatingSample}
                className="btn-primary"
              >
                {generatingSample ? (
                  <>
                    <LoadingSpinner size="sm" className="mr-2" />
                    Generating Sample Data...
                  </>
                ) : (
                  <>
                    <PlusIcon className="h-4 w-4 mr-2" />
                    Generate Sample Data
                  </>
                )}
              </button>
              <Link href="/surveys/new" className="btn-secondary">
                Create Survey
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-gray-900">Survey Performance</h2>
            
            <div className="grid gap-6">
              {surveysWithAnalytics.map((survey) => (
                <div key={survey.id} className="card hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h3 className="text-lg font-medium text-gray-900">
                            {survey.title}
                          </h3>
                          {survey.description && (
                            <p className="text-sm text-gray-600 mt-1">
                              {survey.description}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className={`badge ${survey.published ? 'badge-success' : 'badge-gray'}`}>
                            {survey.published ? 'Published' : 'Draft'}
                          </span>
                          <Link
                            href={`/surveys/${survey.id}/analytics`}
                            className="btn-primary"
                          >
                            View Details
                          </Link>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                        <div>
                          <p className="text-gray-500">Questions</p>
                          <p className="font-medium">{survey.questions.length}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Responses</p>
                          <p className="font-medium">{survey.responseCount || 0}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Completed</p>
                          <p className="font-medium">{survey.analytics?.completedResponses || 0}</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Completion Rate</p>
                          <p className="font-medium">
                            {survey.analytics ? Math.round(survey.analytics.completionRate * 100) : 0}%
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-500">Avg Time</p>
                          <p className="font-medium">
                            {survey.analytics?.averageTimeToComplete 
                              ? `${Math.round(survey.analytics.averageTimeToComplete / 60)}m`
                              : 'N/A'
                            }
                          </p>
                        </div>
                      </div>

                      {survey.analytics && (
                        <div className="mt-4 pt-4 border-t border-gray-200">
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                              style={{ width: `${survey.analytics.completionRate * 100}%` }}
                            />
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
                            Response completion progress
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}