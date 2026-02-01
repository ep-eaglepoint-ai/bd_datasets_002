import { Survey, Response, ResponseAnswer } from '@/types/survey';
import { generateId } from './helpers';

/**
 * Generate sample responses for a survey to demonstrate analytics
 */
export function generateSampleResponses(survey: Survey, count: number = 50): Response[] {
  const responses: Response[] = [];
  const now = new Date();

  for (let i = 0; i < count; i++) {
    const startedAt = new Date(now.getTime() - Math.random() * 30 * 24 * 60 * 60 * 1000); // Last 30 days
    const completionTime = Math.random() < 0.8 ? Math.floor(Math.random() * 600) + 60 : undefined; // 60-660 seconds
    const isComplete = completionTime !== undefined;
    const completedAt = isComplete ? new Date(startedAt.getTime() + completionTime * 1000) : undefined;

    const answers: ResponseAnswer[] = [];

    survey.questions.forEach((question) => {
      // Skip some questions randomly for incomplete responses
      if (!isComplete && Math.random() < 0.3) return;

      let value: any;

      switch (question.type) {
        case 'single_choice':
          if (question.type === 'single_choice' && question.options) {
            value = question.options[Math.floor(Math.random() * question.options.length)].value;
          }
          break;

        case 'multiple_choice':
          if (question.type === 'multiple_choice' && question.options) {
            const selectedCount = Math.floor(Math.random() * Math.min(3, question.options.length)) + 1;
            const shuffled = [...question.options].sort(() => 0.5 - Math.random());
            value = shuffled.slice(0, selectedCount).map(opt => opt.value);
          }
          break;

        case 'rating_scale':
          if (question.type === 'rating_scale') {
            const min = question.minValue || 1;
            const max = question.maxValue || 5;
            // Bias towards middle and higher ratings
            const weights = [0.1, 0.15, 0.25, 0.3, 0.2]; // For 1-5 scale
            const random = Math.random();
            let cumulative = 0;
            for (let j = 0; j < weights.length; j++) {
              cumulative += weights[j];
              if (random <= cumulative) {
                value = min + j;
                break;
              }
            }
            if (value === undefined) value = max;
          }
          break;

        case 'numeric_input':
          if (question.type === 'numeric_input') {
            const min = question.minValue || 0;
            const max = question.maxValue || 100;
            value = Math.floor(Math.random() * (max - min + 1)) + min;
          }
          break;

        case 'boolean':
          value = Math.random() < 0.6; // 60% true, 40% false
          break;

        case 'short_text':
          const shortTexts = [
            'Great experience',
            'Could be better',
            'Excellent service',
            'Very satisfied',
            'Good overall',
            'Needs improvement',
            'Outstanding',
            'Average',
            'Disappointing',
            'Exceeded expectations',
            'Professional',
            'Friendly staff',
            'Quick response',
            'High quality',
            'Value for money'
          ];
          value = shortTexts[Math.floor(Math.random() * shortTexts.length)];
          break;

        case 'long_text':
          const longTexts = [
            'I had a wonderful experience with this service. The staff was professional and helpful throughout the entire process. I would definitely recommend this to others.',
            'The service was okay but there is definitely room for improvement. The wait time was longer than expected and the communication could be better.',
            'Absolutely fantastic! This exceeded all my expectations. The attention to detail and customer service was outstanding. Will definitely use again.',
            'Average experience. Nothing particularly good or bad to report. It did what it was supposed to do.',
            'I was disappointed with the service. The quality did not match the price and the staff seemed unprepared.',
            'Great value for money. The service was efficient and the results were exactly what I needed. Very satisfied with the outcome.',
            'The initial consultation was excellent but the follow-up could have been better. Overall a positive experience though.',
            'Quick and professional service. Everything was handled smoothly and the final result was perfect.',
            'Had some issues initially but the team worked hard to resolve them. Appreciate the effort to make things right.',
            'Outstanding customer service and high-quality results. This is exactly what I was looking for.'
          ];
          value = longTexts[Math.floor(Math.random() * longTexts.length)];
          break;

        default:
          value = 'Sample response';
      }

      answers.push({
        questionId: question.id,
        value,
        timestamp: survey.settings.collectTimestamps ? new Date(startedAt.getTime() + Math.random() * (completionTime || 300) * 1000) : undefined,
      });
    });

    const response: Response = {
      id: generateId(),
      surveyId: survey.id,
      surveyVersion: survey.version,
      answers,
      startedAt,
      completedAt,
      isComplete,
      completionRate: answers.length / survey.questions.length,
      timeToComplete: completionTime,
      metadata: {
        userAgent: 'Mozilla/5.0 (Sample Data)',
        sessionId: generateId(),
      },
    };

    responses.push(response);
  }

  return responses;
}

/**
 * Create a sample survey with various question types
 */
export function createSampleSurvey(): Survey {
  const surveyId = generateId();
  const now = new Date();

  return {
    id: surveyId,
    title: 'Customer Satisfaction Survey',
    description: 'Help us improve our services by sharing your feedback',
    createdAt: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
    updatedAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
    version: 1,
    published: true,
    publishedAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
    sections: [
      {
        id: generateId(),
        title: 'General Feedback',
        description: 'Tell us about your overall experience',
        order: 0,
      },
      {
        id: generateId(),
        title: 'Service Quality',
        description: 'Rate different aspects of our service',
        order: 1,
      }
    ],
    questions: [
      {
        id: generateId(),
        type: 'rating_scale',
        title: 'How would you rate your overall experience?',
        description: 'Please rate from 1 (very poor) to 5 (excellent)',
        required: true,
        order: 0,
        minValue: 1,
        maxValue: 5,
        minLabel: 'Very Poor',
        maxLabel: 'Excellent',
      },
      {
        id: generateId(),
        type: 'single_choice',
        title: 'How did you hear about us?',
        required: true,
        order: 1,
        options: [
          { id: generateId(), label: 'Social Media', value: 'social_media' },
          { id: generateId(), label: 'Search Engine', value: 'search_engine' },
          { id: generateId(), label: 'Friend/Family', value: 'referral' },
          { id: generateId(), label: 'Advertisement', value: 'advertisement' },
          { id: generateId(), label: 'Other', value: 'other' },
        ],
      },
      {
        id: generateId(),
        type: 'multiple_choice',
        title: 'Which services did you use?',
        description: 'Select all that apply',
        required: false,
        order: 2,
        options: [
          { id: generateId(), label: 'Customer Support', value: 'support' },
          { id: generateId(), label: 'Online Platform', value: 'platform' },
          { id: generateId(), label: 'Mobile App', value: 'mobile' },
          { id: generateId(), label: 'In-Person Service', value: 'in_person' },
          { id: generateId(), label: 'Phone Service', value: 'phone' },
        ],
        minSelections: 1,
        maxSelections: 5,
      },
      {
        id: generateId(),
        type: 'boolean',
        title: 'Would you recommend us to others?',
        required: true,
        order: 3,
        trueLabel: 'Yes',
        falseLabel: 'No',
      },
      {
        id: generateId(),
        type: 'numeric_input',
        title: 'How many times have you used our service?',
        required: false,
        order: 4,
        minValue: 0,
        maxValue: 100,
        allowDecimals: false,
        placeholder: 'Enter number of times',
      },
      {
        id: generateId(),
        type: 'short_text',
        title: 'In one word, how would you describe our service?',
        required: false,
        order: 5,
        maxLength: 50,
        placeholder: 'Enter one word',
      },
      {
        id: generateId(),
        type: 'long_text',
        title: 'Any additional comments or suggestions?',
        description: 'Please share any feedback that would help us improve',
        required: false,
        order: 6,
        maxLength: 1000,
        placeholder: 'Share your thoughts...',
      },
    ],
    settings: {
      allowAnonymous: true,
      requireCompletion: false,
      showProgressBar: true,
      randomizeQuestions: false,
      collectTimestamps: true,
    },
  };
}

/**
 * Generate sample data for demonstration
 */
export async function generateSampleData() {
  const { databaseService } = await import('@/services/database');
  
  // Create sample survey
  const survey = createSampleSurvey();
  await databaseService.saveSurvey(survey);

  // Generate sample responses
  const responses = generateSampleResponses(survey, 75);
  await databaseService.batchSaveResponses(responses);

  // Generate analytics
  const { analyticsService } = await import('@/services/analytics');
  await analyticsService.computeSurveyAnalytics(survey.id);

  return { survey, responses };
}