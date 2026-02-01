'use client';

import { useEffect, useState } from 'react';
import { analyticsService } from '@/services/analytics';
import { AlertTriangleIcon, EyeIcon, TrashIcon } from 'lucide-react';
import { toast } from '@/store/toastStore';

interface AnomalyDetectionProps {
  surveyId: string;
}

interface Anomaly {
  responseId: string;
  anomalies: string[];
}

export default function AnomalyDetection({ surveyId }: AnomalyDetectionProps) {
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showAnomalies, setShowAnomalies] = useState(false);

  useEffect(() => {
    if (showAnomalies) {
      detectAnomalies();
    }
  }, [surveyId, showAnomalies]);

  const detectAnomalies = async () => {
    setIsLoading(true);
    try {
      const detectedAnomalies = await analyticsService.detectAnomalies(surveyId);
      setAnomalies(detectedAnomalies);
      
      if (detectedAnomalies.length > 0) {
        toast.warning('Anomalies Detected', `Found ${detectedAnomalies.length} potentially suspicious responses`);
      } else {
        toast.success('No Anomalies', 'All responses appear to be normal');
      }
    } catch (error) {
      console.error('Failed to detect anomalies:', error);
      toast.error('Detection Failed', 'Unable to analyze responses for anomalies');
    } finally {
      setIsLoading(false);
    }
  };

  if (!showAnomalies) {
    return (
      <div className="card">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium text-gray-900 flex items-center">
              <AlertTriangleIcon className="h-5 w-5 mr-2 text-yellow-600" />
              Response Quality Analysis
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              Detect potentially suspicious or low-quality responses
            </p>
          </div>
          <button
            onClick={() => setShowAnomalies(true)}
            className="btn-secondary"
          >
            <EyeIcon className="h-4 w-4 mr-2" />
            Analyze Responses
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="card-header">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium text-gray-900 flex items-center">
              <AlertTriangleIcon className="h-5 w-5 mr-2 text-yellow-600" />
              Anomaly Detection Results
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              {isLoading ? 'Analyzing responses...' : `Found ${anomalies.length} potentially suspicious responses`}
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={detectAnomalies}
              disabled={isLoading}
              className="btn-secondary"
            >
              {isLoading ? 'Analyzing...' : 'Refresh Analysis'}
            </button>
            <button
              onClick={() => setShowAnomalies(false)}
              className="btn-ghost"
            >
              Hide
            </button>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <div className="loading-spinner mr-2" />
          <span className="text-gray-600">Analyzing response patterns...</span>
        </div>
      ) : anomalies.length === 0 ? (
        <div className="text-center py-8">
          <AlertTriangleIcon className="mx-auto h-12 w-12 text-green-400" />
          <h4 className="mt-2 text-sm font-medium text-gray-900">
            No Anomalies Detected
          </h4>
          <p className="mt-1 text-sm text-gray-500">
            All responses appear to follow normal patterns
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex">
              <AlertTriangleIcon className="h-5 w-5 text-yellow-400" />
              <div className="ml-3">
                <h4 className="text-sm font-medium text-yellow-800">
                  Quality Issues Detected
                </h4>
                <p className="text-sm text-yellow-700 mt-1">
                  The following responses show patterns that may indicate low quality or suspicious behavior. 
                  Review these responses carefully before including them in your analysis.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            {anomalies.map((anomaly, index) => (
              <div key={anomaly.responseId} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center">
                      <span className="text-sm font-medium text-gray-900">
                        Response #{index + 1}
                      </span>
                      <span className="ml-2 text-xs text-gray-500 font-mono">
                        {anomaly.responseId.slice(0, 8)}...
                      </span>
                    </div>
                    <div className="mt-2">
                      <p className="text-sm text-gray-600 mb-2">Detected issues:</p>
                      <ul className="space-y-1">
                        {anomaly.anomalies.map((issue, issueIndex) => (
                          <li key={issueIndex} className="flex items-center text-sm">
                            <div className="w-2 h-2 bg-yellow-400 rounded-full mr-2 flex-shrink-0" />
                            <span className="text-gray-700">{issue}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                  <div className="ml-4 flex items-center space-x-2">
                    <button
                      onClick={() => {
                        // This would open a detailed view of the response
                        toast.info('Feature Coming Soon', 'Detailed response review is coming in a future update');
                      }}
                      className="btn-ghost text-xs"
                      title="View Response Details"
                    >
                      <EyeIcon className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => {
                        // This would flag/exclude the response
                        toast.info('Feature Coming Soon', 'Response flagging is coming in a future update');
                      }}
                      className="btn-ghost text-xs text-red-600"
                      title="Flag Response"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h4 className="text-sm font-medium text-blue-800">
                  About Anomaly Detection
                </h4>
                <p className="text-sm text-blue-700 mt-1">
                  This analysis looks for patterns like extremely fast completion times, 
                  identical repeated answers, and suspicious response patterns. 
                  Use your judgment when deciding whether to include flagged responses in your analysis.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}