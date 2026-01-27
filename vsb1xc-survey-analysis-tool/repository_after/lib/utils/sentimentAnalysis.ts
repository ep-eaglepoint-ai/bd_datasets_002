import { SurveyResponse } from '@/lib/schemas/survey';
import { SentimentResult, ThematicAnalysis } from '@/lib/schemas/analytics';

// Simple sentiment analysis using word lists (client-side, no API)
const positiveWords = new Set([
  'good', 'great', 'excellent', 'amazing', 'wonderful', 'fantastic', 'love', 'liked', 'enjoyed',
  'happy', 'satisfied', 'pleased', 'perfect', 'best', 'awesome', 'brilliant', 'outstanding',
  'positive', 'helpful', 'useful', 'valuable', 'beneficial', 'effective', 'efficient',
  'impressive', 'recommend', 'appreciate', 'thank', 'grateful', 'delighted', 'pleased',
]);

const negativeWords = new Set([
  'bad', 'terrible', 'awful', 'horrible', 'worst', 'hate', 'dislike', 'disappointed',
  'frustrated', 'angry', 'annoyed', 'upset', 'poor', 'useless', 'waste', 'broken',
  'failed', 'problem', 'issue', 'error', 'difficult', 'confusing', 'complicated',
  'slow', 'buggy', 'unreliable', 'inadequate', 'insufficient', 'lacking', 'missing',
]);

/**
 * Simple tokenization (split by whitespace and punctuation)
 */
function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 2);
}

/**
 * Computes sentiment score for a text
 */
export function computeSentiment(text: string): SentimentResult {
  if (!text || typeof text !== 'string' || text.trim().length === 0) {
    return {
      score: 0,
      magnitude: 0,
      label: 'neutral',
      keywords: [],
    };
  }

  const tokens = tokenize(text);
  const wordFreq = new Map<string, number>();
  
  let positiveCount = 0;
  let negativeCount = 0;
  const keywords: Array<{ word: string; frequency: number; sentiment: number }> = [];

  tokens.forEach(token => {
    const count = (wordFreq.get(token) || 0) + 1;
    wordFreq.set(token, count);

    let sentiment = 0;
    if (positiveWords.has(token)) {
      positiveCount++;
      sentiment = 1;
    } else if (negativeWords.has(token)) {
      negativeCount++;
      sentiment = -1;
    }

    if (sentiment !== 0) {
      const existing = keywords.find(k => k.word === token);
      if (existing) {
        existing.frequency = count;
        existing.sentiment = sentiment;
      } else {
        keywords.push({ word: token, frequency: count, sentiment });
      }
    }
  });

  const total = positiveCount + negativeCount;
  const score = total === 0 ? 0 : (positiveCount - negativeCount) / total;
  const magnitude = total / tokens.length;

  let label: 'positive' | 'negative' | 'neutral' = 'neutral';
  if (score > 0.1) label = 'positive';
  else if (score < -0.1) label = 'negative';

  return {
    score,
    magnitude,
    label,
    keywords: keywords.sort((a, b) => b.frequency - a.frequency).slice(0, 10),
  };
}

/**
 * Analyzes sentiment for all text responses in a survey
 */
export function analyzeSentimentForResponses(
  responses: SurveyResponse[],
  questionId: string
): Map<string, SentimentResult> {
  const results = new Map<string, SentimentResult>();

  responses.forEach(response => {
    const textResponse = response.responses.find(r => 
      r.questionId === questionId && typeof r.value === 'string'
    );

    if (textResponse && typeof textResponse.value === 'string') {
      const sentiment = computeSentiment(textResponse.value);
      results.set(response.id, sentiment);
    }
  });

  return results;
}

/**
 * Extracts keywords and themes from text responses
 */
export function extractThemes(
  responses: SurveyResponse[],
  questionId: string,
  minFrequency: number = 2
): ThematicAnalysis {
  const textResponses = responses
    .map(response => ({
      responseId: response.id,
      text: response.responses.find(r => 
        r.questionId === questionId && typeof r.value === 'string'
      )?.value as string | undefined,
    }))
    .filter(item => item.text && item.text.trim().length > 0);

  const wordFreq = new Map<string, { frequency: number; responseIds: Set<string> }>();

  textResponses.forEach(({ responseId, text }) => {
    if (!text) return;
    const tokens = tokenize(text);
    const uniqueTokens = new Set(tokens);

    uniqueTokens.forEach(token => {
      const existing = wordFreq.get(token);
      if (existing) {
        existing.frequency++;
        existing.responseIds.add(responseId);
      } else {
        wordFreq.set(token, {
          frequency: 1,
          responseIds: new Set([responseId]),
        });
      }
    });
  });

  // Filter by minimum frequency and create themes
  const themes = Array.from(wordFreq.entries())
    .filter(([_, data]) => data.frequency >= minFrequency)
    .map(([word, data]) => ({
      id: word,
      label: word,
      frequency: data.frequency,
      responses: Array.from(data.responseIds),
      keywords: [word],
    }))
    .sort((a, b) => b.frequency - a.frequency)
    .slice(0, 20); // Top 20 themes

  return {
    themes,
  };
}

/**
 * Groups similar responses using simple keyword matching
 */
export function clusterResponses(
  responses: SurveyResponse[],
  questionId: string
): ThematicAnalysis {
  const textResponses = responses
    .map(response => ({
      responseId: response.id,
      text: response.responses.find(r => 
        r.questionId === questionId && typeof r.value === 'string'
      )?.value as string | undefined,
    }))
    .filter(item => item.text && item.text.trim().length > 0);

  // Simple clustering based on shared keywords
  const clusters: Array<{ id: string; responses: string[]; keywords: string[] }> = [];
  const processed = new Set<string>();

  textResponses.forEach(({ responseId, text }) => {
    if (!text || processed.has(responseId)) return;

    const tokens = new Set(tokenize(text));
    const cluster: string[] = [responseId];
    processed.add(responseId);

    // Find similar responses
    textResponses.forEach(({ responseId: otherId, text: otherText }) => {
      if (otherId === responseId || !otherText || processed.has(otherId)) return;

      const otherTokens = new Set(tokenize(otherText));
      const intersection = new Set([...tokens].filter(t => otherTokens.has(t)));
      const union = new Set([...tokens, ...otherTokens]);
      const similarity = intersection.size / union.size;

      if (similarity > 0.3) { // 30% similarity threshold
        cluster.push(otherId);
        processed.add(otherId);
        otherTokens.forEach(t => tokens.add(t));
      }
    });

    if (cluster.length > 1) {
      clusters.push({
        id: `cluster-${clusters.length}`,
        responses: cluster,
        keywords: Array.from(tokens).slice(0, 10),
      });
    }
  });

  return {
    themes: [],
    clusters,
  };
}
