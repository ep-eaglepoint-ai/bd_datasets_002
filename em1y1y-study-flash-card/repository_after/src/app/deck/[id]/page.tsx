'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { getDeck, saveDeck, deleteDeck } from '@/lib/storage';
import { Deck, FlashCard } from '@/types';
import { generateId } from '@/lib/utils';

export default function DeckPage() {
  const params = useParams();
  const router = useRouter();
  const deckId = params.id as string;
  const [deck, setDeck] = useState<Deck | null>(null);
  const [editingCard, setEditingCard] = useState<FlashCard | null>(null);
  const [showCardModal, setShowCardModal] = useState(false);
  const [cardFront, setCardFront] = useState('');
  const [cardBack, setCardBack] = useState('');
  const [deckName, setDeckName] = useState('');
  const [isRenaming, setIsRenaming] = useState(false);

  useEffect(() => {
    loadDeck();
  }, [deckId]);

  function loadDeck() {
    const loaded = getDeck(deckId);
    if (!loaded) {
      router.push('/');
      return;
    }
    setDeck(loaded);
    setDeckName(loaded.name);
  }

  function handleSaveDeck() {
    if (!deck) return;
    const updated = { ...deck, name: deckName.trim(), updatedAt: Date.now() };
    saveDeck(updated);
    setDeck(updated);
    setIsRenaming(false);
  }

  function handleCreateCard() {
    if (!deck || !cardFront.trim() || !cardBack.trim()) return;

    const newCard: FlashCard = {
      id: generateId(),
      front: cardFront.trim(),
      back: cardBack.trim(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const updated = {
      ...deck,
      cards: [...deck.cards, newCard],
      stats: {
        ...deck.stats,
        totalCards: deck.cards.length + 1,
      },
      updatedAt: Date.now(),
    };

    saveDeck(updated);
    setDeck(updated);
    setCardFront('');
    setCardBack('');
    setShowCardModal(false);
  }

  function handleEditCard(card: FlashCard) {
    setEditingCard(card);
    setCardFront(card.front);
    setCardBack(card.back);
    setShowCardModal(true);
  }

  function handleUpdateCard() {
    if (!deck || !editingCard || !cardFront.trim() || !cardBack.trim()) return;

    const updated = {
      ...deck,
      cards: deck.cards.map(c =>
        c.id === editingCard.id
          ? { ...c, front: cardFront.trim(), back: cardBack.trim(), updatedAt: Date.now() }
          : c
      ),
      updatedAt: Date.now(),
    };

    saveDeck(updated);
    setDeck(updated);
    setEditingCard(null);
    setCardFront('');
    setCardBack('');
    setShowCardModal(false);
  }

  function handleDeleteCard(cardId: string) {
    if (!deck || !confirm('Delete this card?')) return;

    const updated = {
      ...deck,
      cards: deck.cards.filter(c => c.id !== cardId),
      stats: {
        ...deck.stats,
        totalCards: deck.cards.length - 1,
        cardStats: Object.fromEntries(
          Object.entries(deck.stats.cardStats).filter(([id]) => id !== cardId)
        ),
      },
      updatedAt: Date.now(),
    };

    saveDeck(updated);
    setDeck(updated);
  }

  function handleDeleteDeck() {
    if (!deck || !confirm('Are you sure you want to delete this deck? This cannot be undone.')) return;
    deleteDeck(deck.id);
    router.push('/');
  }

  if (!deck) {
    return <div className="p-8">Loading...</div>;
  }

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <Link href="/" className="text-blue-600 hover:text-blue-800 mb-4 inline-block">
            ← Back to Decks
          </Link>
          <div className="flex items-center gap-4 mb-4">
            {isRenaming ? (
              <>
                <input
                  type="text"
                  value={deckName}
                  onChange={(e) => setDeckName(e.target.value)}
                  className="text-3xl font-bold px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveDeck();
                    if (e.key === 'Escape') {
                      setIsRenaming(false);
                      setDeckName(deck.name);
                    }
                  }}
                  autoFocus
                />
                <button
                  onClick={handleSaveDeck}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Save
                </button>
                <button
                  onClick={() => {
                    setIsRenaming(false);
                    setDeckName(deck.name);
                  }}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                >
                  Cancel
                </button>
              </>
            ) : (
              <>
                <h1 className="text-3xl font-bold">{deck.name}</h1>
                <button
                  onClick={() => setIsRenaming(true)}
                  className="text-sm text-gray-600 hover:text-gray-800"
                >
                  ✏️ Rename
                </button>
              </>
            )}
          </div>
          <div className="flex gap-4 flex-wrap">
            <Link
              href={`/study/${deck.id}`}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Start Study Session
            </Link>
            <button
              onClick={() => {
                setEditingCard(null);
                setCardFront('');
                setCardBack('');
                setShowCardModal(true);
              }}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              + Add Card
            </button>
            <Link
              href={`/stats/${deck.id}`}
              className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              View Stats
            </Link>
            <button
              onClick={handleDeleteDeck}
              className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Delete Deck
            </button>
          </div>
        </div>

        <div className="mb-4 text-sm text-gray-600">
          {deck.cards.length} {deck.cards.length === 1 ? 'card' : 'cards'} •{' '}
          {deck.stats.masteryPercentage}% mastery • {deck.stats.totalSessions} sessions
        </div>

        {deck.cards.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <p className="text-gray-500 text-lg mb-4">No cards yet. Add your first card to get started!</p>
            <button
              onClick={() => {
                setEditingCard(null);
                setCardFront('');
                setCardBack('');
                setShowCardModal(true);
              }}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              Add First Card
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {deck.cards.map((card) => {
              const cardStat = deck.stats.cardStats[card.id];
              return (
                <div key={card.id} className="bg-white rounded-lg shadow p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <div className="mb-2">
                        <div className="text-sm text-gray-500 mb-1">Front:</div>
                        <div className="text-gray-900">{card.front}</div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-500 mb-1">Back:</div>
                        <div className="text-gray-900">{card.back}</div>
                      </div>
                    </div>
                    <div className="flex gap-2 ml-4">
                      <button
                        onClick={() => handleEditCard(card)}
                        className="text-blue-600 hover:text-blue-800"
                        title="Edit"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => handleDeleteCard(card.id)}
                        className="text-red-600 hover:text-red-800"
                        title="Delete"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                  {cardStat && cardStat.totalReviews > 0 && (
                    <div className="text-xs text-gray-500 mt-2">
                      Reviewed {cardStat.totalReviews} times •{' '}
                      {Math.round((cardStat.correctCount / cardStat.totalReviews) * 100)}% correct
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showCardModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <h2 className="text-xl font-semibold mb-4">
              {editingCard ? 'Edit Card' : 'Create New Card'}
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Front (Question)</label>
                <textarea
                  value={cardFront}
                  onChange={(e) => setCardFront(e.target.value)}
                  placeholder="Enter the question or prompt..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg h-32 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Back (Answer)</label>
                <textarea
                  value={cardBack}
                  onChange={(e) => setCardBack(e.target.value)}
                  placeholder="Enter the answer or explanation..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg h-32 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <button
                onClick={editingCard ? handleUpdateCard : handleCreateCard}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                {editingCard ? 'Update' : 'Create'}
              </button>
              <button
                onClick={() => {
                  setShowCardModal(false);
                  setEditingCard(null);
                  setCardFront('');
                  setCardBack('');
                }}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}



