const franc = require('franc-min');

export const NON_LATIN_REGEX =
  /[\u0600-\u06FF\u0750-\u077F\u4E00-\u9FFF\u3040-\u309F\u30A0-\u30FF\u0400-\u04FF\u0980-\u09FF\u0900-\u097F\u0B80-\u0BFF\u0C00-\u0C7F\u0D00-\u0D7F\uAC00-\uD7AF]/;

export type LanguageCheckReason = 'too_short' | 'non_latin' | 'needs_translation' | 'valid' | 'empty';

export interface LanguageCheckResult {
  isEnglish: boolean;
  reason: LanguageCheckReason;
  detectedLanguage?: string;
  needsTranslation?: boolean;
}

const MIN_WORD_COUNT = 5;

const COMMON_NON_ENGLISH_WORDS = [
  /\bpuedo\b/i, /\bmañana\b/i, /\bgracias\b/i, /\bpor\s+favor\b/i,
  /\bhola\b/i, /\bestoy\b/i, /\beres\b/i, /\bquién\b/i, /\bquè\b/i,
  /\bkhông\b/i, /\bkhong\b/i, /\btoi\b/i, /\blam\b/i,
  /\bnhu\b/i, /\bnay\b/i, /\bden\b/i, /\btre\b/i,
  /\bhom\s+nay\b/i, /\bchap\s+nhan\b/i,
  /\bkal\b/i, /\bhai\b/i, /\bmujhe\b/i, /\bchahiye\b/i, /\bthoda\b/i,
  /\bkar\s+do\b/i, /\bkarna\b/i, /\bho\s+jaunga\b/i, /\baaj\b/i,
];

let lastResult: LanguageCheckResult | null = null;
let lastInput: string | null = null;

const countWords = (text: string): number => {
  return text.trim().split(/\s+/).filter(word => word.length > 0).length;
};

export const checkLanguage = (text: string): LanguageCheckResult => {
  if (text === lastInput && lastResult) {
    return lastResult;
  }

  if (!text || text.length === 0) {
    return { isEnglish: false, reason: 'empty' };
  }

  const trimmed = text.trim();
  
  if (trimmed.length === 0) {
    return { isEnglish: false, reason: 'empty' };
  }

  if (!/[a-zA-Z]/.test(trimmed)) {
    return { isEnglish: false, reason: 'non_latin' };
  }

  if (NON_LATIN_REGEX.test(trimmed)) {
    return { isEnglish: false, reason: 'non_latin' };
  }

  const wordCount = countWords(trimmed);

  if (wordCount < MIN_WORD_COUNT) {
    return { isEnglish: false, reason: 'too_short' };
  }

  const detected = franc(trimmed, { minLength: 10 });
  const hasNonEnglishWords = COMMON_NON_ENGLISH_WORDS.some(p => p.test(trimmed));

  if (detected === 'eng' && hasNonEnglishWords) {
    lastInput = text;
    lastResult = { isEnglish: false, reason: 'needs_translation', needsTranslation: true, detectedLanguage: 'mixed' };
    return lastResult;
  }

  if (detected === 'eng') {
    lastInput = text;
    lastResult = { isEnglish: true, reason: 'valid', detectedLanguage: 'eng' };
    return lastResult;
  }

  return {
    isEnglish: false,
    reason: 'needs_translation',
    needsTranslation: true,
    detectedLanguage: detected === 'und' ? 'und' : detected,
  };
};

export const isEnglish = (text: string): boolean => checkLanguage(text).isEnglish;

export const detectLanguage = (text: string): string | null => {
  if (!text || text.length === 0) return null;
  const trimmed = text.trim();
  if (trimmed.length === 0) return null;
  const detected = franc(trimmed, { minLength: 10 });
  return detected === 'und' ? null : detected;
};
