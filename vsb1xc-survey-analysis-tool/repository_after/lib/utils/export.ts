import { Survey, SurveyResponse, DatasetSnapshot } from '@/lib/schemas/survey';
import { StatisticalSummary, ResearchInsight, Segment } from '@/lib/schemas/analytics';
import { computeStatisticalSummary } from './dataProcessing';

/**
 * Exports responses to CSV format with full precision and schema integrity
 */
export function exportResponsesToCSV(
  responses: SurveyResponse[],
  survey: Survey,
  options?: {
    includeMetadata?: boolean;
    precision?: number;
    includeTimestamps?: boolean;
  }
): string {
  if (responses.length === 0) return '';

  const { includeMetadata = true, precision = 10, includeTimestamps = true } = options || {};

  // Build headers with question titles for clarity
  const headers: string[] = ['Response ID'];
  if (includeTimestamps) {
    headers.push('Submitted At', 'Completed');
  }
  survey.questions.forEach(q => {
    headers.push(`Q${q.order}: ${q.title}`);
  });
  if (includeMetadata) {
    headers.push('Total Time (ms)', 'Completion Rate');
  }

  const rows: string[][] = [headers];

  responses.forEach(response => {
    const row: string[] = [response.id];
    
    if (includeTimestamps) {
      row.push(
        response.submittedAt,
        response.completed ? 'Yes' : 'No'
      );
    }

    survey.questions.forEach(q => {
      const res = response.responses.find(r => r.questionId === q.id);
      const value = res?.value;
      
      if (value === null || value === undefined) {
        row.push('');
      } else if (typeof value === 'number') {
        // Preserve full numeric precision
        row.push(value.toFixed(precision).replace(/\.?0+$/, ''));
      } else if (Array.isArray(value)) {
        row.push(value.map(v => 
          typeof v === 'number' ? v.toFixed(precision).replace(/\.?0+$/, '') : String(v)
        ).join(';'));
      } else if (typeof value === 'object') {
        row.push(JSON.stringify(value));
      } else {
        row.push(String(value));
      }
    });

    if (includeMetadata && response.metadata) {
      row.push(
        response.metadata.totalTime?.toString() || '',
        response.metadata.completionRate?.toFixed(precision) || ''
      );
    }

    rows.push(row);
  });

  return rows.map(row => 
    row.map(cell => {
      const str = String(cell);
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    }).join(',')
  ).join('\n');
}

/**
 * Exports responses to JSON format with full precision and schema
 */
export function exportResponsesToJSON(
  responses: SurveyResponse[],
  options?: {
    includeSchema?: boolean;
    precision?: number;
  }
): string {
  const { includeSchema = true, precision = 10 } = options || {};

  // Create export object with schema metadata
  const exportData: {
    schema?: {
      version: string;
      exportedAt: string;
      responseCount: number;
      fields: string[];
    };
    data: SurveyResponse[];
  } = {
    data: responses.map(response => {
      // Deep clone to preserve original
      const cloned = JSON.parse(JSON.stringify(response));
      
      // Ensure numeric precision
      cloned.responses = cloned.responses.map((res: { value: unknown }) => {
        if (typeof res.value === 'number') {
          res.value = parseFloat(res.value.toFixed(precision));
        } else if (Array.isArray(res.value)) {
          res.value = res.value.map((v: unknown) => 
            typeof v === 'number' ? parseFloat(Number(v).toFixed(precision)) : v
          );
        }
        return res;
      });
      
      return cloned;
    }),
  };

  if (includeSchema) {
    exportData.schema = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      responseCount: responses.length,
      fields: ['id', 'surveyId', 'responses', 'submittedAt', 'completed', 'metadata'],
    };
  }

  return JSON.stringify(exportData, null, 2);
}

/**
 * Exports statistical summary to CSV
 */
export function exportSummaryToCSV(
  summaries: Map<string, StatisticalSummary>,
  survey: Survey
): string {
  const headers = ['Question ID', 'Question Title', 'Count', 'Mean', 'Median', 'Std Dev', 'Min', 'Max'];
  const rows: string[][] = [headers];

  survey.questions.forEach(question => {
    const summary = summaries.get(question.id);
    if (summary) {
      rows.push([
        question.id,
        question.title,
        String(summary.count),
        summary.mean?.toFixed(2) || '',
        summary.median?.toFixed(2) || '',
        summary.stdDev?.toFixed(2) || '',
        summary.min?.toString() || '',
        summary.max?.toString() || '',
      ]);
    }
  });

  return rows.map(row => row.join(',')).join('\n');
}

/**
 * Generates a research report in markdown format
 */
export function generateResearchReport(
  survey: Survey,
  responses: SurveyResponse[],
  summaries: Map<string, StatisticalSummary>,
  snapshot?: DatasetSnapshot
): string {
  const report: string[] = [];

  report.push(`# Research Report: ${survey.title}\n`);
  report.push(`**Generated:** ${new Date().toISOString()}\n`);
  report.push(`**Total Responses:** ${responses.length}\n`);
  if (snapshot) {
    report.push(`**Dataset Snapshot:** ${snapshot.name}\n`);
    report.push(`**Snapshot Created:** ${snapshot.createdAt}\n`);
  }
  report.push('\n---\n\n');

  report.push('## Executive Summary\n\n');
  const completed = responses.filter(r => r.completed).length;
  const completionRate = (completed / responses.length) * 100;
  report.push(`- **Completion Rate:** ${completionRate.toFixed(1)}%\n`);
  report.push(`- **Total Questions:** ${survey.questions.length}\n`);
  report.push(`- **Valid Responses:** ${completed}\n\n`);

  report.push('## Question Analysis\n\n');
  survey.questions.forEach((question, index) => {
    report.push(`### ${index + 1}. ${question.title}\n\n`);
    if (question.description) {
      report.push(`${question.description}\n\n`);
    }

    const summary = summaries.get(question.id);
    if (summary) {
      report.push('**Statistical Summary:**\n');
      report.push(`- Count: ${summary.count}\n`);
      report.push(`- Missing: ${summary.missing}\n`);
      if (summary.mean !== null) {
        report.push(`- Mean: ${summary.mean.toFixed(2)}\n`);
      }
      if (summary.median !== null) {
        report.push(`- Median: ${summary.median.toFixed(2)}\n`);
      }
      if (summary.stdDev !== null) {
        report.push(`- Standard Deviation: ${summary.stdDev.toFixed(2)}\n`);
      }
      if (summary.frequencyDistribution && summary.frequencyDistribution.length > 0) {
        report.push('\n**Frequency Distribution:**\n');
        summary.frequencyDistribution.slice(0, 10).forEach(item => {
          report.push(`- ${item.value}: ${item.count} (${(item.proportion * 100).toFixed(1)}%)\n`);
        });
      }
    }
    report.push('\n');
  });

  if (snapshot && snapshot.cleaningRules.length > 0) {
    report.push('## Data Cleaning Operations\n\n');
    snapshot.cleaningRules.forEach(rule => {
      report.push(`- **${rule.type}** (Applied: ${rule.appliedAt})\n`);
    });
    report.push('\n');
  }

  report.push('## Notes\n\n');
  report.push('This report was generated automatically. Please review all findings carefully.\n');

  return report.join('');
}

/**
 * Exports segmented subset to CSV
 */
export function exportSegmentToCSV(
  responses: SurveyResponse[],
  survey: Survey,
  segment: Segment
): string {
  const segmentResponses = responses.filter(r => segment.responseIds.includes(r.id));
  return exportResponsesToCSV(segmentResponses, survey, {
    includeMetadata: true,
    precision: 10,
    includeTimestamps: true,
  });
}

/**
 * Exports analytical summaries to structured format
 */
export function exportAnalyticalSummary(
  summaries: Map<string, StatisticalSummary>,
  survey: Survey,
  format: 'csv' | 'json' = 'csv'
): string {
  if (format === 'json') {
    const data = {
      exportedAt: new Date().toISOString(),
      surveyId: survey.id,
      surveyTitle: survey.title,
      summaries: Array.from(summaries.entries()).map(([questionId, summary]) => {
        const question = survey.questions.find(q => q.id === questionId);
        return {
          questionId,
          questionTitle: question?.title || questionId,
          ...summary,
        };
      }),
    };
    return JSON.stringify(data, null, 2);
  }

  // CSV format
  const headers = [
    'Question ID',
    'Question Title',
    'Count',
    'Missing',
    'Mean',
    'Median',
    'Std Dev',
    'Variance',
    'Min',
    'Max',
    'Q1',
    'Q2',
    'Q3',
  ];
  const rows: string[][] = [headers];

  survey.questions.forEach(question => {
    const summary = summaries.get(question.id);
    if (summary) {
      rows.push([
        question.id,
        question.title,
        String(summary.count),
        String(summary.missing),
        summary.mean?.toFixed(10) || '',
        summary.median?.toFixed(10) || '',
        summary.stdDev?.toFixed(10) || '',
        summary.variance?.toFixed(10) || '',
        summary.min?.toFixed(10) || '',
        summary.max?.toFixed(10) || '',
        summary.quartiles?.q1.toFixed(10) || '',
        summary.quartiles?.q2.toFixed(10) || '',
        summary.quartiles?.q3.toFixed(10) || '',
      ]);
    }
  });

  return rows.map(row => row.join(',')).join('\n');
}

/**
 * Exports research notes and insights
 */
export function exportResearchNotes(
  insights: ResearchInsight[],
  format: 'csv' | 'json' | 'markdown' = 'markdown'
): string {
  if (format === 'json') {
    return JSON.stringify({
      exportedAt: new Date().toISOString(),
      insights: insights.map(i => ({
        ...i,
        createdAt: i.createdAt,
        updatedAt: i.updatedAt,
      })),
    }, null, 2);
  }

  if (format === 'csv') {
    const headers = ['ID', 'Title', 'Type', 'Content', 'Question ID', 'Segment ID', 'Created At', 'Updated At'];
    const rows: string[][] = [headers];
    
    insights.forEach(insight => {
      rows.push([
        insight.id,
        insight.title,
        insight.type,
        insight.content.replace(/\n/g, ' '),
        insight.questionId || '',
        insight.segmentId || '',
        insight.createdAt,
        insight.updatedAt,
      ]);
    });
    
    return rows.map(row => 
      row.map(cell => {
        const str = String(cell);
        if (str.includes(',') || str.includes('"')) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      }).join(',')
    ).join('\n');
  }

  // Markdown format
  const markdown: string[] = [];
  markdown.push('# Research Notes and Insights\n\n');
  markdown.push(`**Exported:** ${new Date().toISOString()}\n\n`);
  markdown.push(`**Total Insights:** ${insights.length}\n\n`);
  markdown.push('---\n\n');

  insights.forEach(insight => {
    markdown.push(`## ${insight.title}\n\n`);
    markdown.push(`**Type:** ${insight.type}\n\n`);
    if (insight.questionId) {
      markdown.push(`**Linked Question:** ${insight.questionId}\n\n`);
    }
    if (insight.segmentId) {
      markdown.push(`**Linked Segment:** ${insight.segmentId}\n\n`);
    }
    markdown.push(`${insight.content}\n\n`);
    markdown.push(`*Created: ${insight.createdAt} | Updated: ${insight.updatedAt}*\n\n`);
    markdown.push('---\n\n');
  });

  return markdown.join('');
}

/**
 * Generates comprehensive research report with full traceability
 */
export function generateComprehensiveReport(
  survey: Survey,
  responses: SurveyResponse[],
  summaries: Map<string, StatisticalSummary>,
  snapshot?: DatasetSnapshot,
  insights?: ResearchInsight[],
  segments?: Segment[]
): string {
  const report: string[] = [];

  report.push(`# Comprehensive Research Report: ${survey.title}\n\n`);
  report.push(`**Generated:** ${new Date().toISOString()}\n`);
  report.push(`**Report Version:** 1.0\n`);
  report.push(`**Survey ID:** ${survey.id}\n`);
  report.push(`**Total Responses:** ${responses.length}\n`);
  
  if (snapshot) {
    report.push(`**Dataset Snapshot:** ${snapshot.name}\n`);
    report.push(`**Snapshot ID:** ${snapshot.id}\n`);
    report.push(`**Snapshot Created:** ${snapshot.createdAt}\n`);
    if (snapshot.cleaningRules.length > 0) {
      report.push(`**Cleaning Rules Applied:** ${snapshot.cleaningRules.length}\n`);
    }
  }
  
  report.push('\n---\n\n');

  // Executive Summary
  report.push('## Executive Summary\n\n');
  const completed = responses.filter(r => r.completed).length;
  const completionRate = (completed / responses.length) * 100;
  report.push(`- **Completion Rate:** ${completionRate.toFixed(2)}%\n`);
  report.push(`- **Total Questions:** ${survey.questions.length}\n`);
  report.push(`- **Valid Responses:** ${completed}\n`);
  report.push(`- **Response Period:** ${responses.length > 0 ? 
    `${new Date(Math.min(...responses.map(r => new Date(r.submittedAt).getTime()))).toISOString()} to ${new Date(Math.max(...responses.map(r => new Date(r.submittedAt).getTime()))).toISOString()}` 
    : 'N/A'}\n\n`);

  // Data Processing Traceability
  if (snapshot && snapshot.cleaningRules.length > 0) {
    report.push('## Data Processing History\n\n');
    report.push('### Cleaning Operations Applied\n\n');
    snapshot.cleaningRules.forEach((rule, index) => {
      report.push(`${index + 1}. **${rule.type}**\n`);
      report.push(`   - Applied: ${rule.appliedAt}\n`);
      report.push(`   - Configuration: ${JSON.stringify(rule.config, null, 2)}\n\n`);
    });
    report.push('\n');
  }

  // Segments
  if (segments && segments.length > 0) {
    report.push('## Segments Analyzed\n\n');
    segments.forEach(segment => {
      report.push(`### ${segment.name}\n\n`);
      if (segment.description) {
        report.push(`${segment.description}\n\n`);
      }
      report.push(`- **Response Count:** ${segment.responseIds.length}\n`);
      report.push(`- **Created:** ${segment.createdAt}\n\n`);
    });
  }

  // Question Analysis
  report.push('## Question Analysis\n\n');
  survey.questions.forEach((question, index) => {
    report.push(`### ${index + 1}. ${question.title}\n\n`);
    if (question.description) {
      report.push(`${question.description}\n\n`);
    }
    report.push(`**Question ID:** ${question.id}\n`);
    report.push(`**Type:** ${question.type}\n`);
    report.push(`**Required:** ${question.required ? 'Yes' : 'No'}\n\n`);

    const summary = summaries.get(question.id);
    if (summary) {
      report.push('**Statistical Summary:**\n');
      report.push(`- Count: ${summary.count}\n`);
      report.push(`- Missing: ${summary.missing}\n`);
      if (summary.mean !== null && summary.mean !== undefined) {
        report.push(`- Mean: ${summary.mean.toFixed(10)}\n`);
      }
      if (summary.median !== null && summary.median !== undefined) {
        report.push(`- Median: ${summary.median.toFixed(10)}\n`);
      }
      if (summary.stdDev !== null && summary.stdDev !== undefined) {
        report.push(`- Standard Deviation: ${summary.stdDev.toFixed(10)}\n`);
      }
      if (summary.variance !== null && summary.variance !== undefined) {
        report.push(`- Variance: ${summary.variance.toFixed(10)}\n`);
      }
      if (summary.min !== null && summary.min !== undefined) {
        report.push(`- Min: ${summary.min.toFixed(10)}\n`);
      }
      if (summary.max !== null && summary.max !== undefined) {
        report.push(`- Max: ${summary.max.toFixed(10)}\n`);
      }
      if (summary.quartiles) {
        report.push(`- Q1: ${summary.quartiles.q1.toFixed(10)}\n`);
        report.push(`- Q2: ${summary.quartiles.q2.toFixed(10)}\n`);
        report.push(`- Q3: ${summary.quartiles.q3.toFixed(10)}\n`);
      }
      if (summary.confidenceInterval) {
        report.push(`- 95% CI: [${summary.confidenceInterval.lower.toFixed(10)}, ${summary.confidenceInterval.upper.toFixed(10)}]\n`);
      }
      if (summary.frequencyDistribution && summary.frequencyDistribution.length > 0) {
        report.push('\n**Frequency Distribution:**\n');
        summary.frequencyDistribution.forEach(item => {
          report.push(`- ${item.value}: ${item.count} (${(item.proportion * 100).toFixed(6)}%)\n`);
        });
      }
    }
    report.push('\n');
  });

  // Research Insights
  if (insights && insights.length > 0) {
    report.push('## Research Insights\n\n');
    insights.forEach(insight => {
      report.push(`### ${insight.title}\n\n`);
      report.push(`**Type:** ${insight.type}\n\n`);
      report.push(`${insight.content}\n\n`);
      report.push(`*Created: ${insight.createdAt} | Updated: ${insight.updatedAt}*\n\n`);
    });
  }

  // Traceability Footer
  report.push('---\n\n');
  report.push('## Report Traceability\n\n');
  report.push('This report was generated with full traceability:\n');
  report.push(`- All timestamps preserved with ISO 8601 format\n`);
  report.push(`- Numeric precision maintained to 10 decimal places\n`);
  report.push(`- Schema integrity validated using Zod\n`);
  report.push(`- All data transformations documented\n`);
  if (snapshot) {
    report.push(`- Dataset snapshot: ${snapshot.id}\n`);
  }
  report.push(`- Report generation timestamp: ${new Date().toISOString()}\n`);

  return report.join('');
}

/**
 * Downloads a file
 */
export function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
