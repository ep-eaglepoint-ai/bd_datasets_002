// Web Worker for offloading analytics computation
self.onmessage = function(e) {
  const { type, payload } = e.data;
  
  if (type === 'ANALYZE_TEXT') {
    const { documentId, content } = payload;
    
    try {
      // Perform analytics computation in worker thread
      const result = analyzeTextInWorker(content);
      
      self.postMessage({
        type: 'ANALYSIS_COMPLETE',
        payload: {
          documentId,
          result
        }
      });
    } catch (error) {
      self.postMessage({
        type: 'ANALYSIS_ERROR',
        payload: {
          documentId,
          error: error.message
        }
      });
    }
  }
};

function analyzeTextInWorker(text) {
  // Basic tokenization
  const words = text.split(/\s+/).filter(w => w.length > 0);
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim().length > 0);
  
  // Basic metrics
  const wordCount = words.length;
  const characterCount = text.length;
  const sentenceCount = sentences.length;
  const paragraphCount = paragraphs.length;
  
  // Sentiment analysis (simplified)
  const positiveWords = ['good', 'great', 'excellent', 'amazing', 'wonderful', 'fantastic', 'love', 'happy', 'joy', 'beautiful'];
  const negativeWords = ['bad', 'terrible', 'awful', 'horrible', 'hate', 'sad', 'angry', 'ugly', 'poor', 'worst'];
  
  const textLower = text.toLowerCase();
  let positiveCount = 0;
  let negativeCount = 0;
  
  positiveWords.forEach(word => {
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    const matches = textLower.match(regex);
    if (matches) positiveCount += matches.length;
  });
  
  negativeWords.forEach(word => {
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    const matches = textLower.match(regex);
    if (matches) negativeCount += matches.length;
  });
  
  const totalSentimentWords = positiveCount + negativeCount;
  const sentimentScore = totalSentimentWords > 0 
    ? (positiveCount - negativeCount) / totalSentimentWords 
    : 0;
  
  const polarity = sentimentScore > 0.1 ? 'positive' : sentimentScore < -0.1 ? 'negative' : 'neutral';
  
  // Readability (simplified Flesch Reading Ease)
  const totalSyllables = words.reduce((sum, word) => sum + countSyllables(word), 0);
  const avgSyllablesPerWord = totalSyllables / Math.max(words.length, 1);
  const avgWordsPerSentence = words.length / Math.max(sentences.length, 1);
  const fleschReadingEase = Math.max(0, Math.min(100, 206.835 - 1.015 * avgWordsPerSentence - 84.6 * avgSyllablesPerWord));
  
  // Lexical richness
  const uniqueWords = new Set(words.map(w => w.toLowerCase())).size;
  const typeTokenRatio = uniqueWords / Math.max(words.length, 1);
  
  return {
    wordCount,
    characterCount,
    sentenceCount,
    paragraphCount,
    sentiment: {
      score: sentimentScore,
      polarity,
      intensity: Math.abs(sentimentScore)
    },
    readability: {
      fleschReadingEase,
      fleschKincaidGrade: 0.39 * avgWordsPerSentence + 11.8 * avgSyllablesPerWord - 15.59,
      gunningFog: 0,
      smogIndex: 0
    },
    lexicalRichness: {
      typeTokenRatio,
      hapaxLegomena: 0,
      vocabularyDiversity: uniqueWords / Math.sqrt(Math.max(words.length, 1))
    },
    styleMetrics: {
      avgSentenceLength: avgWordsPerSentence,
      avgWordLength: words.reduce((sum, w) => sum + w.length, 0) / Math.max(words.length, 1),
      passiveVoiceCount: 0,
      punctuationDensity: (text.match(/[.,;:!?]/g) || []).length / Math.max(words.length, 1)
    }
  };
}

function countSyllables(word) {
  word = word.toLowerCase().replace(/[^a-z]/g, '');
  if (word.length <= 3) return 1;
  
  const vowels = 'aeiouy';
  let count = 0;
  let previousWasVowel = false;
  
  for (let i = 0; i < word.length; i++) {
    const isVowel = vowels.includes(word[i]);
    if (isVowel && !previousWasVowel) {
      count++;
    }
    previousWasVowel = isVowel;
  }
  
  if (word.endsWith('e')) {
    count--;
  }
  
  return Math.max(1, count);
}
