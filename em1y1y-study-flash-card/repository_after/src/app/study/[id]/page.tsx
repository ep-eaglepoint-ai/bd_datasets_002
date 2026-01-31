'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { getDeck, saveDeck, saveSession } from '@/lib/storage';
import { Deck, StudySession } from '@/types';
import { generateId, getCardsByDifficulty, shuffleArray, updateCardStats } from '@/lib/utils';

export default function StudyPage() {
  const params = useParams();
  const router = useRouter();
  const deckId = params.id as string;
  const [deck, setDeck] = useState<Deck | null>(null);
  const [session, setSession] = useState<StudySession | null>(null);
  const [cardIds, setCardIds] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [mode, setMode] = useState<'sequential' | 'random' | 'difficulty'>('difficulty');

  useEffect(() => {
    loadDeck();
  }, [deckId]);

  useEffect(() => {
    if (deck && deck.cards.length > 0) {
      startSession();
    }
  }, [deck]);

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      switch (e.key) {
        case ' ':
        case 'Enter':
          e.preventDefault();
          handleFlip();
          break;
        case 'ArrowRight':
        case 'n':
          e.preventDefault();
          handleNext();
          break;
        case 'ArrowLeft':
        case 'p':
          e.preventDefault();
          handlePrevious();
          break;
        case 'c':
          e.preventDefault();
          handleMarkCorrect();
          break;
        case 'x':
          e.preventDefault();
          handleMarkIncorrect();
          break;
        case 's':
          e.preventDefault();
          handleSkip();
          break;
        case 'Escape':
          e.preventDefault();
          handleEndSession();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [isFlipped, currentIndex, cardIds.length, session]);

  function loadDeck() {
    const loaded = getDeck(deckId);
    if (!loaded) {
      router.push('/');
      return;
    }
    setDeck(loaded);
  }

  function startSession() {
    if (!deck || deck.cards.length === 0) return;

    let orderedIds: string[];
    if (mode === 'difficulty') {
      orderedIds = getCardsByDifficulty(deck);
    } else if (mode === 'random') {
      orderedIds = shuffleArray(deck.cards.map(c => c.id));
    } else {
      orderedIds = deck.cards.map(c => c.id);
    }

    const newSession: StudySession = {
      id: generateId(),
      deckId: deck.id,
      startedAt: Date.now(),
      cardsReviewed: 0,
      cardsCorrect: 0,
      cardsIncorrect: 0,
      cardResults: {},
    };

    setSession(newSession);
    setCardIds(orderedIds);
    setCurrentIndex(0);
    setIsFlipped(false);
  }

  function handleFlip() {
    setIsFlipped(!isFlipped);
  }

  function handleMarkCorrect() {
    if (!deck || !session || cardIds.length === 0) return;
    markCard('correct');
  }

  function handleMarkIncorrect() {
    if (!deck || !session || cardIds.length === 0) return;
    markCard('incorrect');
  }

  function handleSkip() {
    if (!deck || !session || cardIds.length === 0) return;
    markCard('skipped');
  }

  function markCard(result: 'correct' | 'incorrect' | 'skipped') {
    if (!deck || !session) return;

    const cardId = cardIds[currentIndex];
    const updatedSession = {
      ...session,
      cardsReviewed: session.cardsReviewed + 1,
      cardsCorrect: result === 'correct' ? session.cardsCorrect + 1 : session.cardsCorrect,
      cardsIncorrect: result === 'incorrect' ? session.cardsIncorrect + 1 : session.cardsIncorrect,
      cardResults: {
        ...session.cardResults,
        [cardId]: result,
      },
    };

    if (result !== 'skipped') {
      const updatedDeck = { ...deck };
      updateCardStats(updatedDeck, cardId, result === 'correct');
      saveDeck(updatedDeck);
      setDeck(updatedDeck);
    }

    setSession(updatedSession);
    saveSession(updatedSession);

    // Move to next card
    if (currentIndex < cardIds.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setIsFlipped(false);
    } else {
      // Session complete
      handleEndSession();
    }
  }

  function handleNext() {
    if (currentIndex < cardIds.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setIsFlipped(false);
    }
  }

  function handlePrevious() {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setIsFlipped(false);
    }
  }

  function handleEndSession() {
    if (!session) return;

    const completedSession = {
      ...session,
      endedAt: Date.now(),
    };

    if (deck) {
      const updatedDeck = {
        ...deck,
        stats: {
          ...deck.stats,
          totalSessions: deck.stats.totalSessions + 1,
        },
      };
      saveDeck(updatedDeck);
    }

    saveSession(completedSession);
    router.push(`/stats/${deckId}?session=${session.id}`);
  }

  if (!deck || !session || cardIds.length === 0) {
    return <div className="p-8">Loading...</div>;
  }

  const currentCard = deck.cards.find(c => c.id === cardIds[currentIndex]);
  const progress = ((currentIndex + 1) / cardIds.length) * 100;
  const accuracy = session.cardsReviewed > 0
    ? Math.round((session.cardsCorrect / session.cardsReviewed) * 100)
    : 0;

  if (!currentCard) {
    return <div className="p-8">Card not found</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex justify-between items-center mb-2">
            <h1 className="text-xl font-semibold">{deck.name}</h1>
            <button
              onClick={handleEndSession}
              className="text-sm text-gray-600 hover:text-gray-800"
            >
              End Session
            </button>
          </div>
          <div className="flex items-center gap-4 text-sm text-gray-600">
            <span>Card {currentIndex + 1} of {cardIds.length}</span>
            <span>•</span>
            <span>Reviewed: {session.cardsReviewed}</span>
            <span>•</span>
            <span>Accuracy: {accuracy}%</span>
          </div>
          <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      {/* Card Display */}
      <div className="flex-1 flex items-center justify-center p-4 md:p-8">
        <div className="max-w-3xl w-full">
          <div
            className="bg-white rounded-lg shadow-lg p-8 md:p-12 min-h-[400px] flex items-center justify-center cursor-pointer"
            onClick={handleFlip}
          >
            <div className="text-center w-full">
              <div className="text-sm text-gray-500 mb-4">
                {isFlipped ? 'Back' : 'Front'} • Click or press Space to flip
              </div>
              <div className="text-xl md:text-2xl text-gray-900 whitespace-pre-wrap">
                {isFlipped ? currentCard.back : currentCard.front}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          {isFlipped && (
            <div className="mt-6 flex gap-4 justify-center flex-wrap">
              <button
                onClick={handleMarkIncorrect}
                className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
              >
                ✗ Incorrect (X)
              </button>
              <button
                onClick={handleSkip}
                className="px-6 py-3 bg-gray-400 text-white rounded-lg hover:bg-gray-500 transition-colors font-medium"
              >
                Skip (S)
              </button>
              <button
                onClick={handleMarkCorrect}
                className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
              >
                ✓ Correct (C)
              </button>
            </div>
          )}

          {/* Navigation */}
          <div className="mt-6 flex justify-between items-center">
            <button
              onClick={handlePrevious}
              disabled={currentIndex === 0}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              ← Previous (P)
            </button>
            <div className="text-sm text-gray-600">
              Keyboard shortcuts: Space/Enter (flip), C (correct), X (incorrect), S (skip), ←/→ (navigate)
            </div>
            <button
              onClick={handleNext}
              disabled={currentIndex === cardIds.length - 1}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next (N) →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}



