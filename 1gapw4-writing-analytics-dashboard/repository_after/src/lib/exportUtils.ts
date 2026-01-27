import { Document, AnalyticsResult } from './types';

export function exportToCSV(documents: Document[], analytics: Map<string, AnalyticsResult>): string {
  const headers = [
    'Document ID',
    'Title',
    'Created At',
    'Word Count',
    'Character Count',
    'Sentence Count',
    'Paragraph Count',
    'Sentiment Score',
    'Sentiment Polarity',
    'Flesch Reading Ease',
    'Flesch-Kincaid Grade',
    'Gunning Fog',
    'SMOG Index',
    'Type-Token Ratio',
    'Hapax Legomena',
    'Vocabulary Diversity',
    'Avg Sentence Length',
    'Avg Word Length',
    'Passive Voice Count',
    'Punctuation Density',
  ];

  const rows = documents.map(doc => {
    const analyticsData = analytics.get(doc.id);
    if (!analyticsData) {
      return [
        doc.id,
        doc.title,
        new Date(doc.createdAt).toISOString(),
        '0', '0', '0', '0', '0', 'neutral', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0', '0'
      ];
    }

    return [
      doc.id,
      doc.title,
      new Date(doc.createdAt).toISOString(),
      analyticsData.wordCount.toString(),
      analyticsData.characterCount.toString(),
      analyticsData.sentenceCount.toString(),
      analyticsData.paragraphCount.toString(),
      analyticsData.sentiment.score.toFixed(3),
      analyticsData.sentiment.polarity,
      analyticsData.readability.fleschReadingEase.toFixed(2),
      analyticsData.readability.fleschKincaidGrade.toFixed(2),
      analyticsData.readability.gunningFog.toFixed(2),
      analyticsData.readability.smogIndex.toFixed(2),
      analyticsData.lexicalRichness.typeTokenRatio.toFixed(4),
      analyticsData.lexicalRichness.hapaxLegomena.toString(),
      analyticsData.lexicalRichness.vocabularyDiversity.toFixed(4),
      analyticsData.styleMetrics.avgSentenceLength.toFixed(2),
      analyticsData.styleMetrics.avgWordLength.toFixed(2),
      analyticsData.styleMetrics.passiveVoiceCount.toString(),
      analyticsData.styleMetrics.punctuationDensity.toFixed(4),
    ];
  });

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
  ].join('\n');

  return csvContent;
}

export function downloadCSV(content: string, filename: string = 'writing-analytics.csv') {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
