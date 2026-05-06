/**
 * FlashcardDeck component for spaced repetition review.
 */

import React, { useState, useCallback, useEffect } from 'react';
import clsx from 'clsx';
import { useAuth } from '../../context/AuthContext';
import { FlashcardReview } from './Review';
import styles from './styles.module.css';

interface Flashcard {
  id: string;
  front: string;
  back: string;
  difficulty: string;
  is_due: boolean;
  is_new: boolean;
  is_mastered: boolean;
}

interface FlashcardDeckProps {
  chapterId: string;
  chapterTitle?: string;
  onClose?: () => void;
}

export function FlashcardDeck({
  chapterId,
  chapterTitle,
  onClose,
}: FlashcardDeckProps): JSX.Element {
  const { isAuthenticated } = useAuth();
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<'setup' | 'review' | 'complete'>('setup');
  const [sessionStats, setSessionStats] = useState({
    reviewed: 0,
    correct: 0,
    incorrect: 0,
  });

  // Settings
  const [cardCount, setCardCount] = useState(10);

  const loadDueCards = useCallback(async () => {
    if (!isAuthenticated) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('http://localhost:8000/api/v1/flashcards/due?limit=50', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('ai_textbook_token')}`,
        },
      });

      if (!response.ok) throw new Error('Failed to load flashcards');

      const data = await response.json();
      setFlashcards(data.flashcards || []);

      if (data.flashcards?.length > 0) {
        setMode('review');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load flashcards');
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  const generateDeck = useCallback(async () => {
    if (!isAuthenticated) {
      setError('Please log in to use flashcards');
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      const response = await fetch('http://localhost:8000/api/v1/flashcards/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('ai_textbook_token')}`,
        },
        body: JSON.stringify({
          chapter_id: chapterId,
          card_count: cardCount,
        }),
      });

      if (!response.ok) throw new Error('Failed to generate flashcards');

      const deck = await response.json();
      setFlashcards(deck.flashcards || []);
      setMode('review');
      setCurrentIndex(0);
      setSessionStats({ reviewed: 0, correct: 0, incorrect: 0 });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate flashcards');
    } finally {
      setIsGenerating(false);
    }
  }, [isAuthenticated, chapterId, cardCount]);

  const handleReview = useCallback(async (rating: 'again' | 'hard' | 'good' | 'easy') => {
    const currentCard = flashcards[currentIndex];
    if (!currentCard) return;

    try {
      await fetch(`http://localhost:8000/api/v1/flashcards/review/${currentCard.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('ai_textbook_token')}`,
        },
        body: JSON.stringify({ rating }),
      });

      // Update stats
      const isCorrect = rating !== 'again';
      setSessionStats(prev => ({
        reviewed: prev.reviewed + 1,
        correct: prev.correct + (isCorrect ? 1 : 0),
        incorrect: prev.incorrect + (isCorrect ? 0 : 1),
      }));

      // Move to next card or complete
      if (currentIndex < flashcards.length - 1) {
        setCurrentIndex(prev => prev + 1);
      } else {
        setMode('complete');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit review');
    }
  }, [flashcards, currentIndex]);

  const handleRestart = useCallback(() => {
    setMode('setup');
    setCurrentIndex(0);
    setSessionStats({ reviewed: 0, correct: 0, incorrect: 0 });
    setFlashcards([]);
  }, []);

  // Setup mode
  if (mode === 'setup') {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <h2 className={styles.title}>Flashcards</h2>
          {chapterTitle && <p className={styles.subtitle}>{chapterTitle}</p>}
          {onClose && (
            <button className={styles.closeButton} onClick={onClose}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          )}
        </div>

        <div className={styles.setup}>
          <div className={styles.setupField}>
            <label>Number of Cards</label>
            <div className={styles.buttonGroup}>
              {[5, 10, 15, 20].map(count => (
                <button
                  key={count}
                  className={clsx(styles.optionButton, {
                    [styles.selected]: cardCount === count,
                  })}
                  onClick={() => setCardCount(count)}
                >
                  {count}
                </button>
              ))}
            </div>
          </div>

          {error && <div className={styles.error}>{error}</div>}

          <div className={styles.actions}>
            <button
              className={styles.generateButton}
              onClick={generateDeck}
              disabled={isGenerating || !isAuthenticated}
            >
              {isGenerating ? (
                <>
                  <span className={styles.spinner} />
                  Generating...
                </>
              ) : (
                'Generate New Deck'
              )}
            </button>

            <button
              className={styles.reviewButton}
              onClick={loadDueCards}
              disabled={isLoading || !isAuthenticated}
            >
              {isLoading ? 'Loading...' : 'Review Due Cards'}
            </button>
          </div>

          {!isAuthenticated && (
            <p className={styles.loginHint}>Please log in to use flashcards</p>
          )}
        </div>
      </div>
    );
  }

  // Complete mode
  if (mode === 'complete') {
    const accuracy = sessionStats.reviewed > 0
      ? Math.round((sessionStats.correct / sessionStats.reviewed) * 100)
      : 0;

    return (
      <div className={styles.container}>
        <div className={styles.complete}>
          <div className={styles.completeIcon}>🎉</div>
          <h2 className={styles.completeTitle}>Session Complete!</h2>

          <div className={styles.statsGrid}>
            <div className={styles.statItem}>
              <span className={styles.statValue}>{sessionStats.reviewed}</span>
              <span className={styles.statLabel}>Reviewed</span>
            </div>
            <div className={styles.statItem}>
              <span className={clsx(styles.statValue, styles.correct)}>
                {sessionStats.correct}
              </span>
              <span className={styles.statLabel}>Correct</span>
            </div>
            <div className={styles.statItem}>
              <span className={clsx(styles.statValue, styles.incorrect)}>
                {sessionStats.incorrect}
              </span>
              <span className={styles.statLabel}>To Review</span>
            </div>
            <div className={styles.statItem}>
              <span className={styles.statValue}>{accuracy}%</span>
              <span className={styles.statLabel}>Accuracy</span>
            </div>
          </div>

          <div className={styles.completeActions}>
            <button className={styles.reviewButton} onClick={handleRestart}>
              Study More
            </button>
            {onClose && (
              <button className={styles.closeButtonAlt} onClick={onClose}>
                Done
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Review mode
  const currentCard = flashcards[currentIndex];
  const progress = ((currentIndex + 1) / flashcards.length) * 100;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <span className={styles.progress}>
          {currentIndex + 1} / {flashcards.length}
        </span>
        {onClose && (
          <button className={styles.closeButton} onClick={onClose}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        )}
      </div>

      <div className={styles.progressBar}>
        <div className={styles.progressFill} style={{ width: `${progress}%` }} />
      </div>

      {currentCard && (
        <FlashcardReview
          card={currentCard}
          onReview={handleReview}
        />
      )}

      {error && <div className={styles.error}>{error}</div>}
    </div>
  );
}

export default FlashcardDeck;
