import { Deck, CardStats } from '@/types';

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export function calculateMasteryPercentage(deck: Deck): number {
  if (deck.cards.length === 0) {
    return 0;
  }

  const stats = deck.stats.cardStats;
  let totalMastery = 0;

  for (const card of deck.cards) {
    const cardStat = stats[card.id];
    if (!cardStat || cardStat.totalReviews === 0) {
      totalMastery += 0;
    } else {
      const accuracy = cardStat.correctCount / cardStat.totalReviews;
      totalMastery += accuracy;
    }
  }

  return Math.round((totalMastery / deck.cards.length) * 100);
}

export function updateCardStats(
  deck: Deck,
  cardId: string,
  isCorrect: boolean
): void {
  const cardStat = deck.stats.cardStats[cardId] || {
    cardId,
    totalReviews: 0,
    correctCount: 0,
    incorrectCount: 0,
    difficulty: 0.5,
  };

  cardStat.totalReviews += 1;
  if (isCorrect) {
    cardStat.correctCount += 1;
    cardStat.difficulty = Math.max(0, cardStat.difficulty - 0.1);
  } else {
    cardStat.incorrectCount += 1;
    cardStat.difficulty = Math.min(1, cardStat.difficulty + 0.2);
  }
  cardStat.lastReviewed = Date.now();

  deck.stats.cardStats[cardId] = cardStat;
  deck.stats.masteryPercentage = calculateMasteryPercentage(deck);
  deck.stats.lastStudied = Date.now();
}

export function getCardsByDifficulty(deck: Deck): string[] {
  const cards = [...deck.cards];
  const stats = deck.stats.cardStats;

  return cards
    .map(card => ({
      id: card.id,
      difficulty: stats[card.id]?.difficulty ?? 0.5,
      lastReviewed: stats[card.id]?.lastReviewed ?? 0,
    }))
    .sort((a, b) => {
      // Prioritize: higher difficulty first, then least recently reviewed
      if (Math.abs(a.difficulty - b.difficulty) > 0.1) {
        return b.difficulty - a.difficulty;
      }
      return a.lastReviewed - b.lastReviewed;
    })
    .map(c => c.id);
}

export function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}



