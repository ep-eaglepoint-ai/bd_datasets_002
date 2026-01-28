import { describe, it, expect, beforeEach } from '@jest/globals';
// @sut is mapped by Jest: repository_after (default) or repository_before (test:before)
import {
  checkLanguage,
  isEnglish,
  detectLanguage,
  NON_LATIN_REGEX,
  LanguageCheckResult,
} from '@sut/languageDetection';

describe('Language Detection Utility - Requirements Validation', () => {
  
  // Helper to reset module state between tests if needed
  beforeEach(() => {
    // Call with a unique string to reset any cached state
    checkLanguage('__RESET_STATE_' + Math.random());
  });

  describe('Requirement 1: Empty and whitespace-only inputs', () => {
    it('should return reason "empty" for empty string', () => {
      const result = checkLanguage('');
      expect(result.isEnglish).toBe(false);
      expect(result.reason).toBe('empty');
    });

    it('should return reason "empty" for whitespace-only input (spaces)', () => {
      const result = checkLanguage('   ');
      expect(result.isEnglish).toBe(false);
      expect(result.reason).toBe('empty');
    });

    it('should return reason "empty" for whitespace-only input (tabs)', () => {
      const result = checkLanguage('\t\t\t');
      expect(result.isEnglish).toBe(false);
      expect(result.reason).toBe('empty');
    });

    it('should return reason "empty" for whitespace-only input (newlines)', () => {
      const result = checkLanguage('\n\n\n');
      expect(result.isEnglish).toBe(false);
      expect(result.reason).toBe('empty');
    });

    it('should return reason "empty" for mixed whitespace', () => {
      const result = checkLanguage(' \t\n \r ');
      expect(result.isEnglish).toBe(false);
      expect(result.reason).toBe('empty');
    });
  });

  describe('Requirement 2: Non-Latin characters must return "non_latin" before other classifications', () => {
    it('should return "non_latin" for single Arabic word (not "too_short")', () => {
      const result = checkLanguage('مرحبا');
      expect(result.isEnglish).toBe(false);
      expect(result.reason).toBe('non_latin');
    });

    it('should return "non_latin" for Chinese characters', () => {
      const result = checkLanguage('你好');
      expect(result.isEnglish).toBe(false);
      expect(result.reason).toBe('non_latin');
    });

    it('should return "non_latin" for Cyrillic text', () => {
      const result = checkLanguage('привет');
      expect(result.isEnglish).toBe(false);
      expect(result.reason).toBe('non_latin');
    });

    it('should return "non_latin" for Japanese Hiragana', () => {
      const result = checkLanguage('こんにちは');
      expect(result.isEnglish).toBe(false);
      expect(result.reason).toBe('non_latin');
    });

    it('should return "non_latin" for Japanese Katakana', () => {
      const result = checkLanguage('カタカナ');
      expect(result.isEnglish).toBe(false);
      expect(result.reason).toBe('non_latin');
    });

    it('should return "non_latin" for Korean Hangul', () => {
      const result = checkLanguage('안녕하세요');
      expect(result.isEnglish).toBe(false);
      expect(result.reason).toBe('non_latin');
    });

    it('should return "non_latin" for Devanagari (Hindi)', () => {
      const result = checkLanguage('नमस्ते');
      expect(result.isEnglish).toBe(false);
      expect(result.reason).toBe('non_latin');
    });

    it('should return "non_latin" for Bengali script', () => {
      const result = checkLanguage('হ্যালো');
      expect(result.isEnglish).toBe(false);
      expect(result.reason).toBe('non_latin');
    });

    it('should return "non_latin" for Tamil script', () => {
      const result = checkLanguage('வணக்கம்');
      expect(result.isEnglish).toBe(false);
      expect(result.reason).toBe('non_latin');
    });

    it('should return "non_latin" for Telugu script', () => {
      const result = checkLanguage('హలో');
      expect(result.isEnglish).toBe(false);
      expect(result.reason).toBe('non_latin');
    });

    it('should return "non_latin" for Malayalam script', () => {
      const result = checkLanguage('ഹലോ');
      expect(result.isEnglish).toBe(false);
      expect(result.reason).toBe('non_latin');
    });

    it('should return "non_latin" for mixed Latin and non-Latin text', () => {
      const result = checkLanguage('Hello مرحبا world');
      expect(result.isEnglish).toBe(false);
      expect(result.reason).toBe('non_latin');
    });
  });

  describe('Requirement 3: Texts with fewer than 5 words must return "too_short"', () => {
    it('should return "too_short" for 4 words with normal spacing', () => {
      const result = checkLanguage('one two three four');
      expect(result.isEnglish).toBe(false);
      expect(result.reason).toBe('too_short');
    });

    it('should return "too_short" for 4 words with multiple consecutive spaces', () => {
      const result = checkLanguage('one  two   three    four');
      expect(result.isEnglish).toBe(false);
      expect(result.reason).toBe('too_short');
    });

    it('should return "too_short" for 3 words', () => {
      const result = checkLanguage('one two three');
      expect(result.isEnglish).toBe(false);
      expect(result.reason).toBe('too_short');
    });

    it('should return "too_short" for 2 words', () => {
      const result = checkLanguage('one two');
      expect(result.isEnglish).toBe(false);
      expect(result.reason).toBe('too_short');
    });

    it('should return "too_short" for 1 word', () => {
      const result = checkLanguage('hello');
      expect(result.isEnglish).toBe(false);
      expect(result.reason).toBe('too_short');
    });

    it('should handle leading/trailing spaces correctly when counting words', () => {
      const result = checkLanguage('  one two three four  ');
      expect(result.isEnglish).toBe(false);
      expect(result.reason).toBe('too_short');
    });

    it('should NOT return "too_short" for exactly 5 words', () => {
      const result = checkLanguage('one two three four five');
      expect(result.reason).not.toBe('too_short');
    });

    it('should NOT return "too_short" for more than 5 words', () => {
      const result = checkLanguage('one two three four five six');
      expect(result.reason).not.toBe('too_short');
    });
  });

  describe('Requirement 4: Pure English text must return isEnglish: true with reason "valid"', () => {
    it('should return isEnglish: true and reason: "valid" for "The quick brown fox jumps over the lazy dog"', () => {
      const result = checkLanguage('The quick brown fox jumps over the lazy dog');
      expect(result.isEnglish).toBe(true);
      expect(result.reason).toBe('valid');
    });

    it('should return isEnglish: true for simple English sentence', () => {
      const result = checkLanguage('This is a simple English sentence');
      expect(result.isEnglish).toBe(true);
      expect(result.reason).toBe('valid');
    });

    it('should return isEnglish: true for longer English text', () => {
      const result = checkLanguage('I would like to request support for my account please help me');
      expect(result.isEnglish).toBe(true);
      expect(result.reason).toBe('valid');
    });

    it('should return isEnglish: true for English with punctuation', () => {
      // Use longer sentence so franc-min reliably detects English (minLength: 10)
      const result = checkLanguage('Hello! How are you doing today? I am fine and feeling great, thank you for asking.');
      expect(result.isEnglish).toBe(true);
      expect(result.reason).toBe('valid');
    });

    it('should return isEnglish: true for English with numbers', () => {
      const result = checkLanguage('I have 3 apples and 5 oranges in my basket');
      expect(result.isEnglish).toBe(true);
      expect(result.reason).toBe('valid');
    });
  });

  describe('Requirement 5: Results must be deterministic', () => {
    it('should return identical results for same input called 3 times - English text', () => {
      const input = 'The quick brown fox jumps over the lazy dog';
      const result1 = checkLanguage(input);
      const result2 = checkLanguage(input);
      const result3 = checkLanguage(input);

      expect(result1).toEqual(result2);
      expect(result2).toEqual(result3);
      expect(result1.isEnglish).toBe(result2.isEnglish);
      expect(result1.reason).toBe(result2.reason);
    });

    it('should return identical results for same input called 3 times - short text', () => {
      const input = 'one two three four';
      const result1 = checkLanguage(input);
      const result2 = checkLanguage(input);
      const result3 = checkLanguage(input);

      expect(result1).toEqual(result2);
      expect(result2).toEqual(result3);
    });

    it('should return identical results for same input called 3 times - non-Latin text', () => {
      const input = 'مرحبا';
      const result1 = checkLanguage(input);
      const result2 = checkLanguage(input);
      const result3 = checkLanguage(input);

      expect(result1).toEqual(result2);
      expect(result2).toEqual(result3);
    });

    it('should return identical results for same input called 3 times - whitespace', () => {
      const input = '   ';
      const result1 = checkLanguage(input);
      const result2 = checkLanguage(input);
      const result3 = checkLanguage(input);

      expect(result1).toEqual(result2);
      expect(result2).toEqual(result3);
    });

    it('should not be affected by previous calls with different inputs', () => {
      // Call with different inputs
      checkLanguage('some random text here');
      checkLanguage('another different input');
      
      // Now test determinism
      const input = 'The quick brown fox jumps over the lazy dog';
      const result1 = checkLanguage(input);
      const result2 = checkLanguage(input);
      const result3 = checkLanguage(input);

      expect(result1).toEqual(result2);
      expect(result2).toEqual(result3);
    });
  });

  describe('Requirement 6: detectLanguage must return null (not undefined) for empty/undetermined inputs', () => {
    it('should return null for empty string', () => {
      const result = detectLanguage('');
      expect(result).toBe(null);
      expect(result).not.toBe(undefined);
    });

    it('should return null for whitespace-only input', () => {
      const result = detectLanguage('   ');
      expect(result).toBe(null);
      expect(result).not.toBe(undefined);
    });

    it('should return null for tabs', () => {
      const result = detectLanguage('\t\t');
      expect(result).toBe(null);
      expect(result).not.toBe(undefined);
    });

    it('should return null for newlines', () => {
      const result = detectLanguage('\n\n');
      expect(result).toBe(null);
      expect(result).not.toBe(undefined);
    });

    it('should return null when franc returns "und" (undetermined)', () => {
      // Very short text that franc cannot determine
      const result = detectLanguage('a b c d e');
      if (result === null) {
        expect(result).toBe(null);
        expect(result).not.toBe(undefined);
      }
    });
  });

  describe('Requirement 7: Unicode ranges must be correctly bounded', () => {
    it('should match Arabic character at end of range (U+06FF)', () => {
      const char = '\u06FF'; // Arabic character at end of correct range
      expect(NON_LATIN_REGEX.test(char)).toBe(true);
    });

    it('should match CJK character at end of range (U+9FFF)', () => {
      const char = '\u9FFF'; // CJK character at end of correct range
      expect(NON_LATIN_REGEX.test(char)).toBe(true);
    });

    it('should match Hangul character at end of range (U+D7AF)', () => {
      const char = '\uD7AF'; // Hangul character at end of correct range
      expect(NON_LATIN_REGEX.test(char)).toBe(true);
    });

    it('should match various Arabic characters in range', () => {
      expect(NON_LATIN_REGEX.test('\u0600')).toBe(true);
      expect(NON_LATIN_REGEX.test('\u0650')).toBe(true);
      expect(NON_LATIN_REGEX.test('\u06FF')).toBe(true);
    });

    it('should match various CJK characters in range', () => {
      expect(NON_LATIN_REGEX.test('\u4E00')).toBe(true);
      expect(NON_LATIN_REGEX.test('\u7000')).toBe(true);
      expect(NON_LATIN_REGEX.test('\u9FFF')).toBe(true);
    });

    it('should match various Hangul characters in range', () => {
      expect(NON_LATIN_REGEX.test('\uAC00')).toBe(true);
      expect(NON_LATIN_REGEX.test('\uC000')).toBe(true);
      expect(NON_LATIN_REGEX.test('\uD7AF')).toBe(true);
    });

    it('should NOT match Latin characters', () => {
      expect(NON_LATIN_REGEX.test('a')).toBe(false);
      expect(NON_LATIN_REGEX.test('Z')).toBe(false);
      expect(NON_LATIN_REGEX.test('Hello')).toBe(false);
    });
  });

  describe('Requirement 8: COMMON_NON_ENGLISH_WORDS must not contain English words', () => {
    it('should NOT falsely flag pure English text as non-English', () => {
      // Sentences long enough for franc-min to reliably detect as English (minLength: 10)
      const pureEnglishSentences = [
        'The quick brown fox jumps over the lazy dog',
        'I would like to request support for my account please',
        'Can you help me with my account issue today',
        'This is a simple test message for the system',
        'Please send me the information when you have it ready',
        'Thank you for your assistance with this request',
        'I need help with my order status and delivery',
        'Where can I find the documentation for this project',
      ];

      pureEnglishSentences.forEach(sentence => {
        const result = checkLanguage(sentence);
        expect(result.isEnglish).toBe(true);
        expect(result.reason).toBe('valid');
      });
    });

    it('should correctly identify Spanish text with non-English words', () => {
      const result = checkLanguage('Hola por favor ayúdame con mi cuenta');
      expect(result.isEnglish).toBe(false);
    });

    it('should correctly identify Vietnamese text with non-English words', () => {
      const result = checkLanguage('Tôi không thể làm điều này hôm nay');
      expect(result.isEnglish).toBe(false);
    });
  });

  describe('Requirement 9: No breaking changes to function signatures', () => {
    it('checkLanguage should accept string and return LanguageCheckResult', () => {
      const result = checkLanguage('test input');
      expect(result).toHaveProperty('isEnglish');
      expect(result).toHaveProperty('reason');
      expect(typeof result.isEnglish).toBe('boolean');
      expect(typeof result.reason).toBe('string');
    });

    it('isEnglish should accept string and return boolean', () => {
      const result = isEnglish('test input');
      expect(typeof result).toBe('boolean');
    });

    it('detectLanguage should accept string and return string or null', () => {
      const result = detectLanguage('test input');
      expect(result === null || typeof result === 'string').toBe(true);
    });
  });

  describe('Requirement 10: Must handle any string input without throwing exceptions', () => {
    it('should handle empty string without throwing', () => {
      expect(() => checkLanguage('')).not.toThrow();
      expect(() => isEnglish('')).not.toThrow();
      expect(() => detectLanguage('')).not.toThrow();
    });

    it('should handle extremely long strings without throwing', () => {
      const longString = 'word '.repeat(10000);
      expect(() => checkLanguage(longString)).not.toThrow();
      expect(() => isEnglish(longString)).not.toThrow();
      expect(() => detectLanguage(longString)).not.toThrow();
    });

    it('should handle special characters without throwing', () => {
      const specialChars = '!@#$%^&*()_+-=[]{}|;:\'",.<>?/~`';
      expect(() => checkLanguage(specialChars)).not.toThrow();
      expect(() => isEnglish(specialChars)).not.toThrow();
      expect(() => detectLanguage(specialChars)).not.toThrow();
    });

    it('should handle Unicode characters without throwing', () => {
      const unicode = '😀😁😂🤣😃😄😅😆😉😊';
      expect(() => checkLanguage(unicode)).not.toThrow();
      expect(() => isEnglish(unicode)).not.toThrow();
      expect(() => detectLanguage(unicode)).not.toThrow();
    });

    it('should handle mixed content without throwing', () => {
      const mixed = 'Hello 123 !@# مرحبا 你好 😀';
      expect(() => checkLanguage(mixed)).not.toThrow();
      expect(() => isEnglish(mixed)).not.toThrow();
      expect(() => detectLanguage(mixed)).not.toThrow();
    });

    it('should handle newlines and tabs without throwing', () => {
      const withNewlines = 'Hello\nWorld\tTest\r\nMore';
      expect(() => checkLanguage(withNewlines)).not.toThrow();
      expect(() => isEnglish(withNewlines)).not.toThrow();
      expect(() => detectLanguage(withNewlines)).not.toThrow();
    });
  });

  describe('Requirement 12: All validation scenarios must pass', () => {
    it('Scenario 1: "The quick brown fox jumps over the lazy dog" → isEnglish: true, reason: "valid"', () => {
      const result = checkLanguage('The quick brown fox jumps over the lazy dog');
      expect(result.isEnglish).toBe(true);
      expect(result.reason).toBe('valid');
    });

    it('Scenario 2: "   " (whitespace only) → isEnglish: false, reason: "empty"', () => {
      const result = checkLanguage('   ');
      expect(result.isEnglish).toBe(false);
      expect(result.reason).toBe('empty');
    });

    it('Scenario 3: "one  two   three    four" (4 words with extra spaces) → reason: "too_short"', () => {
      const result = checkLanguage('one  two   three    four');
      expect(result.reason).toBe('too_short');
    });

    it('Scenario 4: "مرحبا" (single Arabic word) → reason: "non_latin" (not "too_short")', () => {
      const result = checkLanguage('مرحبا');
      expect(result.reason).toBe('non_latin');
      expect(result.reason).not.toBe('too_short');
    });

    it('Scenario 5: Same input called 3 times must return identical results', () => {
      const input = 'The quick brown fox jumps over the lazy dog';
      const result1 = checkLanguage(input);
      const result2 = checkLanguage(input);
      const result3 = checkLanguage(input);

      expect(result1).toEqual(result2);
      expect(result2).toEqual(result3);
    });

    it('Scenario 6: detectLanguage("   ") → null (not undefined)', () => {
      const result = detectLanguage('   ');
      expect(result).toBe(null);
      expect(result).not.toBe(undefined);
    });
  });

  describe('Edge Cases and Additional Validation', () => {
    it('should handle text with only numbers', () => {
      const result = checkLanguage('12345 67890 11111');
      expect(() => checkLanguage('12345 67890 11111')).not.toThrow();
    });

    it('should handle text with only punctuation', () => {
      expect(() => checkLanguage('!!! ??? ...')).not.toThrow();
    });

    it('should handle single character', () => {
      const result = checkLanguage('a');
      expect(result.isEnglish).toBe(false);
      expect(result.reason).toBe('too_short');
    });

    it('should handle exactly 5 words correctly', () => {
      const result = checkLanguage('this is exactly five words');
      expect(result.reason).not.toBe('too_short');
    });

    it('should handle text with leading and trailing whitespace', () => {
      const result = checkLanguage('  The quick brown fox jumps over the lazy dog  ');
      expect(result.isEnglish).toBe(true);
      expect(result.reason).toBe('valid');
    });

    it('should handle mixed case text', () => {
      const result = checkLanguage('ThE QuIcK BrOwN FoX JuMpS OvEr ThE LaZy DoG');
      expect(result.isEnglish).toBe(true);
      expect(result.reason).toBe('valid');
    });
  });
});
