/**
 * ProgressBar component for showing reading progress.
 */

import React from 'react';
import styles from './styles.module.css';

interface ProgressBarProps {
  progress: number; // 0-100
  label?: string;
  showPercentage?: boolean;
  size?: 'small' | 'medium' | 'large';
  color?: 'primary' | 'success' | 'warning';
}

export default function ProgressBar({
  progress,
  label,
  showPercentage = true,
  size = 'medium',
  color = 'primary',
}: ProgressBarProps) {
  // Clamp progress between 0 and 100
  const clampedProgress = Math.min(Math.max(progress, 0), 100);

  return (
    <div className={styles.progressContainer}>
      {label && <span className={styles.label}>{label}</span>}
      <div
        className={`${styles.progressBar} ${styles[size]}`}
        role="progressbar"
        aria-valuenow={clampedProgress}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label || 'Progress'}
      >
        <div
          className={`${styles.progressFill} ${styles[color]}`}
          style={{ width: `${clampedProgress}%` }}
        />
      </div>
      {showPercentage && (
        <span className={styles.percentage}>{Math.round(clampedProgress)}%</span>
      )}
    </div>
  );
}

interface CourseProgressProps {
  completedChapters: number;
  totalChapters: number;
}

export function CourseProgress({ completedChapters, totalChapters }: CourseProgressProps) {
  const progress = totalChapters > 0 ? (completedChapters / totalChapters) * 100 : 0;

  return (
    <div className={styles.courseProgress}>
      <div className={styles.courseHeader}>
        <span className={styles.courseLabel}>Course Progress</span>
        <span className={styles.courseStats}>
          {completedChapters} / {totalChapters} chapters
        </span>
      </div>
      <ProgressBar progress={progress} showPercentage={false} size="large" />
    </div>
  );
}
