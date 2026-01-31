export interface FlashCard {
  id: string;
  front: string;
  back: string;
  createdAt: number;
  updatedAt: number;
}

export interface StudySession {
  id: string;
  deckId: string;
  startedAt: number;
  endedAt?: number;
  cardsReviewed: number;
  cardsCorrect: number;
  cardsIncorrect: number;
  cardResults: Record<string, 'correct' | 'incorrect' | 'skipped'>;
}

export interface CardStats {
  cardId: string;
  totalReviews: number;
  correctCount: number;
  incorrectCount: number;
  lastReviewed?: number;
  difficulty: number; // 0-1, higher = more difficult
}

export interface Deck {
  id: string;
  name: string;
  description?: string;
  cards: FlashCard[];
  createdAt: number;
  updatedAt: number;
  stats: {
    totalCards: number;
    masteryPercentage: number;
    totalSessions: number;
    lastStudied?: number;
    cardStats: Record<string, CardStats>;
  };
}

export interface AppData {
  decks: Deck[];
  sessions: StudySession[];
  version: number;
}



