'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useSurveyStore } from '@/store/surveyStore';
import { analyticsService } from '@/services/analytics';
import { databaseService } from '@/services/database';
import { generateSampleResponses } from '@/utils/sampleData';
import { toast } from '@/store/toastStore';
import Header from '@/components/Header';
import LoadingSpinner from '@/components/LoadingSpinner';
import ErrorMessage from '@/components/ErrorMessage';
import AnalyticsDashboard from '@/components/AnalyticsDashboard';
import ResponseFilters from '@/components/ResponseFilters';
import AnomalyDetection from '@/components/AnomalyDetection';
import { SurveyAnalytics, Response } from '@/types/survey';
import { BarChart3Icon, DownloadIcon, RefreshCwIcon, PlusIcon } from 'lucide-react';

export default function AnalyticsPage() {
  const params = useParams();
  const surveyId = params.id as string;
  
  const { 
    currentSurvey, 
    currentResponses, 
    currentAnalytics,
    isLoading, 
    error, 
    loadSurvey, 
    loadResponses,
    clearError 
  } = useSurveyStore();

  const [analytics, setAnalytics] = useState<SurveyAnalytics | null>(null);
  const [filteredResponses, setFilteredResponses] = useState<Response[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showExportDropdown, setShowExportDropdown] = useState(false);
  const [generatingSample, setGeneratingSample] = useState(false);
  const [filters, setFilters] = useState({
    dateRange: null as { start: Date; end: Date } | null,
    completionStatus: 'all' as 'all' | 'completed' | 'partial',
    textSearch: '',
  });

  useEffect(() => {
    const initializePage = async () => {
      try {
        await databaseService.init();
        await loadSurvey(surveyId);
        await loadResponses(surveyId);
        await refreshAnalytics();
      } catch (error) {
        console.error('Failed to load analytics:', error);
      }
    };

    initializePage();
  }, [surveyId, loadSurvey, loadResponses]);

  useEffect(() => {
    if (currentResponses.length > 0) {
      applyFilters();
    }
  }, [currentResponses, filters]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showExportDropdown) {
        setShowExportDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showExportDropdown]);

  const refreshAnalytics = async () => {
    if (!surveyId) return;
    
    setIsRefreshing(true);
    try {
      const newAnalytics = await analyticsService.computeSurveyAnalytics(surveyId);
      setAnalytics(newAnalytics);
      toast.success('Analytics Refreshed', 'Analytics data has been updated');
    } catch (error) {
      console.error('Failed to refresh analytics:', error);
      toast.error('Refresh Failed', 'Unable to refresh analytics data');
    } finally {
      setIsRefreshing(false);
    }
  };

  const applyFilters = async () => {
    if (!surveyId) return;

    try {
      const filtered = await analyticsService.filterResponses(surveyId, {
        dateRange: filters.dateRange || undefined,
        completionStatus: filters.completionStatus,
        textSearch: filters.textSearch || undefined,
      });
      setFilteredResponses(filtered);
    } catch (error) {
      console.error('Failed to apply filters:', error);
      setFilteredResponses(currentResponses);
    }
  };

  const handleExport = async (format: 'json' | 'csv') => {
    if (!surveyId) return;

    try {
      toast.info('Exporting Data', 'Preparing your export file...');
      const exportData = await analyticsService.exportAnalytics(surveyId, format);
      const blob = new Blob([exportData], { 
        type: format === 'json' ? 'application/json' : 'text/csv' 
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `survey-${surveyId}-analytics.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('Export Complete', `Analytics data exported as ${format.toUpperCase()}`);
    } catch (error) {
      console.error('Failed to export data:', error);
      toast.error('Export Failed', 'Unable to export analytics data');
    }
  };

  const handleGenerateSampleResponses = async () => {
    if (!currentSurvey) return;

    setGeneratingSample(true);
    try {
      toast.info('Generating Sample Data', 'Creating sample responses...');
      const sampleResponses = generateSampleResponses(currentSurvey, 50);
      await databaseService.batchSaveResponses(sampleResponses);
      
      // Reload responses and refresh analytics
      await loadResponses(surveyId);
      await refreshAnalytics();
      
      toast.success('Sample Data Generated', `Created ${sampleResponses.length} sample responses`);
    } catch (error) {
      console.error('Failed to generate sample responses:', error);
      toast.error('Generation Failed', 'Unable to generate sample responses');
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
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                <BarChart3Icon className="h-6 w-6 mr-2" />
                Survey Analytics
              </h1>
              <p className="text-gray-600 mt-1">
                {currentSurvey.title}
              </p>
            </div>
            
            <div className="flex items-center space-x-3">
              {currentResponses.length === 0 && (
                <button
                  onClick={handleGenerateSampleResponses}
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
              )}
              
              <button
                onClick={refreshAnalytics}
                className="btn-secondary"
                disabled={isRefreshing}
              >
                {isRefreshing ? (
                  <LoadingSpinner size="sm" className="mr-2" />
                ) : (
                  <RefreshCwIcon className="h-4 w-4 mr-2" />
                )}
                Refresh
              </button>
              
              <div className="relative">
                <button 
                  onClick={() => setShowExportDropdown(!showExportDropdown)}
                  className="btn-secondary"
                >
                  <DownloadIcon className="h-4 w-4 mr-2" />
                  Export
                </button>
                {showExportDropdown && (
                  <div className="dropdown">
                    <button
                      onClick={() => {
                        handleExport('json');
                        setShowExportDropdown(false);
                      }}
                      className="dropdown-item"
                    >
                      Export as JSON
                    </button>
                    <button
                      onClick={() => {
                        handleExport('csv');
                        setShowExportDropdown(false);
                      }}
                      className="dropdown-item"
                    >
                      Export as CSV
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="mb-8">
          <ResponseFilters
            filters={filters}
            onFiltersChange={setFilters}
            survey={currentSurvey}
          />
        </div>

        {/* Analytics Dashboard */}
        {analytics ? (
          <div className="space-y-8">
            <AnalyticsDashboard
              survey={currentSurvey}
              analytics={analytics}
              responses={filteredResponses}
            />
            
            {/* Anomaly Detection */}
            <AnomalyDetection surveyId={surveyId} />
          </div>
        ) : (
          <div className="card text-center py-12">
            <BarChart3Icon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">
              No analytics available
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              Analytics will appear here once responses are collected.
            </p>
            {currentResponses.length === 0 && (
              <div className="mt-6">
                <button
                  onClick={handleGenerateSampleResponses}
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
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}