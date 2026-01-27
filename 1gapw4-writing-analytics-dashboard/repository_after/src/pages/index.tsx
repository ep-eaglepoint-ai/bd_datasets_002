'use client';

import { useState } from 'react';
import DocumentEditor from '@/components/DocumentEditor';
import DocumentList from '@/components/DocumentList';
import AnalyticsDashboard from '@/components/AnalyticsDashboard';
import DocumentComparison from '@/components/DocumentComparison';
import { useStore } from '@/lib/store';
import { exportToCSV, downloadCSV } from '@/lib/exportUtils';

export default function Home() {
  const [activeTab, setActiveTab] = useState<'write' | 'documents' | 'analytics' | 'compare'>('write');
  const { documents, analytics } = useStore();

  const handleCSVExport = () => {
    const csv = exportToCSV(documents, analytics);
    downloadCSV(csv, `writing-analytics-${new Date().toISOString().split('T')[0]}.csv`);
  };

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <h1 className="text-3xl font-bold text-gray-900">Writing Analytics Dashboard</h1>
          <p className="text-gray-600">Offline-first writing analytics application</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Navigation Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab('write')}
            className={`px-6 py-3 rounded-lg font-medium transition ${
              activeTab === 'write'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            ✍️ Write / Import
          </button>
          <button
            onClick={() => setActiveTab('documents')}
            className={`px-6 py-3 rounded-lg font-medium transition ${
              activeTab === 'documents'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            📚 Documents
          </button>
          <button
            onClick={() => setActiveTab('analytics')}
            className={`px-6 py-3 rounded-lg font-medium transition ${
              activeTab === 'analytics'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            📊 Analytics
          </button>
          <button
            onClick={() => setActiveTab('compare')}
            className={`px-6 py-3 rounded-lg font-medium transition ${
              activeTab === 'compare'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            🔄 Compare
          </button>
          <button
            onClick={handleCSVExport}
            className="ml-auto px-6 py-3 rounded-lg font-medium transition bg-green-600 text-white hover:bg-green-700"
          >
            📥 Export CSV
          </button>
        </div>

        {/* Content */}
        <div className="space-y-6">
          {activeTab === 'write' && (
            <>
              <DocumentEditor />
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-semibold text-blue-900 mb-2">💡 How to Use</h3>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• Write directly in the editor or import a text file (.txt, .md)</li>
                  <li>• Organize documents by project, category, and tags</li>
                  <li>• All text is preserved in its original form without modification</li>
                  <li>• Analytics are computed automatically when you save</li>
                  <li>• Everything is stored locally in your browser (offline-first)</li>
                </ul>
              </div>
            </>
          )}

          {activeTab === 'documents' && (
            <>
              <DocumentList />
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h3 className="font-semibold text-green-900 mb-2">📋 Document Management</h3>
                <ul className="text-sm text-green-800 space-y-1">
                  <li>• Click any document to view its detailed analytics</li>
                  <li>• Filter by project or search by title/content</li>
                  <li>• Sort by date, title, or document length</li>
                  <li>• Delete documents you no longer need</li>
                </ul>
              </div>
            </>
          )}

          {activeTab === 'analytics' && (
            <>
              <AnalyticsDashboard />
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <h3 className="font-semibold text-purple-900 mb-2">📈 Analytics Features</h3>
                <ul className="text-sm text-purple-800 space-y-1">
                  <li>• <strong>Sentiment Analysis:</strong> Detects positive, negative, or neutral tone with volatility tracking</li>
                  <li>• <strong>Readability Scores:</strong> Flesch, Gunning Fog, SMOG, and more</li>
                  <li>• <strong>Lexical Richness:</strong> Vocabulary diversity, moving average TTR, repetition rates</li>
                  <li>• <strong>Style Metrics:</strong> Sentence length, passive voice, clause depth, rhythm patterns</li>
                  <li>• <strong>Grammar Metrics:</strong> Tense consistency, pronoun usage, verb forms, modifiers</li>
                  <li>• <strong>Advanced Analysis:</strong> N-grams, topic drift, deliberate vs accidental repetition</li>
                  <li>• <strong>Export:</strong> Download all your data and analytics as JSON or CSV</li>
                </ul>
              </div>
            </>
          )}

          {activeTab === 'compare' && (
            <>
              <DocumentComparison documents={documents} analytics={analytics} />
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                <h3 className="font-semibold text-orange-900 mb-2">🔄 Document Comparison</h3>
                <ul className="text-sm text-orange-800 space-y-1">
                  <li>• Compare tone, vocabulary, readability, and complexity between two documents</li>
                  <li>• Side-by-side metric analysis with difference calculations</li>
                  <li>• Percentage change tracking for all metrics</li>
                  <li>• Interpretation guidance for understanding differences</li>
                </ul>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-gray-500">
          <p>All processing happens locally in your browser. No data is sent to external servers.</p>
          <p className="mt-1">Data is stored in IndexedDB for offline access.</p>
        </div>
      </div>
    </main>
  );
}
