/**
 * Hook for tracking and persisting reading progress.
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { api, ReadingProgress } from '../services/api';
import { useAuth } from '../context/AuthContext';

interface UseReadingProgressOptions {
  chapterId: string;
  debounceMs?: number;
  saveIntervalMs?: number;
}

interface UseReadingProgressReturn {
  progress: number;
  isCompleted: boolean;
  totalTimeSeconds: number;
  isLoading: boolean;
  error: string | null;
  markComplete: () => Promise<void>;
}

export function useReadingProgress({
  chapterId,
  debounceMs = 1000,
  saveIntervalMs = 30000,
}: UseReadingProgressOptions): UseReadingProgressReturn {
  const { isAuthenticated } = useAuth();
  const [progress, setProgress] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const [totalTimeSeconds, setTotalTimeSeconds] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const timeOnPageRef = useRef(0);
  const lastSaveRef = useRef<number>(Date.now());
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Load initial progress
  useEffect(() => {
    if (!isAuthenticated || !chapterId) return;

    const loadProgress = async () => {
      setIsLoading(true);
      try {
        const data = await api.getProgress();
        const chapterProgress = data.progress.find(p => p.chapter_id === chapterId);
        if (chapterProgress) {
          setProgress(chapterProgress.scroll_position * 100);
          setIsCompleted(chapterProgress.completed);
          setTotalTimeSeconds(chapterProgress.total_time_seconds);
        }
      } catch {
        // No progress yet is fine
      } finally {
        setIsLoading(false);
      }
    };

    loadProgress();
  }, [isAuthenticated, chapterId]);

  // Track time on page
  useEffect(() => {
    const interval = setInterval(() => {
      timeOnPageRef.current += 1;
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Save progress function
  const saveProgress = useCallback(
    async (scrollProgress: number, force = false) => {
      if (!isAuthenticated || !chapterId) return;

      const now = Date.now();
      if (!force && now - lastSaveRef.current < saveIntervalMs) return;

      try {
        await api.updateProgress(chapterId, {
          scroll_position: scrollProgress / 100,
          time_spent_seconds: timeOnPageRef.current,
        });
        lastSaveRef.current = now;
        timeOnPageRef.current = 0;
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to save progress');
      }
    },
    [isAuthenticated, chapterId, saveIntervalMs]
  );

  // Track scroll position
  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const scrollProgress = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;

      setProgress(scrollProgress);

      // Debounced save
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      debounceTimerRef.current = setTimeout(() => {
        saveProgress(scrollProgress);
      }, debounceMs);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [debounceMs, saveProgress]);

  // Save on unmount
  useEffect(() => {
    return () => {
      if (isAuthenticated && chapterId) {
        // Force save on unmount
        saveProgress(progress, true);
      }
    };
  }, [isAuthenticated, chapterId, progress, saveProgress]);

  // Mark chapter as complete
  const markComplete = useCallback(async () => {
    if (!isAuthenticated || !chapterId) return;

    setIsLoading(true);
    try {
      const response = await api.updateProgress(chapterId, {
        scroll_position: 1,
      });
      setIsCompleted(true);
      setProgress(100);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to mark complete');
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, chapterId]);

  return {
    progress,
    isCompleted,
    totalTimeSeconds,
    isLoading,
    error,
    markComplete,
  };
}

export default useReadingProgress;
