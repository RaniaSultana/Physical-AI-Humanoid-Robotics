/**
 * Skeleton Loading Components (T128)
 *
 * Reusable skeleton loaders for various UI patterns.
 */

import React from 'react';
import clsx from 'clsx';
import styles from './styles.module.css';

interface SkeletonProps {
  className?: string;
  width?: string | number;
  height?: string | number;
  borderRadius?: string | number;
  animate?: boolean;
}

/**
 * Base skeleton component
 */
export function Skeleton({
  className,
  width,
  height,
  borderRadius = 4,
  animate = true,
}: SkeletonProps): JSX.Element {
  return (
    <div
      className={clsx(styles.skeleton, animate && styles.animate, className)}
      style={{
        width: typeof width === 'number' ? `${width}px` : width,
        height: typeof height === 'number' ? `${height}px` : height,
        borderRadius: typeof borderRadius === 'number' ? `${borderRadius}px` : borderRadius,
      }}
    />
  );
}

/**
 * Text line skeleton
 */
export function SkeletonText({
  lines = 3,
  className,
}: {
  lines?: number;
  className?: string;
}): JSX.Element {
  return (
    <div className={clsx(styles.skeletonText, className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          height={16}
          width={i === lines - 1 ? '70%' : '100%'}
          className={styles.textLine}
        />
      ))}
    </div>
  );
}

/**
 * Avatar skeleton
 */
export function SkeletonAvatar({
  size = 40,
  className,
}: {
  size?: number;
  className?: string;
}): JSX.Element {
  return (
    <Skeleton
      width={size}
      height={size}
      borderRadius="50%"
      className={className}
    />
  );
}

/**
 * Card skeleton
 */
export function SkeletonCard({
  className,
  hasImage = false,
  lines = 3,
}: {
  className?: string;
  hasImage?: boolean;
  lines?: number;
}): JSX.Element {
  return (
    <div className={clsx(styles.skeletonCard, className)}>
      {hasImage && <Skeleton height={160} className={styles.cardImage} />}
      <div className={styles.cardContent}>
        <Skeleton height={20} width="60%" className={styles.cardTitle} />
        <SkeletonText lines={lines} />
      </div>
    </div>
  );
}

/**
 * List item skeleton
 */
export function SkeletonListItem({
  className,
  hasAvatar = false,
}: {
  className?: string;
  hasAvatar?: boolean;
}): JSX.Element {
  return (
    <div className={clsx(styles.skeletonListItem, className)}>
      {hasAvatar && <SkeletonAvatar size={32} />}
      <div className={styles.listItemContent}>
        <Skeleton height={16} width="30%" />
        <Skeleton height={14} width="60%" />
      </div>
    </div>
  );
}

/**
 * Chapter navigation skeleton
 */
export function SkeletonChapterNav({
  className,
  itemCount = 5,
}: {
  className?: string;
  itemCount?: number;
}): JSX.Element {
  return (
    <div className={clsx(styles.skeletonChapterNav, className)}>
      <Skeleton height={24} width="40%" className={styles.navHeader} />
      {Array.from({ length: itemCount }).map((_, i) => (
        <div key={i} className={styles.navItem}>
          <Skeleton height={14} width="80%" />
        </div>
      ))}
    </div>
  );
}

/**
 * Chat message skeleton
 */
export function SkeletonChatMessage({
  className,
  isUser = false,
}: {
  className?: string;
  isUser?: boolean;
}): JSX.Element {
  return (
    <div
      className={clsx(
        styles.skeletonChatMessage,
        isUser && styles.userMessage,
        className
      )}
    >
      {!isUser && <SkeletonAvatar size={28} />}
      <div className={styles.messageBubble}>
        <SkeletonText lines={isUser ? 1 : 2} />
      </div>
    </div>
  );
}

/**
 * Quiz question skeleton
 */
export function SkeletonQuizQuestion({
  className,
  optionCount = 4,
}: {
  className?: string;
  optionCount?: number;
}): JSX.Element {
  return (
    <div className={clsx(styles.skeletonQuizQuestion, className)}>
      <Skeleton height={20} width="80%" className={styles.questionText} />
      <Skeleton height={16} width="50%" className={styles.questionSubtext} />
      <div className={styles.optionList}>
        {Array.from({ length: optionCount }).map((_, i) => (
          <Skeleton key={i} height={44} className={styles.option} />
        ))}
      </div>
    </div>
  );
}

/**
 * Flashcard skeleton
 */
export function SkeletonFlashcard({
  className,
}: {
  className?: string;
}): JSX.Element {
  return (
    <div className={clsx(styles.skeletonFlashcard, className)}>
      <Skeleton height={200} borderRadius={8} className={styles.flashcardFace} />
    </div>
  );
}

/**
 * Dashboard stats skeleton
 */
export function SkeletonDashboardStats({
  className,
  statCount = 4,
}: {
  className?: string;
  statCount?: number;
}): JSX.Element {
  return (
    <div className={clsx(styles.skeletonDashboardStats, className)}>
      {Array.from({ length: statCount }).map((_, i) => (
        <div key={i} className={styles.statCard}>
          <Skeleton height={32} width={60} className={styles.statValue} />
          <Skeleton height={14} width="70%" />
        </div>
      ))}
    </div>
  );
}

/**
 * Code block skeleton
 */
export function SkeletonCodeBlock({
  className,
  lines = 8,
}: {
  className?: string;
  lines?: number;
}): JSX.Element {
  return (
    <div className={clsx(styles.skeletonCodeBlock, className)}>
      <div className={styles.codeHeader}>
        <Skeleton height={10} width={10} borderRadius="50%" />
        <Skeleton height={10} width={10} borderRadius="50%" />
        <Skeleton height={10} width={10} borderRadius="50%" />
      </div>
      <div className={styles.codeContent}>
        {Array.from({ length: lines }).map((_, i) => (
          <Skeleton
            key={i}
            height={14}
            width={`${Math.random() * 40 + 40}%`}
            className={styles.codeLine}
          />
        ))}
      </div>
    </div>
  );
}

export default Skeleton;
