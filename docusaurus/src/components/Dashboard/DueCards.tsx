/**
 * DueCards notification component for the dashboard.
 *
 * Shows a notification badge and card with due flashcard count
 * and quick action to start a review session.
 */

import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import styles from './styles.module.css';

interface DueCardsData {
  totalDue: number;
  decks: Array<{
    id: string;
    title: string;
    dueCount: number;
    chapterSlug?: string;
  }>;
  estimatedMinutes: number;
  streakDays: number;
  lastReviewDate: string | null;
}

interface DueCardsProps {
  /** Show as compact badge only */
  compact?: boolean;
  /** Callback when user starts a review */
  onStartReview?: (deckId?: string) => void;
  /** Auto-refresh interval in seconds (0 to disable) */
  refreshInterval?: number;
}

export function DueCards({
  compact = false,
  onStartReview,
  refreshInterval = 300, // 5 minutes
}: DueCardsProps): JSX.Element | null {
  const { isAuthenticated, user } = useAuth();
  const [data, setData] = useState<DueCardsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDueCards = useCallback(async () => {
    if (!isAuthenticated) return;

    try {
      const response = await api.get<DueCardsData>('/flashcard/due');
      setData(response.data);
      setError(null);
    } catch (err) {
      setError('Failed to load due cards');
      console.error('Failed to fetch due cards:', err);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  // Initial fetch
  useEffect(() => {
    fetchDueCards();
  }, [fetchDueCards]);

  // Auto-refresh
  useEffect(() => {
    if (refreshInterval > 0 && isAuthenticated) {
      const interval = setInterval(fetchDueCards, refreshInterval * 1000);
      return () => clearInterval(interval);
    }
  }, [refreshInterval, isAuthenticated, fetchDueCards]);

  // Don't render if not authenticated or no due cards
  if (!isAuthenticated || isLoading || error || !data) {
    if (compact) return null;
    return isLoading ? (
      <div className={styles.dueCardsLoading}>
        <span className={styles.spinner} />
        Loading...
      </div>
    ) : null;
  }

  // Nothing due
  if (data.totalDue === 0) {
    if (compact) return null;
    return (
      <div className={styles.dueCardsEmpty}>
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
          <polyline points="22 4 12 14.01 9 11.01" />
        </svg>
        <p>All caught up! No cards due for review.</p>
        {data.streakDays > 0 && (
          <span className={styles.streak}>{data.streakDays} day streak!</span>
        )}
      </div>
    );
  }

  // Compact badge mode
  if (compact) {
    return (
      <button
        className={styles.dueCardsBadge}
        onClick={() => onStartReview?.()}
        title={`${data.totalDue} flashcards due for review`}
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
          <line x1="8" y1="21" x2="16" y2="21" />
          <line x1="12" y1="17" x2="12" y2="21" />
        </svg>
        <span className={styles.badgeCount}>{data.totalDue}</span>
      </button>
    );
  }

  // Full card mode
  return (
    <div className={styles.dueCardsCard}>
      <div className={styles.dueCardsHeader}>
        <div className={styles.dueCardsIcon}>
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
            <line x1="8" y1="21" x2="16" y2="21" />
            <line x1="12" y1="17" x2="12" y2="21" />
          </svg>
        </div>
        <div className={styles.dueCardsTitle}>
          <h3>Flashcards Due</h3>
          <p>{data.totalDue} cards ready for review</p>
        </div>
        {data.streakDays > 0 && (
          <div className={styles.streakBadge} title={`${data.streakDays} day streak`}>
            <span className={styles.streakIcon}>🔥</span>
            <span>{data.streakDays}</span>
          </div>
        )}
      </div>

      <div className={styles.dueCardsStats}>
        <div className={styles.stat}>
          <span className={styles.statValue}>{data.totalDue}</span>
          <span className={styles.statLabel}>Cards</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statValue}>{data.decks.length}</span>
          <span className={styles.statLabel}>Decks</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statValue}>~{data.estimatedMinutes}</span>
          <span className={styles.statLabel}>Minutes</span>
        </div>
      </div>

      {data.decks.length > 0 && (
        <div className={styles.deckList}>
          {data.decks.slice(0, 3).map((deck) => (
            <button
              key={deck.id}
              className={styles.deckItem}
              onClick={() => onStartReview?.(deck.id)}
            >
              <span className={styles.deckTitle}>{deck.title}</span>
              <span className={styles.deckCount}>{deck.dueCount} due</span>
            </button>
          ))}
          {data.decks.length > 3 && (
            <span className={styles.moreDecks}>
              +{data.decks.length - 3} more decks
            </span>
          )}
        </div>
      )}

      <button
        className={styles.startReviewButton}
        onClick={() => onStartReview?.()}
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <polygon points="5 3 19 12 5 21 5 3" />
        </svg>
        Start Review Session
      </button>

      {data.lastReviewDate && (
        <p className={styles.lastReview}>
          Last reviewed: {new Date(data.lastReviewDate).toLocaleDateString()}
        </p>
      )}
    </div>
  );
}

/**
 * DueCards badge for the navbar.
 */
export function DueCardsBadge(): JSX.Element | null {
  return <DueCards compact />;
}

export default DueCards;
