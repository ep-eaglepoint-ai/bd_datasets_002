'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { getDeck, getDeckSessions } from '@/lib/storage';
import { Deck, StudySession, CardStats } from '@/types';

export default function StatsPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const deckId = params.id as string;
  const sessionId = searchParams.get('session');
  const [deck, setDeck] = useState<Deck | null>(null);
  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [selectedSession, setSelectedSession] = useState<StudySession | null>(null);

  useEffect(() => {
    loadData();
  }, [deckId]);

  useEffect(() => {
    if (sessionId && sessions.length > 0) {
      const session = sessions.find(s => s.id === sessionId);
      if (session) {
        setSelectedSession(session);
      }
    }
  }, [sessionId, sessions]);

  function loadData() {
    const loaded = getDeck(deckId);
    if (!loaded) {
      router.push('/');
      return;
    }
    setDeck(loaded);
    const deckSessions = getDeckSessions(deckId);
    setSessions(deckSessions);
  }

  function getMostMissedCards(): Array<{ cardId: string; stats: CardStats }> {
    if (!deck) return [];

    return Object.entries(deck.stats.cardStats)
      .map(([cardId, stats]) => ({ cardId, stats }))
      .filter(item => item.stats.incorrectCount > 0)
      .sort((a, b) => b.stats.incorrectCount - a.stats.incorrectCount)
      .slice(0, 5);
  }

  function getAccuracyTrend(): Array<{ date: string; accuracy: number }> {
    const trend: Record<string, { correct: number; total: number }> = {};

    for (const session of sessions) {
      if (!session.endedAt) continue;
      const date = new Date(session.endedAt).toISOString().split('T')[0];
      if (!trend[date]) {
        trend[date] = { correct: 0, total: 0 };
      }
      trend[date].correct += session.cardsCorrect;
      trend[date].total += session.cardsReviewed;
    }

    return Object.entries(trend)
      .map(([date, data]) => ({
        date,
        accuracy: data.total > 0 ? Math.round((data.correct / data.total) * 100) : 0,
      }))
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-7); // Last 7 days
  }

  if (!deck) {
    return <div className="p-8">Loading...</div>;
  }

  const mostMissed = getMostMissedCards();
  const accuracyTrend = getAccuracyTrend();
  const totalCards = deck.cards.length;
  const totalSessions = sessions.length;
  const totalReviews = Object.values(deck.stats.cardStats).reduce(
    (sum, stat) => sum + stat.totalReviews,
    0
  );

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <Link href={`/deck/${deck.id}`} className="text-blue-600 hover:text-blue-800 mb-4 inline-block">
            ← Back to Deck
          </Link>
          <h1 className="text-3xl font-bold mb-2">{deck.name} - Statistics</h1>
        </div>

        {/* Overview Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm text-gray-600 mb-1">Mastery</div>
            <div className="text-3xl font-bold text-blue-600">{deck.stats.masteryPercentage}%</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm text-gray-600 mb-1">Total Cards</div>
            <div className="text-3xl font-bold">{totalCards}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm text-gray-600 mb-1">Study Sessions</div>
            <div className="text-3xl font-bold">{totalSessions}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm text-gray-600 mb-1">Total Reviews</div>
            <div className="text-3xl font-bold">{totalReviews}</div>
          </div>
        </div>

        {/* Accuracy Trend */}
        {accuracyTrend.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6 mb-8">
            <h2 className="text-xl font-semibold mb-4">Accuracy Trend (Last 7 Days)</h2>
            <div className="flex items-end gap-2 h-48">
              {accuracyTrend.map((item, index) => {
                const maxAccuracy = Math.max(...accuracyTrend.map(t => t.accuracy), 100);
                return (
                  <div key={index} className="flex-1 flex flex-col items-center">
                    <div
                      className="w-full bg-blue-600 rounded-t transition-all"
                      style={{ height: `${(item.accuracy / maxAccuracy) * 100}%` }}
                      title={`${item.date}: ${item.accuracy}%`}
                    />
                    <div className="text-xs text-gray-600 mt-2 transform -rotate-45 origin-top-left">
                      {new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Most Missed Cards */}
        {mostMissed.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6 mb-8">
            <h2 className="text-xl font-semibold mb-4">Most Missed Cards</h2>
            <div className="space-y-4">
              {mostMissed.map(({ cardId, stats }) => {
                const card = deck.cards.find(c => c.id === cardId);
                if (!card) return null;
                return (
                  <div key={cardId} className="border-l-4 border-red-500 pl-4">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">{card.front}</div>
                        <div className="text-sm text-gray-600 mt-1">{card.back}</div>
                      </div>
                      <div className="text-sm text-gray-600 ml-4">
                        {stats.incorrectCount} incorrect / {stats.totalReviews} reviews
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Recent Sessions */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Recent Study Sessions</h2>
          {sessions.length === 0 ? (
            <p className="text-gray-500">No study sessions yet.</p>
          ) : (
            <div className="space-y-2">
              {sessions.slice(0, 10).map((session) => {
                const accuracy = session.cardsReviewed > 0
                  ? Math.round((session.cardsCorrect / session.cardsReviewed) * 100)
                  : 0;
                const date = new Date(session.startedAt).toLocaleString();
                return (
                  <div
                    key={session.id}
                    className={`p-4 rounded-lg border-2 cursor-pointer transition-colors ${
                      selectedSession?.id === session.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => setSelectedSession(session)}
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="font-medium">{date}</div>
                        <div className="text-sm text-gray-600">
                          {session.cardsReviewed} cards reviewed • {accuracy}% accuracy
                        </div>
                      </div>
                      <div className="text-sm text-gray-600">
                        {session.cardsCorrect} correct • {session.cardsIncorrect} incorrect
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Session Details */}
        {selectedSession && (
          <div className="bg-white rounded-lg shadow p-6 mt-8">
            <h2 className="text-xl font-semibold mb-4">Session Details</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div>
                <div className="text-sm text-gray-600">Cards Reviewed</div>
                <div className="text-2xl font-bold">{selectedSession.cardsReviewed}</div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Correct</div>
                <div className="text-2xl font-bold text-green-600">{selectedSession.cardsCorrect}</div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Incorrect</div>
                <div className="text-2xl font-bold text-red-600">{selectedSession.cardsIncorrect}</div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Accuracy</div>
                <div className="text-2xl font-bold">
                  {selectedSession.cardsReviewed > 0
                    ? Math.round((selectedSession.cardsCorrect / selectedSession.cardsReviewed) * 100)
                    : 0}%
                </div>
              </div>
            </div>
            <div className="text-sm text-gray-600">
              Started: {new Date(selectedSession.startedAt).toLocaleString()}
              {selectedSession.endedAt && (
                <> • Ended: {new Date(selectedSession.endedAt).toLocaleString()}</>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}



