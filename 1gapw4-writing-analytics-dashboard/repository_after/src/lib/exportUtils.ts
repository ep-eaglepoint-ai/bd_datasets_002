import { Document, AnalyticsResult } from './types';

export function exportToCSV(documents: Document[], analytics: Map<string, AnalyticsResult>): string {
  const headers = [
    'Document ID',
    'Title',
    'Created At',
    'Updated At',
    'Project',
    'Category',
    'Tags',
    'Word Count',
    'Character Count',
    'Sentence Count',
    'Paragraph Count',
    'Sentiment Score',
    'Sentiment Label',
    'Sentiment Polarity',
    'Sentiment Volatility',
    'Sentiment Confidence',
    'Flesch Reading Ease',
    'Flesch-Kincaid Grade',
    'Gunning Fog',
    'SMOG Index',
    'Coleman-Liau',
    'ARI',
    'Readability Confidence',
    'Type-Token Ratio',
    'Moving Average TTR',
    'Hapax Legomena',
    'Vocabulary Diversity',
    'Unique Words',
    'Lexical Density',
    'Avg Sentence Length',
    'Avg Word Length',
    'Passive Voice Count',
    'Passive Voice Percentage',
    'Punctuation Density',
    'Clause Depth',
    'Syntactic Variation',
    'Rhythm Pattern Score',
    'Deliberate Repetition',
    'Accidental Repetition',
    'Filler Words Count',
    'Structural Redundancy',
    'Main Topics',
    'Topic Confidence',
    'Topic Drift Score',
    'Overall Reliability',
    'Warnings Count',
  ];

  const rows = documents.map(doc => {
    const analyticsData = analytics.get(doc.id);
    if (!analyticsData) {
      const emptyRow = new Array(headers.length).fill('0');
      emptyRow[0] = doc.id;
      emptyRow[1] = doc.title;
      emptyRow[2] = new Date(doc.createdAt).toISOString();
      emptyRow[3] = new Date(doc.updatedAt).toISOString();
      emptyRow[4] = doc.project || '';
      emptyRow[5] = doc.category || '';
      emptyRow[6] = doc.tags?.join(';') || '';
      emptyRow[12] = 'neutral';
      emptyRow[13] = 'neutral';
      return emptyRow;
    }

    return [
      doc.id,
      doc.title,
      new Date(doc.createdAt).toISOString(),
      new Date(doc.updatedAt).toISOString(),
      doc.project || '',
      doc.category || '',
      doc.tags?.join(';') || '',
      analyticsData.wordCount.toString(),
      analyticsData.characterCount.toString(),
      analyticsData.sentenceCount.toString(),
      analyticsData.paragraphCount.toString(),
      analyticsData.sentiment.score.toFixed(3),
      analyticsData.sentiment.label,
      analyticsData.sentiment.polarity,
      analyticsData.sentiment.volatility?.toFixed(4) || '0',
      analyticsData.uncertaintyIndicators?.sentimentConfidence.toFixed(4) || '1',
      analyticsData.readability.fleschReadingEase.toFixed(2),
      analyticsData.readability.fleschKincaidGrade.toFixed(2),
      analyticsData.readability.gunningFog.toFixed(2),
      analyticsData.readability.smogIndex.toFixed(2),
      analyticsData.readability.colemanLiau?.toFixed(2) || '0',
      analyticsData.readability.automatedReadabilityIndex?.toFixed(2) || '0',
      analyticsData.uncertaintyIndicators?.readabilityConfidence.toFixed(4) || '1',
      analyticsData.lexicalRichness.typeTokenRatio.toFixed(4),
      analyticsData.lexicalRichness.movingAverageTTR?.toFixed(4) || '0',
      analyticsData.lexicalRichness.hapaxLegomena.toString(),
      analyticsData.lexicalRichness.vocabularyDiversity?.toFixed(4) || '0',
      analyticsData.lexicalRichness.rareWordUsage?.toFixed(4) || '0',
      analyticsData.lexicalRichness.repetitionRate?.toFixed(4) || '0',
      analyticsData.styleMetrics.avgSentenceLength.toFixed(2),
      analyticsData.styleMetrics.avgWordLength.toFixed(2),
      analyticsData.styleMetrics.passiveVoiceCount?.toString() || '0',
      (analyticsData.styleMetrics.passiveVoiceCount && analyticsData.sentenceCount 
        ? ((analyticsData.styleMetrics.passiveVoiceCount / analyticsData.sentenceCount) * 100).toFixed(2) 
        : '0'),
      analyticsData.styleMetrics.punctuationDensity?.toFixed(4) || '0',
      analyticsData.styleMetrics.clauseDepth?.toFixed(2) || '0',
      analyticsData.styleMetrics.syntacticVariation?.toFixed(4) || '0',
      (analyticsData.styleMetrics.rhythmPatterns?.length 
        ? (analyticsData.styleMetrics.rhythmPatterns.reduce((a: number, b: number) => a + b, 0) / analyticsData.styleMetrics.rhythmPatterns.length).toFixed(4)
        : '0'),
      analyticsData.repetition?.deliberateRepetition?.toFixed(4) || '0',
      analyticsData.repetition?.accidentalRepetition?.toFixed(4) || '0',
      analyticsData.repetition?.fillerWordsCount?.toString() || '0',
      analyticsData.repetition?.structuralRedundancy?.toFixed(4) || '0',
      analyticsData.topics?.mainTopics?.join(';') || '',
      analyticsData.uncertaintyIndicators?.topicConfidence.toFixed(4) || '1',
      analyticsData.topics?.topicDrift?.toFixed(4) || '0',
      analyticsData.uncertaintyIndicators?.overallReliability.toFixed(4) || '1',
      analyticsData.uncertaintyIndicators?.warnings?.length.toString() || '0',
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
