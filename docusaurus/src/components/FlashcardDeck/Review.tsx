/**
 * FlashcardReview component with flip animation.
 */

import React, { useState, useEffect } from 'react';
import clsx from 'clsx';
import styles from './styles.module.css';

interface Flashcard {
  id: string;
  front: string;
  back: string;
  difficulty: string;
}

interface FlashcardReviewProps {
  card: Flashcard;
  onReview: (rating: 'again' | 'hard' | 'good' | 'easy') => void;
}

export function FlashcardReview({ card, onReview }: FlashcardReviewProps): JSX.Element {
  const [isFlipped, setIsFlipped] = useState(false);
  const [startTime, setStartTime] = useState<number>(Date.now());

  // Reset flip state when card changes
  useEffect(() => {
    setIsFlipped(false);
    setStartTime(Date.now());
  }, [card.id]);

  const handleFlip = () => {
    setIsFlipped(true);
  };

  const handleRating = (rating: 'again' | 'hard' | 'good' | 'easy') => {
    onReview(rating);
  };

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isFlipped) {
        if (e.key === ' ' || e.key === 'Enter') {
          e.preventDefault();
          handleFlip();
        }
      } else {
        switch (e.key) {
          case '1':
            handleRating('again');
            break;
          case '2':
            handleRating('hard');
            break;
          case '3':
            handleRating('good');
            break;
          case '4':
            handleRating('easy');
            break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFlipped]);

  return (
    <div className={styles.reviewContainer}>
      <div
        className={clsx(styles.card, { [styles.flipped]: isFlipped })}
        onClick={!isFlipped ? handleFlip : undefined}
      >
        <div className={styles.cardInner}>
          {/* Front of card */}
          <div className={styles.cardFront}>
            <div className={styles.cardContent}>
              <span className={styles.cardLabel}>Question</span>
              <p className={styles.cardText}>{card.front}</p>
            </div>
            <div className={styles.flipHint}>
              <span>Tap or press Space to reveal</span>
            </div>
          </div>

          {/* Back of card */}
          <div className={styles.cardBack}>
            <div className={styles.cardContent}>
              <span className={styles.cardLabel}>Answer</span>
              <p className={styles.cardText}>{card.back}</p>
            </div>
          </div>
        </div>
      </div>

      {isFlipped && (
        <div className={styles.ratingButtons}>
          <p className={styles.ratingPrompt}>How well did you know this?</p>
          <div className={styles.ratingRow}>
            <button
              className={clsx(styles.ratingButton, styles.again)}
              onClick={() => handleRating('again')}
            >
              <span className={styles.ratingKey}>1</span>
              <span className={styles.ratingLabel}>Again</span>
              <span className={styles.ratingDesc}>Didn't know</span>
            </button>
            <button
              className={clsx(styles.ratingButton, styles.hard)}
              onClick={() => handleRating('hard')}
            >
              <span className={styles.ratingKey}>2</span>
              <span className={styles.ratingLabel}>Hard</span>
              <span className={styles.ratingDesc}>Struggled</span>
            </button>
            <button
              className={clsx(styles.ratingButton, styles.good)}
              onClick={() => handleRating('good')}
            >
              <span className={styles.ratingKey}>3</span>
              <span className={styles.ratingLabel}>Good</span>
              <span className={styles.ratingDesc}>Knew it</span>
            </button>
            <button
              className={clsx(styles.ratingButton, styles.easy)}
              onClick={() => handleRating('easy')}
            >
              <span className={styles.ratingKey}>4</span>
              <span className={styles.ratingLabel}>Easy</span>
              <span className={styles.ratingDesc}>Too easy</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default FlashcardReview;
