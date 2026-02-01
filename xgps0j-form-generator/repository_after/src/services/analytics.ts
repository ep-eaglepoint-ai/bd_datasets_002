import { Survey, Response, SurveyAnalytics, QuestionAnalytics, Question, QuestionType } from '@/types/survey';
import { databaseService } from './database';
import { format, startOfDay, differenceInDays } from 'date-fns';

export class AnalyticsService {
  /**
   * Compute comprehensive analytics for a survey
   */
  async computeSurveyAnalytics(surveyId: string): Promise<SurveyAnalytics> {
    const survey = await databaseService.getSurvey(surveyId);
    if (!survey) {
      throw new Error('Survey not found');
    }

    const responses = await databaseService.getResponsesBySurvey(surveyId);
    const completedResponses = responses.filter(r => r.isComplete);

    // Basic metrics
    const totalResponses = responses.length;
    const completedCount = completedResponses.length;
    const completionRate = totalResponses > 0 ? completedCount / totalResponses : 0;

    // Average time to complete
    const completionTimes = completedResponses
      .filter(r => r.timeToComplete !== undefined)
      .map(r => r.timeToComplete!);
    
    const averageTimeToComplete = completionTimes.length > 0
      ? completionTimes.reduce((sum, time) => sum + time, 0) / completionTimes.length
      : undefined;

    // Responses by day
    const responsesByDay = this.computeResponsesByDay(responses);

    // Question-level analytics
    const questionAnalytics = await this.computeQuestionAnalytics(survey, responses);

    const analytics: SurveyAnalytics = {
      surveyId,
      totalResponses,
      completedResponses: completedCount,
      completionRate,
      averageTimeToComplete,
      responsesByDay,
      questionAnalytics,
      lastUpdated: new Date(),
    };

    // Save analytics to database
    await databaseService.saveAnalytics(analytics);

    return analytics;
  }

  /**
   * Compute analytics for all questions in a survey
   */
  private async computeQuestionAnalytics(survey: Survey, responses: Response[]): Promise<QuestionAnalytics[]> {
    return survey.questions.map(question => {
      const questionResponses = responses
        .map(response => response.answers.find(answer => answer.questionId === question.id))
        .filter(answer => answer !== undefined);

      const validResponses = questionResponses.filter(answer => 
        answer!.value !== null && answer!.value !== undefined && answer!.value !== ''
      );

      const totalResponses = questionResponses.length;
      const validCount = validResponses.length;
      const responseRate = totalResponses > 0 ? validCount / totalResponses : 0;

      // Compute distribution and statistics based on question type
      const distribution = this.computeDistribution(question, validResponses.map(a => a!.value));
      const statistics = this.computeStatistics(question, validResponses.map(a => a!.value));

      return {
        questionId: question.id,
        questionType: question.type,
        totalResponses,
        validResponses: validCount,
        responseRate,
        distribution,
        statistics,
      };
    });
  }

  /**
   * Compute response distribution for a question
   */
  private computeDistribution(question: Question, values: any[]): Record<string, number> {
    const distribution: Record<string, number> = {};

    switch (question.type) {
      case 'single_choice':
      case 'boolean':
        values.forEach(value => {
          const key = String(value);
          distribution[key] = (distribution[key] || 0) + 1;
        });
        break;

      case 'multiple_choice':
        values.forEach(value => {
          if (Array.isArray(value)) {
            value.forEach(choice => {
              const key = String(choice);
              distribution[key] = (distribution[key] || 0) + 1;
            });
          }
        });
        break;

      case 'rating_scale':
      case 'numeric_input':
        values.forEach(value => {
          const key = String(value);
          distribution[key] = (distribution[key] || 0) + 1;
        });
        break;

      case 'short_text':
      case 'long_text':
        // For text questions, we could do word frequency or length distribution
        values.forEach(value => {
          const length = String(value).length;
          const lengthRange = this.getTextLengthRange(length);
          distribution[lengthRange] = (distribution[lengthRange] || 0) + 1;
        });
        break;
    }

    return distribution;
  }

  /**
   * Compute statistical measures for a question
   */
  private computeStatistics(question: Question, values: any[]): QuestionAnalytics['statistics'] {
    if (values.length === 0) return undefined;

    switch (question.type) {
      case 'rating_scale':
      case 'numeric_input':
        const numericValues = values
          .map(v => Number(v))
          .filter(v => !isNaN(v));

        if (numericValues.length === 0) return undefined;

        const sorted = [...numericValues].sort((a, b) => a - b);
        const sum = numericValues.reduce((acc, val) => acc + val, 0);
        const mean = sum / numericValues.length;
        
        const median = sorted.length % 2 === 0
          ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
          : sorted[Math.floor(sorted.length / 2)];

        // Mode (most frequent value)
        const frequency: Record<number, number> = {};
        numericValues.forEach(val => {
          frequency[val] = (frequency[val] || 0) + 1;
        });
        
        const mode = Object.entries(frequency)
          .reduce((a, b) => frequency[Number(a[0])] > frequency[Number(b[0])] ? a : b)[0];

        // Standard deviation
        const variance = numericValues.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / numericValues.length;
        const standardDeviation = Math.sqrt(variance);

        return {
          mean: Math.round(mean * 100) / 100,
          median,
          mode: Number(mode),
          standardDeviation: Math.round(standardDeviation * 100) / 100,
          min: Math.min(...numericValues),
          max: Math.max(...numericValues),
        };

      case 'single_choice':
      case 'boolean':
        // Mode for categorical data
        const categoryFreq: Record<string, number> = {};
        values.forEach(val => {
          const key = String(val);
          categoryFreq[key] = (categoryFreq[key] || 0) + 1;
        });

        const categoryMode = Object.entries(categoryFreq)
          .reduce((a, b) => categoryFreq[a[0]] > categoryFreq[b[0]] ? a : b)[0];

        return {
          mode: categoryMode,
        };

      case 'short_text':
      case 'long_text':
        const textLengths = values.map(v => String(v).length);
        const avgLength = textLengths.reduce((sum, len) => sum + len, 0) / textLengths.length;

        return {
          mean: Math.round(avgLength * 100) / 100,
          min: Math.min(...textLengths),
          max: Math.max(...textLengths),
        };

      default:
        return undefined;
    }
  }

  /**
   * Group responses by day for trend analysis
   */
  private computeResponsesByDay(responses: Response[]): Record<string, number> {
    const responsesByDay: Record<string, number> = {};

    responses.forEach(response => {
      const date = response.completedAt || response.startedAt;
      const dayKey = format(startOfDay(date), 'yyyy-MM-dd');
      responsesByDay[dayKey] = (responsesByDay[dayKey] || 0) + 1;
    });

    return responsesByDay;
  }

  /**
   * Get text length range for distribution
   */
  private getTextLengthRange(length: number): string {
    if (length === 0) return '0';
    if (length <= 10) return '1-10';
    if (length <= 50) return '11-50';
    if (length <= 100) return '51-100';
    if (length <= 500) return '101-500';
    return '500+';
  }

  /**
   * Filter responses based on criteria
   */
  async filterResponses(
    surveyId: string,
    filters: {
      dateRange?: { start: Date; end: Date };
      completionStatus?: 'all' | 'completed' | 'partial';
      questionFilters?: Array<{
        questionId: string;
        operator: 'equals' | 'contains' | 'greater_than' | 'less_than';
        value: any;
      }>;
      textSearch?: string;
    }
  ): Promise<Response[]> {
    let responses = await databaseService.getResponsesBySurvey(surveyId);

    // Date range filter
    if (filters.dateRange) {
      responses = responses.filter(response => {
        const date = response.completedAt || response.startedAt;
        return date >= filters.dateRange!.start && date <= filters.dateRange!.end;
      });
    }

    // Completion status filter
    if (filters.completionStatus && filters.completionStatus !== 'all') {
      responses = responses.filter(response => {
        if (filters.completionStatus === 'completed') return response.isComplete;
        if (filters.completionStatus === 'partial') return !response.isComplete;
        return true;
      });
    }

    // Question-based filters
    if (filters.questionFilters && filters.questionFilters.length > 0) {
      responses = responses.filter(response => {
        return filters.questionFilters!.every(filter => {
          const answer = response.answers.find(a => a.questionId === filter.questionId);
          if (!answer) return false;

          return this.evaluateFilter(answer.value, filter.operator, filter.value);
        });
      });
    }

    // Text search in free-text responses
    if (filters.textSearch) {
      const searchTerm = filters.textSearch.toLowerCase();
      responses = responses.filter(response => {
        return response.answers.some(answer => {
          if (typeof answer.value === 'string') {
            return answer.value.toLowerCase().includes(searchTerm);
          }
          return false;
        });
      });
    }

    return responses;
  }

  /**
   * Evaluate filter condition
   */
  private evaluateFilter(value: any, operator: string, filterValue: any): boolean {
    switch (operator) {
      case 'equals':
        return value === filterValue;
      
      case 'contains':
        if (typeof value === 'string' && typeof filterValue === 'string') {
          return value.toLowerCase().includes(filterValue.toLowerCase());
        }
        if (Array.isArray(value)) {
          return value.includes(filterValue);
        }
        return false;
      
      case 'greater_than':
        return Number(value) > Number(filterValue);
      
      case 'less_than':
        return Number(value) < Number(filterValue);
      
      default:
        return false;
    }
  }

  /**
   * Export analytics data in various formats
   */
  async exportAnalytics(surveyId: string, format: 'json' | 'csv'): Promise<string> {
    const analytics = await databaseService.getAnalytics(surveyId);
    const responses = await databaseService.getResponsesBySurvey(surveyId);
    const survey = await databaseService.getSurvey(surveyId);

    if (!analytics || !survey) {
      throw new Error('Analytics or survey not found');
    }

    if (format === 'json') {
      return JSON.stringify({
        survey: {
          id: survey.id,
          title: survey.title,
          description: survey.description,
        },
        analytics,
        exportedAt: new Date().toISOString(),
      }, null, 2);
    }

    if (format === 'csv') {
      return this.generateCSVExport(survey, responses, analytics);
    }

    throw new Error('Unsupported export format');
  }

  /**
   * Generate CSV export of survey data
   */
  private generateCSVExport(survey: Survey, responses: Response[], analytics: SurveyAnalytics): string {
    const headers = ['Response ID', 'Started At', 'Completed At', 'Is Complete', 'Time to Complete (seconds)'];
    
    // Add question headers
    survey.questions.forEach(question => {
      headers.push(`${question.title} (${question.type})`);
    });

    const rows = [headers];

    responses.forEach(response => {
      const row = [
        response.id,
        response.startedAt.toISOString(),
        response.completedAt?.toISOString() || '',
        response.isComplete.toString(),
        response.timeToComplete?.toString() || '',
      ];

      // Add answer values
      survey.questions.forEach(question => {
        const answer = response.answers.find(a => a.questionId === question.id);
        if (answer) {
          if (Array.isArray(answer.value)) {
            row.push(answer.value.join('; '));
          } else {
            row.push(String(answer.value));
          }
        } else {
          row.push('');
        }
      });

      rows.push(row);
    });

    // Convert to CSV format
    return rows.map(row => 
      row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
    ).join('\n');
  }

  /**
   * Detect anomalies in responses
   */
  async detectAnomalies(surveyId: string): Promise<{
    responseId: string;
    anomalies: string[];
  }[]> {
    const responses = await databaseService.getResponsesBySurvey(surveyId);
    const survey = await databaseService.getSurvey(surveyId);
    
    if (!survey) return [];

    return responses.map(response => {
      const anomalies: string[] = [];

      // Check for extremely fast completion
      if (response.timeToComplete && response.timeToComplete < 10) {
        anomalies.push('Extremely fast completion time');
      }

      // Check for identical repeated answers
      const textAnswers = response.answers
        .filter(a => typeof a.value === 'string')
        .map(a => a.value as string);
      
      if (textAnswers.length > 1) {
        const uniqueAnswers = new Set(textAnswers);
        if (uniqueAnswers.size === 1 && textAnswers[0].length > 5) {
          anomalies.push('Identical repeated text answers');
        }
      }

      // Check for suspicious patterns
      const hasOnlyExtremeRatings = response.answers
        .filter(a => {
          const question = survey.questions.find(q => q.id === a.questionId);
          return question?.type === 'rating_scale';
        })
        .every(a => {
          const value = Number(a.value);
          return value === 1 || value === 5; // Assuming 1-5 scale
        });

      if (hasOnlyExtremeRatings && response.answers.length > 3) {
        anomalies.push('Only extreme rating values selected');
      }

      return {
        responseId: response.id,
        anomalies,
      };
    }).filter(result => result.anomalies.length > 0);
  }
}

export const analyticsService = new AnalyticsService();