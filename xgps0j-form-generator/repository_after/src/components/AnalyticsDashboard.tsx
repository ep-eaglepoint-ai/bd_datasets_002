'use client';

import { Survey, SurveyAnalytics, Response } from '@/types/survey';
import { formatNumber, formatDuration, calculatePercentage } from '@/utils/helpers';
import { 
  UsersIcon, 
  CheckCircleIcon, 
  ClockIcon, 
  TrendingUpIcon,
  BarChart3Icon,
  PieChartIcon
} from 'lucide-react';
import QuestionAnalyticsChart from './QuestionAnalyticsChart';
import ResponseTrendChart from './ResponseTrendChart';
import ComprehensiveAnalyticsChart from './ComprehensiveAnalyticsChart';

interface AnalyticsDashboardProps {
  survey: Survey;
  analytics: SurveyAnalytics;
  responses: Response[];
}

export default function AnalyticsDashboard({ survey, analytics, responses }: AnalyticsDashboardProps) {
  const completionRate = calculatePercentage(analytics.completedResponses, analytics.totalResponses);
  
  return (
    <div className="space-y-8">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="card">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <UsersIcon className="h-8 w-8 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total Responses</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatNumber(analytics.totalResponses)}
              </p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <CheckCircleIcon className="h-8 w-8 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Completed</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatNumber(analytics.completedResponses)}
              </p>
              <p className="text-xs text-gray-500">
                {completionRate}% completion rate
              </p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <ClockIcon className="h-8 w-8 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Avg. Time</p>
              <p className="text-2xl font-bold text-gray-900">
                {analytics.averageTimeToComplete 
                  ? formatDuration(analytics.averageTimeToComplete)
                  : 'N/A'
                }
              </p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <TrendingUpIcon className="h-8 w-8 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Response Rate</p>
              <p className="text-2xl font-bold text-gray-900">
                {analytics.totalResponses > 0 ? '100%' : '0%'}
              </p>
              <p className="text-xs text-gray-500">
                of survey views
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Response Trend Chart */}
      {Object.keys(analytics.responsesByDay).length > 0 && (
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-medium text-gray-900 flex items-center">
              <TrendingUpIcon className="h-5 w-5 mr-2" />
              Response Trends
            </h3>
            <p className="text-sm text-gray-600">
              Daily response collection over time
            </p>
          </div>
          <ResponseTrendChart data={analytics.responsesByDay} />
        </div>
      )}

      {/* Comprehensive Analytics Charts */}
      {analytics.totalResponses > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card">
            <div className="card-header">
              <h3 className="text-lg font-medium text-gray-900 flex items-center">
                <BarChart3Icon className="h-5 w-5 mr-2" />
                Completion Funnel
              </h3>
              <p className="text-sm text-gray-600">
                Response completion breakdown
              </p>
            </div>
            <ComprehensiveAnalyticsChart 
              survey={survey} 
              analytics={analytics} 
              chartType="completion-funnel" 
            />
          </div>

          <div className="card">
            <div className="card-header">
              <h3 className="text-lg font-medium text-gray-900 flex items-center">
                <PieChartIcon className="h-5 w-5 mr-2" />
                Satisfaction Overview
              </h3>
              <p className="text-sm text-gray-600">
                Average ratings across questions
              </p>
            </div>
            <ComprehensiveAnalyticsChart 
              survey={survey} 
              analytics={analytics} 
              chartType="satisfaction-overview" 
            />
          </div>

          <div className="card lg:col-span-2">
            <div className="card-header">
              <h3 className="text-lg font-medium text-gray-900 flex items-center">
                <TrendingUpIcon className="h-5 w-5 mr-2" />
                Response Timeline
              </h3>
              <p className="text-sm text-gray-600">
                Daily and cumulative response trends
              </p>
            </div>
            <ComprehensiveAnalyticsChart 
              survey={survey} 
              analytics={analytics} 
              chartType="response-timeline" 
            />
          </div>
        </div>
      )}

      {/* Question Analytics */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center">
            <BarChart3Icon className="h-5 w-5 mr-2" />
            Question Analytics
          </h2>
          <p className="text-sm text-gray-600">
            {analytics.questionAnalytics.length} questions analyzed
          </p>
        </div>

        <div className="grid gap-6">
          {analytics.questionAnalytics.map((questionAnalytics) => {
            const question = survey.questions.find(q => q.id === questionAnalytics.questionId);
            if (!question) return null;

            return (
              <div key={questionAnalytics.questionId} className="card">
                <div className="card-header">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="text-base font-medium text-gray-900">
                        {question.title}
                        {question.required && (
                          <span className="text-red-500 ml-1">*</span>
                        )}
                      </h4>
                      {question.description && (
                        <p className="text-sm text-gray-600 mt-1">
                          {question.description}
                        </p>
                      )}
                    </div>
                    <div className="ml-4 text-right">
                      <p className="text-sm font-medium text-gray-900">
                        {formatNumber(questionAnalytics.validResponses)} responses
                      </p>
                      <p className="text-xs text-gray-500">
                        {Math.round(questionAnalytics.responseRate * 100)}% response rate
                      </p>
                    </div>
                  </div>
                </div>

                <QuestionAnalyticsChart
                  question={question}
                  analytics={questionAnalytics}
                />

                {/* Statistics Summary */}
                {questionAnalytics.statistics && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      {questionAnalytics.statistics.mean !== undefined && (
                        <div>
                          <p className="text-gray-500">Mean</p>
                          <p className="font-medium">{questionAnalytics.statistics.mean}</p>
                        </div>
                      )}
                      {questionAnalytics.statistics.median !== undefined && (
                        <div>
                          <p className="text-gray-500">Median</p>
                          <p className="font-medium">{questionAnalytics.statistics.median}</p>
                        </div>
                      )}
                      {questionAnalytics.statistics.mode !== undefined && (
                        <div>
                          <p className="text-gray-500">Mode</p>
                          <p className="font-medium">{questionAnalytics.statistics.mode}</p>
                        </div>
                      )}
                      {questionAnalytics.statistics.standardDeviation !== undefined && (
                        <div>
                          <p className="text-gray-500">Std Dev</p>
                          <p className="font-medium">{questionAnalytics.statistics.standardDeviation}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Summary */}
      <div className="card">
        <div className="card-header">
          <h3 className="text-lg font-medium text-gray-900">
            Analytics Summary
          </h3>
          <p className="text-sm text-gray-600">
            Last updated: {analytics.lastUpdated.toLocaleString()}
          </p>
        </div>
        
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Response Quality</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• {analytics.completedResponses} complete responses</li>
                <li>• {analytics.totalResponses - analytics.completedResponses} partial responses</li>
                <li>• {completionRate}% completion rate</li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Survey Structure</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• {survey.questions.length} total questions</li>
                <li>• {survey.sections.length} sections</li>
                <li>• Version {survey.version}</li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Data Collection</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• {Object.keys(analytics.responsesByDay).length} active days</li>
                <li>• {analytics.averageTimeToComplete ? formatDuration(analytics.averageTimeToComplete) : 'N/A'} avg completion time</li>
                <li>• {survey.settings.allowAnonymous ? 'Anonymous' : 'Identified'} responses</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}