import { SurveyResponse } from '@/lib/schemas/survey';
import { SentimentResult, ThematicAnalysis } from '@/lib/schemas/analytics';

// Extended word lists for better sentiment detection
const positiveWords = new Set([
  'good', 'great', 'excellent', 'amazing', 'wonderful', 'fantastic', 'love', 'liked', 'enjoyed',
  'happy', 'satisfied', 'pleased', 'perfect', 'best', 'awesome', 'brilliant', 'outstanding',
  'positive', 'helpful', 'useful', 'valuable', 'beneficial', 'effective', 'efficient',
  'impressive', 'recommend', 'appreciate', 'thank', 'grateful', 'delighted', 'pleased',
  'superb', 'terrific', 'marvelous', 'delightful', 'fabulous', 'incredible', 'phenomenal',
  'satisfying', 'rewarding', 'fulfilling', 'enjoyable', 'pleasurable', 'thrilled', 'excited',
]);

const negativeWords = new Set([
  'bad', 'terrible', 'awful', 'horrible', 'worst', 'hate', 'dislike', 'disappointed',
  'frustrated', 'angry', 'annoyed', 'upset', 'poor', 'useless', 'waste', 'broken',
  'failed', 'problem', 'issue', 'error', 'difficult', 'confusing', 'complicated',
  'slow', 'buggy', 'unreliable', 'inadequate', 'insufficient', 'lacking', 'missing',
  'awful', 'dreadful', 'horrendous', 'atrocious', 'miserable', 'pathetic', 'disgusting',
  'frustrating', 'annoying', 'irritating', 'bothersome', 'troublesome', 'problematic',
]);

// Common misspellings and variations
const wordVariations = new Map<string, string>([
  // Common misspellings
  ['recieve', 'receive'],
  ['seperate', 'separate'],
  ['occured', 'occurred'],
  ['definately', 'definitely'],
  ['accomodate', 'accommodate'],
  ['neccessary', 'necessary'],
  ['excellant', 'excellent'],
  ['terible', 'terrible'],
  ['awfull', 'awful'],
  ['horible', 'horrible'],
  // Slang variations
  ['gr8', 'great'],
  ['luv', 'love'],
  ['thx', 'thanks'],
  ['thnx', 'thanks'],
  ['ty', 'thanks'],
  ['ur', 'your'],
  ['u', 'you'],
  ['r', 'are'],
  ['2', 'to'],
  ['4', 'for'],
  ['b4', 'before'],
  ['cuz', 'because'],
  ['w/', 'with'],
  ['w/o', 'without'],
]);

// Sarcasm indicators
const sarcasmIndicators = new Set([
  'yeah right', 'sure', 'obviously', 'of course', 'totally', 'definitely',
  'absolutely', 'clearly', 'naturally', 'as if', 'whatever', 'right',
  'yeah', 'oh yeah', 'oh sure',
]);

// Negation words that flip sentiment
const negationWords = new Set([
  'not', 'no', 'never', 'none', 'nobody', 'nothing', 'nowhere', 'neither',
  'cannot', "can't", "won't", "don't", "doesn't", "didn't", "isn't", "aren't",
  "wasn't", "weren't", "hasn't", "haven't", "hadn't", "wouldn't", "couldn't",
  "shouldn't", "mustn't",
]);

/**
 * Normalizes text for analysis (handles misspellings, slang, etc.)
 */
function normalizeTextForAnalysis(text: string): string {
  let normalized = text.toLowerCase().trim();
  
  // Remove excessive punctuation but keep sentence structure
  normalized = normalized.replace(/[!]{2,}/g, '!');
  normalized = normalized.replace(/[?]{2,}/g, '?');
  
  // Replace common variations
  wordVariations.forEach((correct, variation) => {
    const regex = new RegExp(`\\b${variation}\\b`, 'gi');
    normalized = normalized.replace(regex, correct);
  });
  
  return normalized;
}

/**
 * Detects sarcasm in text
 */
function detectSarcasm(text: string): { isSarcastic: boolean; confidence: number } {
  const normalized = normalizeTextForAnalysis(text);
  const words = normalized.split(/\s+/);
  
  let sarcasmScore = 0;
  
  // Check for sarcasm indicators
  sarcasmIndicators.forEach(indicator => {
    if (normalized.includes(indicator)) {
      sarcasmScore += 0.3;
    }
  });
  
  // Check for contradiction (positive words with negative context or vice versa)
  const hasPositive = words.some(w => positiveWords.has(w));
  const hasNegative = words.some(w => negativeWords.has(w));
  const hasNegation = words.some(w => negationWords.has(w));
  
  // Strong indicator: positive words followed by negation (e.g., "wonderful. Not.")
  if (hasPositive && hasNegation) {
    sarcasmScore += 0.5; // Increased from 0.4
  }
  if (hasNegative && hasNegation && hasPositive) {
    sarcasmScore += 0.3;
  }
  
  // Pattern: "Oh yeah, ... wonderful. Not." - positive phrase followed by standalone negation
  if (hasPositive && normalized.match(/\b(not|no)\b\s*\.?\s*$/)) {
    sarcasmScore += 0.4;
  }
  
  // Excessive punctuation can indicate sarcasm
  if ((text.match(/!/g) || []).length > 2) {
    sarcasmScore += 0.2;
  }
  
  return {
    isSarcastic: sarcasmScore >= 0.5, // Changed from > to >=
    confidence: Math.min(1, sarcasmScore),
  };
}

/**
 * Handles negation in sentiment analysis
 */
function applyNegation(text: string, tokens: string[]): { positiveCount: number; negativeCount: number } {
  let positiveCount = 0;
  let negativeCount = 0;
  
  // Check for negation patterns in the original text first (more reliable)
  const normalizedText = normalizeTextForAnalysis(text);
  const hasNotPattern = /\bnot\b.*\b(good|great|excellent|wonderful|amazing|perfect|best|awesome|positive|helpful|useful|valuable|beneficial|effective|efficient|impressive|satisfied|pleased|happy|love|like|enjoy)/i.test(text);
  
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    const prevToken = i > 0 ? tokens[i - 1] : '';
    const prevPrevToken = i > 1 ? tokens[i - 2] : '';
    const nextToken = i < tokens.length - 1 ? tokens[i + 1] : '';
    
    // Check if previous word(s) are negation (check up to 3 words back for phrases like "not ... at all")
    let isNegated = false;
    
    // Direct negation check (previous word is negation)
    if (negationWords.has(prevToken)) {
      isNegated = true;
    }
    // Check for "not ... at all" pattern
    else if (prevToken === 'at' && prevPrevToken === 'not') {
      isNegated = true;
    }
    // Check for negation 2 words back (e.g., "is not good")
    else if (i > 1 && negationWords.has(prevPrevToken) && !positiveWords.has(prevToken) && !negativeWords.has(prevToken)) {
      isNegated = true;
    }
    // If we detected a "not ... positive word" pattern in the text, treat all positive words as negated
    else if (hasNotPattern && positiveWords.has(token)) {
      isNegated = true;
    }
    
    if (positiveWords.has(token)) {
      if (isNegated) {
        negativeCount += 2; // Strong negative when positive word is negated
        positiveCount = Math.max(0, positiveCount - 1); // Reduce positive count
      } else {
        positiveCount++;
      }
    } else if (negativeWords.has(token)) {
      if (isNegated) {
        positiveCount += 2; // Strong positive when negative word is negated
        negativeCount = Math.max(0, negativeCount - 1); // Reduce negative count
      } else {
        negativeCount++;
      }
    }
  }
  
  return { positiveCount, negativeCount };
}

/**
 * Enhanced tokenization with better handling of contractions and slang
 */
function enhancedTokenize(text: string): string[] {
  // Normalize text first
  let normalized = normalizeTextForAnalysis(text);
  
  // Handle contractions
  normalized = normalized.replace(/'/g, '');
  normalized = normalized.replace(/n't/g, ' not');
  normalized = normalized.replace(/'re/g, ' are');
  normalized = normalized.replace(/'ve/g, ' have');
  normalized = normalized.replace(/'ll/g, ' will');
  normalized = normalized.replace(/'d/g, ' would');
  
  // Split on whitespace and punctuation, but keep meaningful punctuation
  // Keep negation words even if they're short
  const tokens = normalized
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => {
      const trimmed = word.trim();
      if (trimmed.length === 0) return false;
      // Keep negation words, common short words, and words longer than 2 chars
      return trimmed.length > 2 || 
             negationWords.has(trimmed) || 
             trimmed === 'no' || 
             trimmed === 'ok' ||
             trimmed === 'at' || // Keep "at" for "at all" pattern
             trimmed === 'all'; // Keep "all" for "at all" pattern
    });
  
  return tokens;
}

/**
 * Enhanced sentiment analysis with better handling of edge cases
 */
export function computeEnhancedSentiment(text: string): SentimentResult & {
  isSarcastic: boolean;
  sarcasmConfidence: number;
  language: 'en' | 'mixed' | 'unknown';
} {
  if (!text || typeof text !== 'string' || text.trim().length === 0) {
    return {
      score: 0,
      magnitude: 0,
      label: 'neutral',
      keywords: [],
      isSarcastic: false,
      sarcasmConfidence: 0,
      language: 'unknown',
    };
  }

  const tokens = enhancedTokenize(text);
  const wordFreq = new Map<string, number>();
  
  // Detect sarcasm
  const sarcasm = detectSarcasm(text);
  
  // Apply negation handling - this should be the primary source of sentiment counts
  const { positiveCount, negativeCount } = applyNegation(text, tokens);
  
  const keywords: Array<{ word: string; frequency: number; sentiment: number }> = [];

  tokens.forEach(token => {
    const count = (wordFreq.get(token) || 0) + 1;
    wordFreq.set(token, count);

    let sentiment = 0;
    // Check if this token is negated by looking at context
    const tokenIndex = tokens.indexOf(token);
    const prevToken = tokenIndex > 0 ? tokens[tokenIndex - 1] : '';
    const isNegated = negationWords.has(prevToken) || (tokenIndex > 1 && negationWords.has(tokens[tokenIndex - 2]));
    
    if (positiveWords.has(token)) {
      sentiment = isNegated ? -1 : 1; // Flip sentiment if negated
    } else if (negativeWords.has(token)) {
      sentiment = isNegated ? 1 : -1; // Flip sentiment if negated
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

  // Special handling for negation patterns like "not good at all" - ensure negative result
  const normalized = normalizeTextForAnalysis(text);
  const hasNotPattern = /\bnot\b.*\b(good|great|excellent|wonderful|amazing|perfect|best|awesome|positive|helpful|useful|valuable|beneficial|effective|efficient|impressive|satisfied|pleased|happy|love|like|enjoy)/i.test(text);
  const hasNotAtAllPattern = /\bnot\b.*\bat\s+all\b/i.test(text);
  
  // If negation pattern detected, ensure negative result
  let finalPositiveCount = positiveCount;
  let finalNegativeCount = negativeCount;
  if (hasNotPattern) {
    // If we detected "not ... positive word", ensure negative result
    // Even if applyNegation already handled it, we want to be extra sure
    if (positiveCount > 0) {
      // Flip: treat positive words as negative when negated
      finalNegativeCount = positiveCount + negativeCount + 1; // Add extra weight
      finalPositiveCount = 0;
    } else if (finalNegativeCount === 0 && finalPositiveCount === 0) {
      // If somehow we have no counts but detected negation, add negative weight
      finalNegativeCount = 2; // Strong negative signal
    }
    // "not ... at all" is even stronger negative
    if (hasNotAtAllPattern) {
      finalNegativeCount += 2; // Extra strong negative
    }
  }
  
  const total = finalPositiveCount + finalNegativeCount;
  let score = total === 0 ? 0 : (finalPositiveCount - finalNegativeCount) / Math.max(total, 1);
  
  // If we detected negation pattern, ALWAYS ensure negative result
  if (hasNotPattern) {
    if (score >= 0) {
      score = -0.5; // Force negative score
    }
    // Ensure we have negative count for label calculation
    if (finalNegativeCount === 0) {
      finalNegativeCount = 1;
      score = -0.5;
    }
  }
  
  // Adjust for sarcasm
  if (sarcasm.isSarcastic) {
    score = -score * 0.7; // Flip and reduce magnitude
  }
  
  const magnitude = total / Math.max(tokens.length, 1);

  let label: 'positive' | 'negative' | 'neutral' = 'neutral';
  // Ensure negation patterns ALWAYS result in negative label
  if (hasNotPattern) {
    label = 'negative';
    // Ensure score is negative if it's not already
    if (score >= 0) {
      score = -0.5;
    }
  } else if (score > 0.1) {
    label = 'positive';
  } else if (score < -0.1) {
    label = 'negative';
  }

  // Simple language detection (check for non-ASCII characters)
  const hasNonAscii = /[^\x00-\x7F]/.test(text);
  const language: 'en' | 'mixed' | 'unknown' = hasNonAscii ? 'mixed' : 'en';

  return {
    score,
    magnitude,
    label,
    keywords: keywords.sort((a, b) => b.frequency - a.frequency).slice(0, 10),
    isSarcastic: sarcasm.isSarcastic,
    sarcasmConfidence: sarcasm.confidence,
    language,
  };
}

/**
 * Enhanced theme extraction with fuzzy matching for misspellings
 */
export function extractEnhancedThemes(
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

  const wordFreq = new Map<string, { frequency: number; responseIds: Set<string>; variations: Set<string> }>();

  textResponses.forEach(({ responseId, text }) => {
    if (!text) return;
    const tokens = enhancedTokenize(text);
    const uniqueTokens = new Set(tokens);

    uniqueTokens.forEach(token => {
      // Check for variations
      let canonicalToken = token;
      wordVariations.forEach((correct, variation) => {
        if (token === variation) {
          canonicalToken = correct;
        }
      });

      const existing = wordFreq.get(canonicalToken);
      if (existing) {
        existing.frequency++;
        existing.responseIds.add(responseId);
        if (token !== canonicalToken) {
          existing.variations.add(token);
        }
      } else {
        wordFreq.set(canonicalToken, {
          frequency: 1,
          responseIds: new Set([responseId]),
          variations: new Set(token !== canonicalToken ? [token] : []),
        });
      }
    });
  });

  // Filter by minimum frequency and create themes
  const themes = Array.from(wordFreq.entries())
    .filter(([_, data]) => data.frequency >= minFrequency)
    .map(([word, data]) => ({
      id: word,
      label: word + (data.variations.size > 0 ? ` (${Array.from(data.variations).join(', ')})` : ''),
      frequency: data.frequency,
      responses: Array.from(data.responseIds),
      keywords: [word, ...Array.from(data.variations)],
    }))
    .sort((a, b) => b.frequency - a.frequency)
    .slice(0, 20);

  return {
    themes,
  };
}

/**
 * Enhanced clustering with better similarity matching
 */
export function clusterEnhancedResponses(
  responses: SurveyResponse[],
  questionId: string,
  similarityThreshold: number = 0.3
): ThematicAnalysis {
  const textResponses = responses
    .map(response => ({
      responseId: response.id,
      text: response.responses.find(r => 
        r.questionId === questionId && typeof r.value === 'string'
      )?.value as string | undefined,
    }))
    .filter(item => item.text && item.text.trim().length > 0);

  const clusters: Array<{ id: string; responses: string[]; keywords: string[] }> = [];
  const processed = new Set<string>();

  textResponses.forEach(({ responseId, text }) => {
    if (!text || processed.has(responseId)) return;

    const tokens = new Set(enhancedTokenize(text));
    const cluster: string[] = [responseId];
    processed.add(responseId);
    const clusterKeywords = new Set(tokens);

    // Find similar responses with fuzzy matching
    textResponses.forEach(({ responseId: otherId, text: otherText }) => {
      if (otherId === responseId || !otherText || processed.has(otherId)) return;

      const otherTokens = new Set(enhancedTokenize(otherText));
      const intersection = new Set([...tokens].filter(t => otherTokens.has(t)));
      const union = new Set([...tokens, ...otherTokens]);
      const similarity = intersection.size / union.size;

      if (similarity > similarityThreshold) {
        cluster.push(otherId);
        processed.add(otherId);
        otherTokens.forEach(t => clusterKeywords.add(t));
      }
    });

    if (cluster.length > 1) {
      clusters.push({
        id: `cluster-${clusters.length}`,
        responses: cluster,
        keywords: Array.from(clusterKeywords).slice(0, 10),
      });
    }
  });

  return {
    themes: [],
    clusters,
  };
}
