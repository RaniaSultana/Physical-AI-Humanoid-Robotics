/**
 * ReadingTracker component - tracks reading progress and time spent on chapters.
 * Shows a floating progress bar at top and timer for reading sessions.
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation } from '@docusaurus/router';
import clsx from 'clsx';
import styles from './styles.module.css';

interface ReadingTrackerProps {
  onProgressUpdate?: (progress: number, timeSpent: number) => void;
}

// Format seconds into MM:SS or HH:MM:SS
function formatTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

// Get chapter slug from path
function getChapterSlug(path: string): string | null {
  // Skip non-docs pages (auth, dashboard, etc.)
  if (path.startsWith('/auth') || path.startsWith('/dashboard') || path.startsWith('/authoring')) {
    return null;
  }
  // Handle homepage
  if (path === '/' || path === '') {
    return 'home';
  }
  // Check if it's a week/chapter path
  if (path.match(/^\/week-\d+/)) {
    return path.replace(/^\//, '').replace(/\/$/, '');
  }
  return null;
}

// Base storage key - will be combined with user ID for per-user storage
const STORAGE_KEY_BASE = 'ai_textbook_reading_progress_v3';

interface ChapterProgress {
  scrollProgress: number;
  timeSpent: number;
  lastRead: string;
  completed: boolean;
}

interface ProgressData {
  [chapterSlug: string]: ChapterProgress;
}

// Get the current user ID from localStorage (set by AuthContext)
function getCurrentUserId(): string {
  try {
    const token = localStorage.getItem('ai_textbook_token');
    if (token) {
      // Decode JWT to get user ID (basic decode, not verification)
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.sub || payload.user_id || 'authenticated';
    }
  } catch {
    // Token decode failed
  }
  return 'guest';
}

// Get user-specific storage key
function getStorageKey(): string {
  const userId = getCurrentUserId();
  return `${STORAGE_KEY_BASE}_${userId}`;
}

// Clear old storage keys on first load
function clearOldStorageKeys(): void {
  try {
    // Remove all old versions of the storage key (non-user-specific)
    localStorage.removeItem('ai_textbook_reading_progress');
    localStorage.removeItem('ai_textbook_reading_progress_v2');
    localStorage.removeItem('ai_textbook_reading_progress_v3');
    localStorage.removeItem('ai_textbook_progress_version');
  } catch {
    // Ignore errors
  }
}

function getProgressData(): ProgressData {
  try {
    // Clear old non-user-specific keys on first access
    clearOldStorageKeys();

    const key = getStorageKey();
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : {};
  } catch {
    return {};
  }
}

function saveProgressData(data: ProgressData): void {
  try {
    const key = getStorageKey();
    localStorage.setItem(key, JSON.stringify(data));
  } catch {
    // Storage might be full or unavailable
  }
}

export function ReadingTracker({ onProgressUpdate }: ReadingTrackerProps): JSX.Element | null {
  const location = useLocation();
  const chapterSlug = getChapterSlug(location.pathname);

  const [maxProgress, setMaxProgress] = useState(0); // Track maximum progress reached
  const [timeSpent, setTimeSpent] = useState(0);
  const [isReading, setIsReading] = useState(true);
  const [isMinimized, setIsMinimized] = useState(false);
  const [showCompletionBanner, setShowCompletionBanner] = useState(false);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const lastActivityRef = useRef<number>(Date.now());
  const completedRef = useRef(false);
  const maxProgressRef = useRef(0); // Keep max progress in ref for immediate access

  // Load saved progress for this chapter
  useEffect(() => {
    if (!chapterSlug) return;

    const data = getProgressData();
    const chapterData = data[chapterSlug];

    if (chapterData) {
      setTimeSpent(chapterData.timeSpent);
      setMaxProgress(chapterData.scrollProgress);
      maxProgressRef.current = chapterData.scrollProgress;
      completedRef.current = chapterData.completed;
    } else {
      setTimeSpent(0);
      setMaxProgress(0);
      maxProgressRef.current = 0;
      completedRef.current = false;
    }

    // Reset banner on chapter change
    setShowCompletionBanner(false);
  }, [chapterSlug]);

  // Track scroll progress - updates both current position and max progress
  useEffect(() => {
    if (!chapterSlug) return;

    const handleScroll = () => {
      const windowHeight = window.innerHeight;
      const documentHeight = document.documentElement.scrollHeight - windowHeight;
      const scrolled = window.scrollY;

      // Prevent division by zero or NaN - if page fits in viewport, progress is based on scroll position
      // Only count progress if there's actually scrollable content (documentHeight > 50px)
      let progress = 0;
      if (documentHeight > 50) {
        progress = Math.min(100, Math.max(0, (scrolled / documentHeight) * 100));
      } else {
        // Page fits in viewport - only mark as 100% if user has scrolled to see it
        progress = scrolled > 0 ? 100 : 0;
      }

      // Sanity check - progress must be a valid number
      if (isNaN(progress) || !isFinite(progress)) {
        progress = 0;
      }

      // Update activity timestamp - scrolling counts as reading activity
      lastActivityRef.current = Date.now();

      // Update max progress only if current is higher (progress never decreases)
      if (progress > maxProgressRef.current) {
        maxProgressRef.current = progress;
        setMaxProgress(progress);
      }

      // Mark as completed when scrolled near the bottom
      if (progress >= 90 && !completedRef.current) {
        completedRef.current = true;
        setShowCompletionBanner(true);

        // Save completion status
        const data = getProgressData();
        data[chapterSlug] = {
          ...data[chapterSlug],
          scrollProgress: maxProgressRef.current,
          timeSpent: timeSpent,
          lastRead: new Date().toISOString(),
          completed: true,
        };
        saveProgressData(data);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });

    // Delay initial check to ensure page content is fully rendered
    // This prevents incorrect 100% calculations on page load
    const initialCheckTimeout = setTimeout(() => {
      handleScroll();
    }, 500);

    return () => {
      window.removeEventListener('scroll', handleScroll);
      clearTimeout(initialCheckTimeout);
    };
  }, [chapterSlug, timeSpent]);

  // Track reading time - timer runs while page is visible and user is active
  useEffect(() => {
    if (!chapterSlug) return;

    let isPageVisible = true;

    const handleVisibilityChange = () => {
      isPageVisible = document.visibilityState === 'visible';
      if (isPageVisible) {
        lastActivityRef.current = Date.now();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Start timer - runs every second
    timerRef.current = setInterval(() => {
      if (!isPageVisible) {
        setIsReading(false);
        return;
      }

      const now = Date.now();
      const timeSinceActivity = now - lastActivityRef.current;

      // Pause timer if idle for more than 2 minutes (but scrolling resets this)
      if (timeSinceActivity > 120000) {
        setIsReading(false);
        return;
      }

      setIsReading(true);
      setTimeSpent(prev => {
        const newTime = prev + 1;

        // Save progress every 30 seconds
        if (newTime % 30 === 0) {
          const data = getProgressData();
          data[chapterSlug] = {
            scrollProgress: maxProgressRef.current,
            timeSpent: newTime,
            lastRead: new Date().toISOString(),
            completed: completedRef.current,
          };
          saveProgressData(data);
        }

        return newTime;
      });
    }, 1000);

    // Track user activity (scroll is already tracked in scroll effect)
    const handleActivity = () => {
      lastActivityRef.current = Date.now();
      setIsReading(true);
    };

    window.addEventListener('mousemove', handleActivity, { passive: true });
    window.addEventListener('keydown', handleActivity, { passive: true });
    window.addEventListener('click', handleActivity, { passive: true });
    window.addEventListener('touchstart', handleActivity, { passive: true });
    window.addEventListener('scroll', handleActivity, { passive: true }); // Scrolling is activity too

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('mousemove', handleActivity);
      window.removeEventListener('keydown', handleActivity);
      window.removeEventListener('click', handleActivity);
      window.removeEventListener('touchstart', handleActivity);
      window.removeEventListener('scroll', handleActivity);

      // Save final progress on unmount
      const data = getProgressData();
      data[chapterSlug] = {
        scrollProgress: maxProgressRef.current,
        timeSpent: timeSpent,
        lastRead: new Date().toISOString(),
        completed: completedRef.current,
      };
      saveProgressData(data);
    };
  }, [chapterSlug, timeSpent]);

  // Notify parent of progress updates
  useEffect(() => {
    if (onProgressUpdate) {
      onProgressUpdate(maxProgress, timeSpent);
    }
  }, [maxProgress, timeSpent, onProgressUpdate]);

  // Don't show on non-docs pages
  if (!chapterSlug) {
    return null;
  }

  return (
    <>
      {/* Fixed progress bar at top - shows max progress (never decreases) */}
      <div className={styles.progressContainer}>
        <div
          className={styles.progressBar}
          style={{ width: `${maxProgress}%` }}
          role="progressbar"
          aria-valuenow={maxProgress}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Reading progress"
        />
      </div>

      {/* Floating tracker widget */}
      <div className={clsx(styles.tracker, { [styles.minimized]: isMinimized })}>
        <button
          className={styles.toggleButton}
          onClick={() => setIsMinimized(!isMinimized)}
          aria-label={isMinimized ? 'Expand reading tracker' : 'Minimize reading tracker'}
        >
          {isMinimized ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="15 18 9 12 15 6"></polyline>
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="9 18 15 12 9 6"></polyline>
            </svg>
          )}
        </button>

        {!isMinimized && (
          <div className={styles.trackerContent}>
            <div className={styles.trackerHeader}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
              </svg>
              <span>Reading Progress</span>
            </div>

            <div className={styles.stats}>
              <div className={styles.stat}>
                <span className={styles.statLabel}>Progress</span>
                <span className={styles.statValue}>{Math.round(maxProgress)}%</span>
              </div>

              <div className={styles.stat}>
                <span className={styles.statLabel}>Time</span>
                <span className={clsx(styles.statValue, styles.timer, { [styles.paused]: !isReading })}>
                  {formatTime(timeSpent)}
                  {!isReading && <span className={styles.pausedBadge}>Paused</span>}
                </span>
              </div>
            </div>

            {completedRef.current && (
              <div className={styles.completedBadge}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                  <polyline points="22 4 12 14.01 9 11.01"></polyline>
                </svg>
                Chapter Complete
              </div>
            )}
          </div>
        )}

        {isMinimized && (
          <div className={styles.minimizedContent}>
            <span className={styles.minimizedProgress}>{Math.round(maxProgress)}%</span>
            <span className={styles.minimizedTime}>{formatTime(timeSpent)}</span>
          </div>
        )}
      </div>

      {/* Completion banner */}
      {showCompletionBanner && (
        <div className={styles.completionBanner}>
          <div className={styles.completionContent}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
              <polyline points="22 4 12 14.01 9 11.01"></polyline>
            </svg>
            <div className={styles.completionText}>
              <strong>Chapter Complete!</strong>
              <span>You've read this chapter in {formatTime(timeSpent)}</span>
            </div>
            <button
              className={styles.completionClose}
              onClick={() => setShowCompletionBanner(false)}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
        </div>
      )}
    </>
  );
}

export default ReadingTracker;
