import { analyzeText } from '../lib/comprehensiveAnalytics';
import { Document } from '../lib/types';

describe('Edge Case Tests - Requirement #24', () => {
  describe('Stylistic Experimentation', () => {
    it('should handle stream-of-consciousness writing', () => {
      const text = `thoughts flowing like water no punctuation no structure just pure consciousness 
        moving from one idea to another without pause without breath just continuous flow 
        of words and images and feelings all blending together in a seamless stream`;
      
      const result = analyzeText(text);
      
      expect(result).toBeDefined();
      expect(result.wordCount).toBeGreaterThan(0);
      expect(result.style.avgSentenceLength).toBeGreaterThan(30);
      expect(result.uncertaintyIndicators.warnings).toContain(
        expect.stringMatching(/sentence structure|punctuation/i)
      );
    });

    it('should handle experimental poetry with unusual line breaks', () => {
      const text = `
        words
          scattered
            across
              the
                page
        like
          falling
            leaves
      `;
      
      const result = analyzeText(text);
      
      expect(result).toBeDefined();
      expect(result.wordCount).toBe(8);
      expect(result.style.avgSentenceLength).toBeLessThan(5);
    });

    it('should handle intentional repetition for emphasis', () => {
      const text = `Never give up. Never surrender. Never stop believing. Never lose hope. 
        Never forget who you are. Never abandon your dreams. Never, never, never give up.`;
      
      const result = analyzeText(text);
      
      expect(result).toBeDefined();
      expect(result.repetition.deliberateRepetition).toBeGreaterThan(0.5);
      expect(result.repetition.accidentalRepetition).toBeLessThan(0.3);
    });

    it('should handle mixed language fragments', () => {
      const text = `The café was très chic, with a certain je ne sais quoi. 
        The ambiance was gemütlich, creating a sense of hygge that made everyone feel at home.`;
      
      const result = analyzeText(text);
      
      expect(result).toBeDefined();
      expect(result.wordCount).toBeGreaterThan(0);
      expect(result.lexical.uniqueWords).toBeGreaterThan(15);
    });

    it('should handle technical jargon and neologisms', () => {
      const text = `The synergistic paradigm shift leveraged blockchain-enabled AI to disrupt 
        the metaverse ecosystem through quantum-resistant cryptographic protocols and 
        decentralized autonomous organizations implementing zero-knowledge proofs.`;
      
      const result = analyzeText(text);
      
      expect(result).toBeDefined();
      expect(result.readability.fleschReadingEase).toBeLessThan(30);
      expect(result.lexical.uniqueWords).toBeGreaterThan(20);
    });
  });

  describe('Emotional Extremes', () => {
    it('should handle extremely positive sentiment', () => {
      const text = `Absolutely amazing! Fantastic! Wonderful! Incredible! Outstanding! 
        This is the best thing ever! I'm so happy! Delighted! Thrilled! Ecstatic! 
        Perfect in every way! Brilliant! Magnificent! Spectacular! Phenomenal!`;
      
      const result = analyzeText(text);
      
      expect(result).toBeDefined();
      expect(result.sentiment.score).toBeGreaterThan(0.7);
      expect(result.sentiment.label).toBe('positive');
      expect(result.sentiment.volatility).toBeGreaterThan(0);
    });

    it('should handle extremely negative sentiment', () => {
      const text = `Terrible. Awful. Horrible. Dreadful. Disgusting. Appalling. 
        This is the worst thing ever. Devastating. Heartbreaking. Miserable. 
        Painful. Agonizing. Unbearable. Catastrophic. Disastrous.`;
      
      const result = analyzeText(text);
      
      expect(result).toBeDefined();
      expect(result.sentiment.score).toBeLessThan(-0.7);
      expect(result.sentiment.label).toBe('negative');
    });

    it('should handle rapid emotional swings', () => {
      const text = `I love this! Wait, no, I hate it. Actually, it's amazing! 
        But then again, it's terrible. I'm so happy! No, I'm devastated. 
        This is wonderful! Or is it horrible? I can't decide!`;
      
      const result = analyzeText(text);
      
      expect(result).toBeDefined();
      expect(result.sentiment.volatility).toBeGreaterThan(0.5);
      expect(Math.abs(result.sentiment.score)).toBeLessThan(0.3);
    });

    it('should handle emotional numbness or detachment', () => {
      const text = `The event occurred. People were present. Actions were taken. 
        Results were observed. Time passed. Nothing changed. Everything continued. 
        The situation persisted. No feelings emerged. Existence continued.`;
      
      const result = analyzeText(text);
      
      expect(result).toBeDefined();
      expect(Math.abs(result.sentiment.score)).toBeLessThan(0.2);
      expect(result.sentiment.label).toBe('neutral');
    });
  });

  describe('Contradictory Tones', () => {
    it('should handle sarcasm and irony', () => {
      const text = `Oh great, another wonderful day of absolutely perfect weather. 
        I just love getting soaked in the rain. It's so delightful when everything goes wrong. 
        What a fantastic experience this has been.`;
      
      const result = analyzeText(text);
      
      expect(result).toBeDefined();
      expect(result.uncertaintyIndicators.sentimentConfidence).toBeLessThan(0.7);
    });

    it('should handle mixed professional and casual tone', () => {
      const text = `Dear Sir/Madam, I am writing to inform you that, like, the thing is totally broken, ya know? 
        We respectfully request your immediate attention to this matter, because it's super annoying and stuff. 
        Yours sincerely, but also, whatever.`;
      
      const result = analyzeText(text);
      
      expect(result).toBeDefined();
      expect(result.style.avgSentenceLength).toBeGreaterThan(10);
    });

    it('should handle academic writing with emotional outbursts', () => {
      const text = `According to Smith et al. (2020), the correlation coefficient indicates... 
        OH MY GOD THIS IS SO FRUSTRATING! ...a statistically significant relationship (p < 0.05). 
        The methodology employed was rigorous and I CAN'T BELIEVE THIS WORKED! ...following established protocols.`;
      
      const result = analyzeText(text);
      
      expect(result).toBeDefined();
      expect(result.sentiment.volatility).toBeGreaterThan(0.3);
    });
  });

  describe('Long-term Writing Evolution', () => {
    it('should track vocabulary growth over multiple documents', () => {
      const docs: Document[] = [
        {
          id: '1',
          title: 'Early Writing',
          content: 'The cat sat on the mat. The dog ran in the park.',
          createdAt: Date.now() - 90 * 24 * 60 * 60 * 1000,
          updatedAt: Date.now() - 90 * 24 * 60 * 60 * 1000,
          project: 'test',
          category: 'test',
          tags: [],
        },
        {
          id: '2',
          title: 'Middle Writing',
          content: 'The feline perched upon the cushion. The canine sprinted through the meadow.',
          createdAt: Date.now() - 45 * 24 * 60 * 60 * 1000,
          updatedAt: Date.now() - 45 * 24 * 60 * 60 * 1000,
          project: 'test',
          category: 'test',
          tags: [],
        },
        {
          id: '3',
          title: 'Recent Writing',
          content: 'The magnificent tabby lounged elegantly upon the velvet cushion. The exuberant retriever bounded joyfully across the verdant meadow.',
          createdAt: Date.now(),
          updatedAt: Date.now(),
          project: 'test',
          category: 'test',
          tags: [],
        },
      ];

      const results = docs.map(doc => analyzeText(doc.content));
      
      expect(results[0].lexical.uniqueWords).toBeLessThan(results[1].lexical.uniqueWords);
      expect(results[1].lexical.uniqueWords).toBeLessThan(results[2].lexical.uniqueWords);
      expect(results[2].lexical.ttr).toBeGreaterThan(results[0].lexical.ttr);
    });

    it('should detect style consistency over time', () => {
      const consistentText1 = 'The quick brown fox jumps over the lazy dog.';
      const consistentText2 = 'The swift red cat leaps across the sleepy hound.';
      
      const result1 = analyzeText(consistentText1);
      const result2 = analyzeText(consistentText2);
      
      const lengthDiff = Math.abs(result1.style.avgSentenceLength - result2.style.avgSentenceLength);
      expect(lengthDiff).toBeLessThan(3);
    });

    it('should track readability progression', () => {
      const simpleText = 'I like cats. Cats are nice. I have a cat.';
      const complexText = 'The multifaceted nature of feline companionship encompasses various psychological and sociological dimensions.';
      
      const simpleResult = analyzeText(simpleText);
      const complexResult = analyzeText(complexText);
      
      expect(simpleResult.readability.fleschReadingEase).toBeGreaterThan(
        complexResult.readability.fleschReadingEase
      );
    });
  });

  describe('Minimal and Empty Content', () => {
    it('should handle empty string', () => {
      const result = analyzeText('');
      
      expect(result).toBeDefined();
      expect(result.wordCount).toBe(0);
      expect(result.uncertaintyIndicators.warnings).toContain(
        expect.stringMatching(/insufficient|empty/i)
      );
    });

    it('should handle single word', () => {
      const result = analyzeText('Hello');
      
      expect(result).toBeDefined();
      expect(result.wordCount).toBe(1);
      expect(result.uncertaintyIndicators.warnings.length).toBeGreaterThan(0);
    });

    it('should handle only punctuation', () => {
      const result = analyzeText('!!! ??? ... --- +++');
      
      expect(result).toBeDefined();
      expect(result.wordCount).toBe(0);
    });

    it('should handle only whitespace', () => {
      const result = analyzeText('     \n\n\n     \t\t\t     ');
      
      expect(result).toBeDefined();
      expect(result.wordCount).toBe(0);
    });
  });

  describe('Extreme Length Content', () => {
    it('should handle very long text efficiently', () => {
      const longText = 'This is a sentence. '.repeat(10000);
      
      const startTime = Date.now();
      const result = analyzeText(longText);
      const endTime = Date.now();
      
      expect(result).toBeDefined();
      expect(result.wordCount).toBeGreaterThan(40000);
      expect(endTime - startTime).toBeLessThan(5000);
    });

    it('should handle very long single sentence', () => {
      const words = Array(1000).fill('word').join(' ');
      const longSentence = `This is a ${words} sentence.`;
      
      const result = analyzeText(longSentence);
      
      expect(result).toBeDefined();
      expect(result.style.avgSentenceLength).toBeGreaterThan(900);
      expect(result.uncertaintyIndicators.warnings).toContain(
        expect.stringMatching(/sentence length|complexity/i)
      );
    });
  });

  describe('Special Characters and Formatting', () => {
    it('should handle unicode and emojis', () => {
      const text = 'I love coding! 💻 It makes me so happy! 😊 The best thing ever! 🎉';
      
      const result = analyzeText(text);
      
      expect(result).toBeDefined();
      expect(result.wordCount).toBeGreaterThan(0);
      expect(result.sentiment.score).toBeGreaterThan(0);
    });

    it('should handle code snippets in text', () => {
      const text = `The function works like this: const add = (a, b) => a + b; 
        which is a simple arrow function that returns the sum.`;
      
      const result = analyzeText(text);
      
      expect(result).toBeDefined();
      expect(result.wordCount).toBeGreaterThan(0);
    });

    it('should handle URLs and email addresses', () => {
      const text = 'Visit https://example.com or email test@example.com for more information.';
      
      const result = analyzeText(text);
      
      expect(result).toBeDefined();
      expect(result.wordCount).toBeGreaterThan(0);
    });

    it('should handle markdown formatting', () => {
      const text = '# Heading\n\n**Bold text** and *italic text* with `code` inline.';
      
      const result = analyzeText(text);
      
      expect(result).toBeDefined();
      expect(result.wordCount).toBeGreaterThan(0);
    });
  });

  describe('Topic Drift and Clustering', () => {
    it('should detect topic drift across documents', () => {
      const techText = 'JavaScript programming with React and Node.js for web development.';
      const cookingText = 'Baking cookies with flour, sugar, and butter in the oven.';
      
      const techResult = analyzeText(techText);
      const cookingResult = analyzeText(cookingText);
      
      expect(techResult.topics.mainTopics).toBeDefined();
      expect(cookingResult.topics.mainTopics).toBeDefined();
      expect(techResult.topics.mainTopics[0]).not.toBe(cookingResult.topics.mainTopics[0]);
    });

    it('should handle documents with no clear topic', () => {
      const text = 'Random words without any coherent theme or structure here.';
      
      const result = analyzeText(text);
      
      expect(result).toBeDefined();
      expect(result.uncertaintyIndicators.topicConfidence).toBeLessThan(0.6);
    });
  });

  describe('Grammar and Style Edge Cases', () => {
    it('should handle all passive voice', () => {
      const text = 'The ball was thrown. The game was played. The winner was announced.';
      
      const result = analyzeText(text);
      
      expect(result).toBeDefined();
      expect(result.style.passiveVoicePercentage).toBeGreaterThan(80);
    });

    it('should handle all questions', () => {
      const text = 'What is this? Why does it work? How can we fix it? When will it end?';
      
      const result = analyzeText(text);
      
      expect(result).toBeDefined();
      expect(result.wordCount).toBeGreaterThan(0);
    });

    it('should handle sentence fragments', () => {
      const text = 'Running. Jumping. Flying. Falling. Standing. Walking.';
      
      const result = analyzeText(text);
      
      expect(result).toBeDefined();
      expect(result.style.avgSentenceLength).toBeLessThan(2);
    });
  });
});
