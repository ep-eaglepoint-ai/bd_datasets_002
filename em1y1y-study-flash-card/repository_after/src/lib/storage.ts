import { AppData, Deck, StudySession } from '@/types';

const STORAGE_KEY = 'flashcard-app-data';
const DEFAULT_DATA: AppData = {
  decks: [],
  sessions: [],
  version: 1,
};

export function loadData(): AppData {
  if (typeof window === 'undefined') {
    return DEFAULT_DATA;
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return DEFAULT_DATA;
    }
    return JSON.parse(stored) as AppData;
  } catch (error) {
    console.error('Failed to load data:', error);
    return DEFAULT_DATA;
  }
}

export function saveData(data: AppData): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.error('Failed to save data:', error);
  }
}

export function getDeck(deckId: string): Deck | null {
  const data = loadData();
  return data.decks.find(d => d.id === deckId) || null;
}

export function getAllDecks(): Deck[] {
  return loadData().decks;
}

export function saveDeck(deck: Deck): void {
  const data = loadData();
  const index = data.decks.findIndex(d => d.id === deck.id);
  if (index >= 0) {
    data.decks[index] = deck;
  } else {
    data.decks.push(deck);
  }
  data.decks.sort((a, b) => b.updatedAt - a.updatedAt);
  saveData(data);
}

export function deleteDeck(deckId: string): void {
  const data = loadData();
  data.decks = data.decks.filter(d => d.id !== deckId);
  data.sessions = data.sessions.filter(s => s.deckId !== deckId);
  saveData(data);
}

export function saveSession(session: StudySession): void {
  const data = loadData();
  const index = data.sessions.findIndex(s => s.id === session.id);
  if (index >= 0) {
    data.sessions[index] = session;
  } else {
    data.sessions.push(session);
  }
  saveData(data);
}

export function getDeckSessions(deckId: string): StudySession[] {
  const data = loadData();
  return data.sessions
    .filter(s => s.deckId === deckId)
    .sort((a, b) => b.startedAt - a.startedAt);
}

export function exportDeck(deck: Deck): string {
  return JSON.stringify(deck, null, 2);
}

export function exportDeckCSV(deck: Deck): string {
  const rows = ['Front,Back'];
  for (const card of deck.cards) {
    const front = `"${card.front.replace(/"/g, '""')}"`;
    const back = `"${card.back.replace(/"/g, '""')}"`;
    rows.push(`${front},${back}`);
  }
  return rows.join('\n');
}

export function importDeck(json: string): Deck | null {
  try {
    const deck = JSON.parse(json) as Deck;
    // Validate deck structure
    if (!deck.id || !deck.name || !Array.isArray(deck.cards)) {
      return null;
    }
    // Update timestamps
    deck.updatedAt = Date.now();
    for (const card of deck.cards) {
      if (!card.id) {
        card.id = `card-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      }
      card.updatedAt = Date.now();
    }
    return deck;
  } catch (error) {
    console.error('Failed to import deck:', error);
    return null;
  }
}



