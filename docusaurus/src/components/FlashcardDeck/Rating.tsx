/**
 * Rating component for flashcard review with interval previews.
 *
 * Shows quality rating buttons (Again, Hard, Good, Easy) with
 * predicted next review intervals based on SM-2 algorithm.
 */

import React, { useMemo } from 'react';
import clsx from 'clsx';
import styles from './styles.module.css';

export type RatingValue = 'again' | 'hard' | 'good' | 'easy';

interface RatingConfig {
  value: RatingValue;
  label: string;
  description: string;
  shortcut: string;
  color: string;
  quality: number; // SM-2 quality score (0-5)
}

const RATING_CONFIGS: RatingConfig[] = [
  {
    value: 'again',
    label: 'Again',
    description: "Didn't know it",
    shortcut: '1',
    color: '#ef4444', // red
    quality: 1,
  },
  {
    value: 'hard',
    label: 'Hard',
    description: 'Struggled to recall',
    shortcut: '2',
    color: '#f59e0b', // amber
    quality: 3,
  },
  {
    value: 'good',
    label: 'Good',
    description: 'Knew it with effort',
    shortcut: '3',
    color: '#22c55e', // green
    quality: 4,
  },
  {
    value: 'easy',
    label: 'Easy',
    description: 'Knew it instantly',
    shortcut: '4',
    color: '#3b82f6', // blue
    quality: 5,
  },
];

interface RatingProps {
  /** Current card's easiness factor */
  easinessFactor?: number;
  /** Current interval in days */
  currentInterval?: number;
  /** Number of successful repetitions */
  repetitions?: number;
  /** Callback when rating is selected */
  onRate: (rating: RatingValue, quality: number) => void;
  /** Response time in milliseconds (for analytics) */
  responseTimeMs?: number;
  /** Whether to show interval previews */
  showIntervalPreviews?: boolean;
  /** Disabled state */
  disabled?: boolean;
}

/**
 * Calculate the next interval based on SM-2 algorithm.
 * This is a simplified preview calculation.
 */
function calculateNextInterval(
  quality: number,
  easinessFactor: number,
  currentInterval: number,
  repetitions: number
): string {
  // Failed recall - reset
  if (quality < 3) {
    return '< 1 min';
  }

  // Calculate new values
  const newEF = Math.max(1.3, easinessFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)));

  let newInterval: number;
  if (repetitions === 0) {
    newInterval = 1;
  } else if (repetitions === 1) {
    newInterval = 6;
  } else {
    newInterval = Math.round(currentInterval * newEF);
  }

  // Format the interval
  if (newInterval === 1) {
    return '1 day';
  } else if (newInterval < 30) {
    return `${newInterval} days`;
  } else if (newInterval < 365) {
    const months = Math.round(newInterval / 30);
    return `${months} month${months > 1 ? 's' : ''}`;
  } else {
    const years = (newInterval / 365).toFixed(1);
    return `${years} years`;
  }
}

export function Rating({
  easinessFactor = 2.5,
  currentInterval = 1,
  repetitions = 0,
  onRate,
  responseTimeMs,
  showIntervalPreviews = true,
  disabled = false,
}: RatingProps): JSX.Element {
  // Pre-calculate interval previews for each rating
  const intervalPreviews = useMemo(() => {
    return RATING_CONFIGS.reduce((acc, config) => {
      acc[config.value] = calculateNextInterval(
        config.quality,
        easinessFactor,
        currentInterval,
        repetitions
      );
      return acc;
    }, {} as Record<RatingValue, string>);
  }, [easinessFactor, currentInterval, repetitions]);

  const handleRating = (config: RatingConfig) => {
    if (disabled) return;
    onRate(config.value, config.quality);
  };

  // Handle keyboard shortcuts
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (disabled) return;

      const config = RATING_CONFIGS.find((c) => c.shortcut === e.key);
      if (config) {
        e.preventDefault();
        handleRating(config);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [disabled, handleRating]);

  return (
    <div className={styles.ratingContainer}>
      <p className={styles.ratingPrompt}>
        How well did you know this?
        {responseTimeMs !== undefined && (
          <span className={styles.responseTime}>
            Response time: {(responseTimeMs / 1000).toFixed(1)}s
          </span>
        )}
      </p>

      <div className={styles.ratingButtonsGrid}>
        {RATING_CONFIGS.map((config) => (
          <button
            key={config.value}
            className={clsx(styles.ratingButtonEnhanced, styles[config.value], {
              [styles.disabled]: disabled,
            })}
            onClick={() => handleRating(config)}
            disabled={disabled}
            style={{ '--rating-color': config.color } as React.CSSProperties}
            aria-label={`${config.label}: ${config.description}`}
          >
            <span className={styles.ratingShortcut}>{config.shortcut}</span>
            <span className={styles.ratingLabelEnhanced}>{config.label}</span>
            <span className={styles.ratingDescription}>{config.description}</span>
            {showIntervalPreviews && (
              <span className={styles.intervalPreview}>
                {intervalPreviews[config.value]}
              </span>
            )}
          </button>
        ))}
      </div>

      <p className={styles.ratingHint}>
        Press 1-4 or click a button to rate
      </p>
    </div>
  );
}

/**
 * Compact rating component for inline use.
 */
export function RatingCompact({
  onRate,
  disabled = false,
}: Pick<RatingProps, 'onRate' | 'disabled'>): JSX.Element {
  return (
    <div className={styles.ratingCompact}>
      {RATING_CONFIGS.map((config) => (
        <button
          key={config.value}
          className={clsx(styles.ratingButtonCompact, styles[config.value])}
          onClick={() => onRate(config.value, config.quality)}
          disabled={disabled}
          title={`${config.label} (${config.shortcut})`}
          style={{ '--rating-color': config.color } as React.CSSProperties}
        >
          {config.label}
        </button>
      ))}
    </div>
  );
}

/**
 * Get SM-2 quality score from rating value.
 */
export function getQualityFromRating(rating: RatingValue): number {
  const config = RATING_CONFIGS.find((c) => c.value === rating);
  return config?.quality ?? 3;
}

/**
 * Get rating value from SM-2 quality score.
 */
export function getRatingFromQuality(quality: number): RatingValue {
  if (quality <= 2) return 'again';
  if (quality === 3) return 'hard';
  if (quality === 4) return 'good';
  return 'easy';
}

export default Rating;
