'use client';

import { useEffect, useMemo } from 'react';
import { useStore } from '@/lib/store';
import { Line, Bar, Pie } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

export default function AnalyticsDashboard() {
  const { currentDocument, analytics, exportData } = useStore();

  const docAnalytics = currentDocument ? analytics.get(currentDocument.id) : null;

  const sentimentData = useMemo(() => {
    if (!docAnalytics) return null;

    return {
      labels: ['Sentiment Score'],
      datasets: [{
        label: 'Sentiment',
        data: [docAnalytics.sentiment.score],
        backgroundColor: docAnalytics.sentiment.polarity === 'positive' ? 'rgba(34, 197, 94, 0.5)' : 
                         docAnalytics.sentiment.polarity === 'negative' ? 'rgba(239, 68, 68, 0.5)' : 
                         'rgba(156, 163, 175, 0.5)',
        borderColor: docAnalytics.sentiment.polarity === 'positive' ? 'rgb(34, 197, 94)' : 
                     docAnalytics.sentiment.polarity === 'negative' ? 'rgb(239, 68, 68)' : 
                     'rgb(156, 163, 175)',
        borderWidth: 2,
      }]
    };
  }, [docAnalytics]);

  const readabilityData = useMemo(() => {
    if (!docAnalytics) return null;

    return {
      labels: ['Flesch Reading Ease', 'Flesch-Kincaid Grade', 'Gunning Fog', 'SMOG Index'],
      datasets: [{
        label: 'Readability Scores',
        data: [
          docAnalytics.readability.fleschReadingEase,
          docAnalytics.readability.fleschKincaidGrade,
          docAnalytics.readability.gunningFog,
          docAnalytics.readability.smogIndex,
        ],
        backgroundColor: [
          'rgba(59, 130, 246, 0.5)',
          'rgba(168, 85, 247, 0.5)',
          'rgba(236, 72, 153, 0.5)',
          'rgba(251, 146, 60, 0.5)',
        ],
        borderColor: [
          'rgb(59, 130, 246)',
          'rgb(168, 85, 247)',
          'rgb(236, 72, 153)',
          'rgb(251, 146, 60)',
        ],
        borderWidth: 2,
      }]
    };
  }, [docAnalytics]);

  const handleExport = async () => {
    try {
      const data = await exportData();
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `analytics-export-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      alert('Export failed: ' + (error as Error).message);
    }
  };

  if (!currentDocument) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <p className="text-gray-500 text-center py-8">Select a document to view analytics</p>
      </div>
    );
  }

  if (!docAnalytics) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <p className="text-gray-500 text-center py-8">Loading analytics...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold">Analytics: {currentDocument.title}</h2>
          <button
            onClick={handleExport}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Export Data
          </button>
        </div>

        {/* Basic Metrics */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="text-sm text-gray-600">Words</div>
            <div className="text-2xl font-bold text-blue-600">{docAnalytics.wordCount}</div>
          </div>
          <div className="bg-green-50 p-4 rounded-lg">
            <div className="text-sm text-gray-600">Sentences</div>
            <div className="text-2xl font-bold text-green-600">{docAnalytics.sentenceCount}</div>
          </div>
          <div className="bg-purple-50 p-4 rounded-lg">
            <div className="text-sm text-gray-600">Paragraphs</div>
            <div className="text-2xl font-bold text-purple-600">{docAnalytics.paragraphCount}</div>
          </div>
          <div className="bg-orange-50 p-4 rounded-lg">
            <div className="text-sm text-gray-600">Characters</div>
            <div className="text-2xl font-bold text-orange-600">{docAnalytics.characterCount}</div>
          </div>
        </div>

        {/* Sentiment Analysis */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-3">Sentiment Analysis</h3>
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="text-sm text-gray-600">Polarity</div>
              <div className={`text-xl font-bold ${
                docAnalytics.sentiment.polarity === 'positive' ? 'text-green-600' :
                docAnalytics.sentiment.polarity === 'negative' ? 'text-red-600' :
                'text-gray-600'
              }`}>
                {docAnalytics.sentiment.polarity.toUpperCase()}
              </div>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="text-sm text-gray-600">Score</div>
              <div className="text-xl font-bold">{docAnalytics.sentiment.score.toFixed(3)}</div>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="text-sm text-gray-600">Intensity</div>
              <div className="text-xl font-bold">{docAnalytics.sentiment.intensity.toFixed(3)}</div>
            </div>
          </div>
        </div>

        {/* Readability Scores */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-3">Readability Scores</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="bg-gray-50 p-4 rounded-lg mb-2">
                <div className="text-sm text-gray-600">Flesch Reading Ease</div>
                <div className="text-xl font-bold">{docAnalytics.readability.fleschReadingEase.toFixed(1)}</div>
                <div className="text-xs text-gray-500">Higher = Easier to read</div>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="text-sm text-gray-600">Flesch-Kincaid Grade</div>
                <div className="text-xl font-bold">{docAnalytics.readability.fleschKincaidGrade.toFixed(1)}</div>
                <div className="text-xs text-gray-500">US grade level</div>
              </div>
            </div>
            <div>
              <div className="bg-gray-50 p-4 rounded-lg mb-2">
                <div className="text-sm text-gray-600">Gunning Fog Index</div>
                <div className="text-xl font-bold">{docAnalytics.readability.gunningFog.toFixed(1)}</div>
                <div className="text-xs text-gray-500">Years of education needed</div>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="text-sm text-gray-600">SMOG Index</div>
                <div className="text-xl font-bold">{docAnalytics.readability.smogIndex.toFixed(1)}</div>
                <div className="text-xs text-gray-500">Reading grade level</div>
              </div>
            </div>
          </div>
        </div>

        {/* Lexical Richness */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-3">Lexical Richness</h3>
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="text-sm text-gray-600">Type-Token Ratio</div>
              <div className="text-xl font-bold">{docAnalytics.lexicalRichness.typeTokenRatio.toFixed(3)}</div>
              <div className="text-xs text-gray-500">Vocabulary diversity</div>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="text-sm text-gray-600">Hapax Legomena</div>
              <div className="text-xl font-bold">{docAnalytics.lexicalRichness.hapaxLegomena}</div>
              <div className="text-xs text-gray-500">Words used once</div>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="text-sm text-gray-600">Vocabulary Diversity</div>
              <div className="text-xl font-bold">{docAnalytics.lexicalRichness.vocabularyDiversity.toFixed(2)}</div>
              <div className="text-xs text-gray-500">Normalized richness</div>
            </div>
          </div>
        </div>

        {/* Style Metrics */}
        <div>
          <h3 className="text-lg font-semibold mb-3">Style Metrics</h3>
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="text-sm text-gray-600">Avg Sentence Length</div>
              <div className="text-xl font-bold">{docAnalytics.styleMetrics.avgSentenceLength.toFixed(1)}</div>
              <div className="text-xs text-gray-500">words/sentence</div>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="text-sm text-gray-600">Avg Word Length</div>
              <div className="text-xl font-bold">{docAnalytics.styleMetrics.avgWordLength.toFixed(1)}</div>
              <div className="text-xs text-gray-500">characters/word</div>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="text-sm text-gray-600">Passive Voice</div>
              <div className="text-xl font-bold">{docAnalytics.styleMetrics.passiveVoiceCount}</div>
              <div className="text-xs text-gray-500">instances</div>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="text-sm text-gray-600">Punctuation Density</div>
              <div className="text-xl font-bold">{docAnalytics.styleMetrics.punctuationDensity.toFixed(3)}</div>
              <div className="text-xs text-gray-500">marks/word</div>
            </div>
          </div>
        </div>
      </div>

      {/* Charts */}
      {readabilityData && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold mb-4">Readability Visualization</h3>
          <Bar
            data={readabilityData}
            options={{
              responsive: true,
              plugins: {
                legend: { display: false },
                title: { display: true, text: 'Readability Metrics Comparison' }
              },
              scales: {
                y: { beginAtZero: true }
              }
            }}
          />
        </div>
      )}
    </div>
  );
}
