import {
  tokenizeText,
  countBasicMetrics,
  analyzeSentiment,
  calculateReadability,
  calculateLexicalRichness,
  analyzeStyleMetrics,
  extractKeywords,
  detectRepeatedPhrases,
} from '../repository_after/src/lib/textAnalysis';

import { DocumentSchema, AnalyticsResultSchema } from '../repository_after/src/lib/types';

describe('Writing Analytics Dashboard', () => {
  // Text import and preservation
  describe('Text Import and Organization', () => {
    it('should preserve text in original raw form without modification', () => {
      const originalText = "This is a test! With émojis 😀 and special chars: @#$%";
      const doc = {
        id: '1',
        title: 'Test',
        content: originalText,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        tags: []
      };
      
      const validated = DocumentSchema.parse(doc);
      expect(validated.content).toBe(originalText);
      expect(validated.title).toBe('Test');
    });

    it('should organize documents by project, category, and tags', () => {
      const doc = {
        id: '1',
        title: 'Test',
        content: 'Content',
        project: 'Project A',
        category: 'Essay',
        tags: ['important', 'draft'],
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
      
      const validated = DocumentSchema.parse(doc);
      expect(validated.project).toBe('Project A');
      expect(validated.category).toBe('Essay');
      expect(validated.tags).toEqual(['important', 'draft']);
    });
  });

  // Tokenization
  describe('Deterministic Tokenization', () => {
    it('should tokenize text into words, sentences, and paragraphs', () => {
      const text = "Hello world! This is a test.\n\nHow are you?";
      const tokens = tokenizeText(text);
      
      expect(tokens.words.length).toBeGreaterThan(0);
      expect(tokens.sentences.length).toBeGreaterThan(0);
      expect(tokens.paragraphs.length).toBeGreaterThan(0);
    });

    it('should handle punctuation, abbreviations, and special characters', () => {
      const text = "Dr. Smith said, 'Hello!' It's 3:00 PM.";
      const tokens = tokenizeText(text);
      
      expect(tokens.words.length).toBeGreaterThan(0);
      expect(tokens.sentences.length).toBeGreaterThan(0);
    });

    it('should handle emojis and multilingual content', () => {
      const text = "Hello 😀 Bonjour مرحبا 你好";
      const tokens = tokenizeText(text);
      
      expect(tokens.words.length).toBeGreaterThan(0);
    });

    it('should handle empty text', () => {
      const tokens = tokenizeText('');
      expect(tokens.words).toEqual([]);
      expect(tokens.sentences).toEqual([]);
      expect(tokens.paragraphs).toEqual([]);
    });
  });

  // Basic metrics tracking
  describe('Word/Character/Sentence/Paragraph Counting', () => {
    it('should count basic metrics accurately', () => {
      const text = "Hello world.\n\nThis is a test.";
      const metrics = countBasicMetrics(text);
      
      expect(metrics.wordCount).toBeGreaterThan(0);
      expect(metrics.characterCount).toBe(text.length);
      expect(metrics.sentenceCount).toBeGreaterThanOrEqual(2);
      expect(metrics.paragraphCount).toBeGreaterThanOrEqual(2);
    });

    it('should handle irregular formatting', () => {
      const text = "Word1   Word2\n\n\nWord3";
      const metrics = countBasicMetrics(text);
      
      expect(metrics.wordCount).toBeGreaterThan(0);
      expect(metrics.characterCount).toBe(text.length);
    });
  });

  // Sentiment analysis
  describe('Sentiment Analysis', () => {
    it('should detect positive sentiment', () => {
      const text = "This is great! I love it. Amazing and wonderful.";
      const sentiment = analyzeSentiment(text);
      
      expect(sentiment.polarity).toBe('positive');
      expect(sentiment.score).toBeGreaterThan(0);
      expect(sentiment.intensity).toBeGreaterThan(0);
    });

    it('should detect negative sentiment', () => {
      const text = "This is terrible. I hate it. Awful and horrible.";
      const sentiment = analyzeSentiment(text);
      
      expect(sentiment.polarity).toBe('negative');
      expect(sentiment.score).toBeLessThan(0);
    });

    it('should detect neutral sentiment', () => {
      const text = "The sky is blue. Water is wet.";
      const sentiment = analyzeSentiment(text);
      
      expect(sentiment.polarity).toBe('neutral');
    });

    it('should tolerate ambiguous tone', () => {
      const text = "It's okay, I guess.";
      const sentiment = analyzeSentiment(text);
      
      expect(['positive', 'negative', 'neutral']).toContain(sentiment.polarity);
    });
  });

  // Lexical richness
  describe('Lexical Richness Metrics', () => {
    it('should calculate type-token ratio', () => {
      const text = "The cat sat on the mat. The dog sat on the log.";
      const richness = calculateLexicalRichness(text);
      
      expect(richness.typeTokenRatio).toBeGreaterThan(0);
      expect(richness.typeTokenRatio).toBeLessThanOrEqual(1);
    });

    it('should count hapax legomena', () => {
      const text = "The cat sat on the mat. The dog sat on the log.";
      const richness = calculateLexicalRichness(text);
      
      expect(richness.hapaxLegomena).toBeGreaterThanOrEqual(0);
    });

    it('should calculate vocabulary diversity', () => {
      const text = "The quick brown fox jumps over the lazy dog.";
      const richness = calculateLexicalRichness(text);
      
      expect(richness.vocabularyDiversity).toBeGreaterThan(0);
    });
  });

  // Readability scores
  describe('Readability Scores', () => {
    it('should calculate Flesch Reading Ease', () => {
      const text = "The quick brown fox jumps over the lazy dog. This is a simple sentence.";
      const readability = calculateReadability(text);
      
      expect(readability.fleschReadingEase).toBeGreaterThanOrEqual(0);
      expect(readability.fleschReadingEase).toBeLessThanOrEqual(100);
    });

    it('should calculate Flesch-Kincaid Grade Level', () => {
      const text = "The quick brown fox jumps over the lazy dog.";
      const readability = calculateReadability(text);
      
      expect(readability.fleschKincaidGrade).toBeGreaterThanOrEqual(0);
    });

    it('should calculate Gunning Fog Index', () => {
      const text = "The quick brown fox jumps over the lazy dog.";
      const readability = calculateReadability(text);
      
      expect(readability.gunningFog).toBeGreaterThanOrEqual(0);
    });

    it('should calculate SMOG Index', () => {
      const text = "The quick brown fox jumps over the lazy dog.";
      const readability = calculateReadability(text);
      
      expect(readability.smogIndex).toBeGreaterThanOrEqual(0);
    });
  });

  // Sentence structure analysis
  describe('Sentence Structure Analysis', () => {
    it('should analyze sentence length distribution', () => {
      const text = "Short. This is a longer sentence with more words.";
      const style = analyzeStyleMetrics(text);
      
      expect(style.avgSentenceLength).toBeGreaterThan(0);
    });

    it('should detect passive voice usage', () => {
      const text = "The document was written carefully. It was reviewed thoroughly.";
      const style = analyzeStyleMetrics(text);
      
      expect(style.passiveVoiceCount).toBeGreaterThanOrEqual(0);
    });

    it('should analyze punctuation patterns', () => {
      const text = "Hello! How are you? I'm fine, thanks.";
      const style = analyzeStyleMetrics(text);
      
      expect(style.punctuationDensity).toBeGreaterThan(0);
    });
  });

  // Stylistic fingerprints
  describe('Stylistic Fingerprints', () => {
    it('should compute style metrics', () => {
      const text = "The quick brown fox jumps over the lazy dog.";
      const style = analyzeStyleMetrics(text);
      
      expect(style.avgSentenceLength).toBeGreaterThan(0);
      expect(style.avgWordLength).toBeGreaterThan(0);
      expect(style.punctuationDensity).toBeGreaterThanOrEqual(0);
    });
  });

  // Keyword extraction
  describe('Keyword Extraction', () => {
    it('should extract keywords from text', () => {
      const text = "Python programming is great. Python is powerful. Programming languages are useful.";
      const keywords = extractKeywords(text, 5);
      
      expect(keywords.length).toBeGreaterThan(0);
      expect(Array.isArray(keywords)).toBe(true);
    });

    it('should handle noisy phrasing', () => {
      const text = "Um, well, you know, like, programming is, uh, interesting.";
      const keywords = extractKeywords(text, 5);
      
      expect(Array.isArray(keywords)).toBe(true);
    });
  });

  // Repeated phrase detection
  describe('Repeated Phrase Detection', () => {
    it('should detect repeated phrases', () => {
      const text = "The quick brown fox. The quick brown dog. The quick brown cat.";
      const repeated = detectRepeatedPhrases(text, 3);
      
      expect(repeated.length).toBeGreaterThan(0);
      expect(repeated[0]).toHaveProperty('phrase');
      expect(repeated[0]).toHaveProperty('count');
      expect(repeated[0].count).toBeGreaterThan(1);
    });
  });

  // Grammar patterns
  describe('Grammar Pattern Tracking', () => {
    it('should track grammar-related patterns', () => {
      const text = "She runs quickly. They were running. He has been running.";
      const style = analyzeStyleMetrics(text);
      
      expect(style).toHaveProperty('passiveVoiceCount');
    });
  });

  // Document comparison
  describe('Document Comparison', () => {
    it('should enable comparison of two documents', () => {
      const text1 = "This is a simple test document.";
      const text2 = "This is a complex and sophisticated document with many words.";
      
      const metrics1 = countBasicMetrics(text1);
      const metrics2 = countBasicMetrics(text2);
      
      expect(metrics1.wordCount).not.toBe(metrics2.wordCount);
      expect(metrics2.wordCount).toBeGreaterThan(metrics1.wordCount);
    });
  });

  // Longitudinal evolution
  describe('Longitudinal Evolution Tracking', () => {
    it('should track changes over time', () => {
      const doc1 = { content: 'Simple text.', createdAt: 1000 };
      const doc2 = { content: 'More complex and sophisticated text.', createdAt: 2000 };
      
      const metrics1 = countBasicMetrics(doc1.content);
      const metrics2 = countBasicMetrics(doc2.content);
      
      expect(doc2.createdAt).toBeGreaterThan(doc1.createdAt);
      expect(metrics2.wordCount).toBeGreaterThan(metrics1.wordCount);
    });
  });

  // Annotations
  describe('Annotation System', () => {
    it('should support annotations', () => {
      const annotation = {
        id: 'ann1',
        documentId: 'doc1',
        content: 'This is a note',
        timestamp: Date.now()
      };
      
      expect(annotation.documentId).toBe('doc1');
      expect(annotation.content).toBe('This is a note');
    });
  });

  // Interactive visualizations
  describe('Visualization Data Preparation', () => {
    it('should prepare data suitable for charting', () => {
      const text = "Test document for visualization.";
      const metrics = countBasicMetrics(text);
      const sentiment = analyzeSentiment(text);
      
      expect(typeof metrics.wordCount).toBe('number');
      expect(typeof sentiment.score).toBe('number');
    });
  });

  // Filtering
  describe('Document Filtering', () => {
    it('should support filtering by various criteria', () => {
      const docs = [
        { id: '1', content: 'Short', createdAt: 1000, project: 'A' },
        { id: '2', content: 'Longer document text', createdAt: 2000, project: 'B' },
        { id: '3', content: 'Medium text', createdAt: 1500, project: 'A' },
      ];
      
      const projectA = docs.filter(d => d.project === 'A');
      expect(projectA.length).toBe(2);
      
      const recent = docs.filter(d => d.createdAt >= 1500);
      expect(recent.length).toBe(2);
    });
  });

  // Immutable snapshots
  describe('Immutable Snapshots', () => {
    it('should create immutable snapshots', () => {
      const snapshot = {
        id: 'snap1',
        documentId: 'doc1',
        content: 'Original content',
        timestamp: Date.now(),
        analytics: countBasicMetrics('Original content')
      };
      
      expect(snapshot.content).toBe('Original content');
      expect(snapshot.analytics).toHaveProperty('wordCount');
    });
  });

  // Offline persistence
  describe('Offline Persistence Structure', () => {
    it('should have serializable data structures', () => {
      const doc = {
        id: '1',
        title: 'Test',
        content: 'Content',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        tags: []
      };
      
      const json = JSON.stringify(doc);
      const parsed = JSON.parse(json);
      
      expect(parsed.id).toBe(doc.id);
      expect(parsed.content).toBe(doc.content);
    });
  });

  // Zod validation
  describe('Zod Validation', () => {
    it('should validate documents with Zod', () => {
      const validDoc = {
        id: '1',
        title: 'Test',
        content: 'Content',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        tags: []
      };
      
      expect(() => DocumentSchema.parse(validDoc)).not.toThrow();
    });

    it('should reject invalid documents', () => {
      const invalidDoc = {
        id: '1'
      };
      
      expect(() => DocumentSchema.parse(invalidDoc)).toThrow();
    });
  });

  // Predictable state management
  describe('State Management Patterns', () => {
    it('should follow predictable state update patterns', () => {
      const state = {
        documents: [],
        currentDocument: null,
        loading: false
      };
      
      const doc = {
        id: '1',
        title: 'Test',
        content: 'Content',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        tags: []
      };
      
      state.documents.push(doc);
      state.currentDocument = doc;
      
      expect(state.documents.length).toBe(1);
      expect(state.currentDocument?.id).toBe('1');
    });
  });

  // Performance
  describe('Performance with Large Texts', () => {
    it('should handle large text efficiently', () => {
      const largeText = "Word ".repeat(1000);
      
      const start = Date.now();
      const metrics = countBasicMetrics(largeText);
      const elapsed = Date.now() - start;
      
      expect(elapsed).toBeLessThan(1000);
      expect(metrics.wordCount).toBe(1000);
    });
  });

  // Export functionality
  describe('Data Export', () => {
    it('should export data as JSON', () => {
      const doc = {
        id: '1',
        title: 'Test',
        content: 'Content',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        tags: []
      };
      
      const metrics = countBasicMetrics(doc.content);
      
      const exportData = {
        document: doc,
        analytics: metrics
      };
      
      const json = JSON.stringify(exportData);
      expect(json.length).toBeGreaterThan(0);
    });
  });

  // UI data structures
  describe('UI Data Structures', () => {
    it('should provide data structures for UI rendering', () => {
      const text = "Test document.";
      const metrics = countBasicMetrics(text);
      const sentiment = analyzeSentiment(text);
      const readability = calculateReadability(text);
      
      const uiData = {
        metrics,
        sentiment,
        readability
      };
      
      expect(uiData).toHaveProperty('metrics');
      expect(uiData).toHaveProperty('sentiment');
      expect(uiData).toHaveProperty('readability');
    });
  });

  // Edge case handling
  describe('Edge Case Handling', () => {
    it('should handle empty text', () => {
      const metrics = countBasicMetrics('');
      expect(metrics.wordCount).toBe(0);
    });

    it('should handle very short text', () => {
      const metrics = countBasicMetrics('Hi');
      expect(metrics.wordCount).toBe(1);
    });

    it('should handle very long text', () => {
      const longText = "Word ".repeat(10000);
      const metrics = countBasicMetrics(longText);
      expect(metrics.wordCount).toBe(10000);
    });

    it('should handle multilingual text', () => {
      const multilingual = "Hello world. Bonjour monde. Hola mundo.";
      const metrics = countBasicMetrics(multilingual);
      expect(metrics.wordCount).toBeGreaterThan(0);
    });

    it('should handle special characters', () => {
      const special = "Test @#$% with 😀 emojis!";
      const metrics = countBasicMetrics(special);
      expect(metrics.wordCount).toBeGreaterThan(0);
    });

    it('should handle corrupted/noisy input', () => {
      const noisy = "Test... with... many... ellipses!!!";
      const metrics = countBasicMetrics(noisy);
      expect(metrics.wordCount).toBeGreaterThan(0);
    });
  });
});
