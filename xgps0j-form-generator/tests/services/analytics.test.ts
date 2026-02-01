import { generateId } from '@/utils/helpers';
import { Survey, Response } from '@/types/survey';

// Simple analytics functions for testing
function calculateCompletionRate(responses: Response[]): number {
  if (responses.length === 0) return 0;
  const completed = responses.filter(r => r.isComplete).length;
  return completed / responses.length;
}

function calculateAverageTime(responses: Response[]): number | undefined {
  const completedWithTime = responses.filter(r => r.isComplete && r.timeToComplete);
  if (completedWithTime.length === 0) return undefined;
  
  const totalTime = completedWithTime.reduce((sum, r) => sum + (r.timeToComplete || 0), 0);
  return totalTime / completedWithTime.length;
}

describe('Analytics Functions', () => {
  const mockSurvey: Survey = {
    id: 'test-survey-id',
    title: 'Test Survey',
    description: 'A test survey',
    createdAt: new Date(),
    updatedAt: new Date(),
    version: 1,
    published: true,
    sections: [],
    questions: [
      {
        id: 'q1',
        type: 'rating_scale',
        title: 'Rate our service',
        required: true,
        order: 0,
        minValue: 1,
        maxValue: 5,
      },
      {
        id: 'q2',
        type: 'single_choice',
        title: 'Favorite color',
        required: true,
        order: 1,
        options: [
          { id: 'opt1', label: 'Red', value: 'red' },
          { id: 'opt2', label: 'Blue', value: 'blue' },
        ],
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

  const mockResponses: Response[] = [
    {
      id: generateId(),
      surveyId: 'test-survey-id',
      surveyVersion: 1,
      answers: [
        { questionId: 'q1', value: 4 },
        { questionId: 'q2', value: 'blue' },
      ],
      startedAt: new Date('2024-01-15T10:00:00Z'),
      completedAt: new Date('2024-01-15T10:05:00Z'),
      isComplete: true,
      completionRate: 1.0,
      timeToComplete: 300,
    },
    {
      id: generateId(),
      surveyId: 'test-survey-id',
      surveyVersion: 1,
      answers: [
        { questionId: 'q1', value: 5 },
        { questionId: 'q2', value: 'red' },
      ],
      startedAt: new Date('2024-01-15T11:00:00Z'),
      completedAt: new Date('2024-01-15T11:03:00Z'),
      isComplete: true,
      completionRate: 1.0,
      timeToComplete: 180,
    },
  ];

  describe('calculateCompletionRate', () => {
    it('should calculate completion rate correctly', () => {
      const rate = calculateCompletionRate(mockResponses);
      expect(rate).toBe(1.0); // Both responses are complete
    });

    it('should handle empty responses', () => {
      const rate = calculateCompletionRate([]);
      expect(rate).toBe(0);
    });

    it('should handle partial responses', () => {
      const partialResponse = { ...mockResponses[0], isComplete: false };
      const rate = calculateCompletionRate([mockResponses[0], partialResponse]);
      expect(rate).toBe(0.5); // 1 out of 2 complete
    });
  });

  describe('calculateAverageTime', () => {
    it('should calculate average time correctly', () => {
      const avgTime = calculateAverageTime(mockResponses);
      expect(avgTime).toBe(240); // (300 + 180) / 2
    });

    it('should handle responses without time', () => {
      const responseWithoutTime = { ...mockResponses[0], timeToComplete: undefined };
      const avgTime = calculateAverageTime([responseWithoutTime]);
      expect(avgTime).toBeUndefined();
    });

    it('should handle empty responses', () => {
      const avgTime = calculateAverageTime([]);
      expect(avgTime).toBeUndefined();
    });
  });

  describe('Response filtering', () => {
    it('should filter by completion status', () => {
      const partialResponse = { ...mockResponses[0], isComplete: false };
      const allResponses = [...mockResponses, partialResponse];
      
      const completedOnly = allResponses.filter(r => r.isComplete);
      const partialOnly = allResponses.filter(r => !r.isComplete);
      
      expect(completedOnly).toHaveLength(2);
      expect(partialOnly).toHaveLength(1);
    });

    it('should filter by date range', () => {
      const filtered = mockResponses.filter(r => {
        const responseDate = r.completedAt || r.startedAt;
        return responseDate >= new Date('2024-01-15T10:30:00Z') && 
               responseDate <= new Date('2024-01-15T11:30:00Z');
      });

      expect(filtered).toHaveLength(1);
      expect(filtered[0].startedAt.getTime()).toBeGreaterThanOrEqual(
        new Date('2024-01-15T10:30:00Z').getTime()
      );
    });

    it('should search in text responses', () => {
      const responseWithText = {
        ...mockResponses[0],
        answers: [
          { questionId: 'q1', value: 4 },
          { questionId: 'q2', value: 'blue' },
          { questionId: 'q3', value: 'This is a test response' },
        ],
      };
      const allResponses = [responseWithText, mockResponses[1]];

      const filtered = allResponses.filter(r => 
        r.answers.some(a => 
          typeof a.value === 'string' && 
          a.value.toLowerCase().includes('test response')
        )
      );

      expect(filtered).toHaveLength(1);
      expect(filtered[0].id).toBe(responseWithText.id);
    });
  });

  describe('Data distribution', () => {
    it('should compute response distribution', () => {
      const singleChoiceQuestion = mockSurvey.questions[1];
      const responses = mockResponses.map(r => 
        r.answers.find(a => a.questionId === singleChoiceQuestion.id)?.value
      ).filter(Boolean);
      
      const distribution = responses.reduce((acc: Record<string, number>, value) => {
        acc[value as string] = (acc[value as string] || 0) + 1;
        return acc;
      }, {});

      expect(distribution).toEqual({ blue: 1, red: 1 });
    });

    it('should compute rating statistics', () => {
      const ratingQuestion = mockSurvey.questions[0];
      const ratings = mockResponses
        .map(r => r.answers.find(a => a.questionId === ratingQuestion.id)?.value)
        .filter(v => typeof v === 'number') as number[];

      const sum = ratings.reduce((acc, val) => acc + val, 0);
      const average = sum / ratings.length;
      const sortedRatings = [...ratings].sort((a, b) => a - b);
      const median = sortedRatings.length % 2 === 0
        ? (sortedRatings[sortedRatings.length / 2 - 1] + sortedRatings[sortedRatings.length / 2]) / 2
        : sortedRatings[Math.floor(sortedRatings.length / 2)];

      expect(average).toBe(4.5); // (4 + 5) / 2
      expect(median).toBe(4.5);
      expect(Math.min(...ratings)).toBe(4);
      expect(Math.max(...ratings)).toBe(5);
    });
  });
});