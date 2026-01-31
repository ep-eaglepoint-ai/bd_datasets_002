'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getAllDecks, deleteDeck, exportDeck, exportDeckCSV, importDeck, saveDeck } from '@/lib/storage';
import { Deck } from '@/types';
import { generateId } from '@/lib/utils';

export default function Home() {
  const [decks, setDecks] = useState<Deck[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newDeckName, setNewDeckName] = useState('');
  const [importText, setImportText] = useState('');
  const [showImportModal, setShowImportModal] = useState(false);

  useEffect(() => {
    loadDecks();
  }, []);

  function loadDecks() {
    setDecks(getAllDecks());
  }

  function handleCreateDeck() {
    if (!newDeckName.trim()) return;

    const newDeck: Deck = {
      id: generateId(),
      name: newDeckName.trim(),
      cards: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      stats: {
        totalCards: 0,
        masteryPercentage: 0,
        totalSessions: 0,
        cardStats: {},
      },
    };

    saveDeck(newDeck);
    setNewDeckName('');
    setShowCreateModal(false);
    loadDecks();
  }

  function handleDeleteDeck(deckId: string) {
    if (confirm('Are you sure you want to delete this deck?')) {
      deleteDeck(deckId);
      loadDecks();
    }
  }

  function handleExportDeck(deck: Deck, format: 'json' | 'csv') {
    const content = format === 'json' ? exportDeck(deck) : exportDeckCSV(deck);
    const blob = new Blob([content], { type: format === 'json' ? 'application/json' : 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${deck.name.replace(/[^a-z0-9]/gi, '_')}.${format}`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleImportDeck() {
    const deck = importDeck(importText);
    if (deck) {
      deck.id = generateId(); // Generate new ID for imported deck
      saveDeck(deck);
      setImportText('');
      setShowImportModal(false);
      loadDecks();
    } else {
      alert('Invalid deck format. Please check your JSON.');
    }
  }

  function handleFileImport(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      setImportText(text);
    };
    reader.readAsText(file);
  }

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <header className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Flash Card Study</h1>
          <p className="text-gray-600">Create decks, study cards, and track your progress</p>
        </header>

        <div className="flex gap-4 mb-6 flex-wrap">
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            + Create New Deck
          </button>
          <button
            onClick={() => setShowImportModal(true)}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            Import Deck
          </button>
        </div>

        {decks.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <p className="text-gray-500 text-lg">No decks yet. Create your first deck to get started!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {decks.map((deck) => (
              <div key={deck.id} className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow">
                <div className="flex justify-between items-start mb-4">
                  <h2 className="text-xl font-semibold text-gray-900">{deck.name}</h2>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleExportDeck(deck, 'json')}
                      className="text-sm text-blue-600 hover:text-blue-800"
                      title="Export JSON"
                    >
                      📥
                    </button>
                    <button
                      onClick={() => handleDeleteDeck(deck.id)}
                      className="text-sm text-red-600 hover:text-red-800"
                      title="Delete"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
                <p className="text-sm text-gray-600 mb-4">
                  {deck.cards.length} {deck.cards.length === 1 ? 'card' : 'cards'}
                </p>
                <div className="mb-4">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">Mastery</span>
                    <span className="font-medium">{deck.stats.masteryPercentage}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all"
                      style={{ width: `${deck.stats.masteryPercentage}%` }}
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Link
                    href={`/deck/${deck.id}`}
                    aria-label={`Manage ${deck.name}`}
                    className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-center text-sm"
                  >
                    Manage
                  </Link>
                  <Link
                    href={`/study/${deck.id}`}
                    aria-label={`Study ${deck.name}`}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-center text-sm"
                  >
                    Study
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h2 className="text-xl font-semibold mb-4">Create New Deck</h2>
            <input
              type="text"
              value={newDeckName}
              onChange={(e) => setNewDeckName(e.target.value)}
              placeholder="Deck name"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
              onKeyDown={(e) => e.key === 'Enter' && handleCreateDeck()}
              autoFocus
            />
            <div className="flex gap-2">
              <button
                onClick={handleCreateDeck}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Create
              </button>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setNewDeckName('');
                }}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {showImportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <h2 className="text-xl font-semibold mb-4">Import Deck</h2>
            <div className="mb-4">
              <input
                type="file"
                accept=".json"
                onChange={handleFileImport}
                className="mb-2"
              />
              <p className="text-sm text-gray-600 mb-2">Or paste JSON:</p>
              <textarea
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
                placeholder="Paste deck JSON here..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg h-48 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleImportDeck}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                Import
              </button>
              <button
                onClick={() => {
                  setShowImportModal(false);
                  setImportText('');
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



