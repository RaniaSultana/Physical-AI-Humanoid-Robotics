/**
 * User Dashboard page - shows learning progress, due cards, recent activity.
 * Works with or without authentication - reads from localStorage for offline data.
 */

import React, { useEffect, useState } from 'react';
import Layout from '@theme/Layout';
import BrowserOnly from '@docusaurus/BrowserOnly';
import { useHistory } from '@docusaurus/router';
import { useAuth } from '../context/AuthContext';
import DueCards from '../components/Dashboard/DueCards';
import { api } from '../services/api';
import styles from './dashboard.module.css';

// Base storage keys - will be combined with user ID for per-user storage
const PROGRESS_STORAGE_KEY_BASE = 'ai_textbook_reading_progress_v3';
const QUIZ_STORAGE_KEY_BASE = 'ai_textbook_quiz_results';

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

// Get user-specific storage keys
function getProgressStorageKey(): string {
  return `${PROGRESS_STORAGE_KEY_BASE}_${getCurrentUserId()}`;
}

function getQuizStorageKey(): string {
  return `${QUIZ_STORAGE_KEY_BASE}_${getCurrentUserId()}`;
}

interface LocalChapterProgress {
  scrollProgress: number;
  timeSpent: number;
  lastRead: string;
  completed: boolean;
}

interface LocalQuizResult {
  chapterSlug: string;
  score: number;
  totalQuestions: number;
  timestamp: string;
}

// Get reading progress from localStorage (user-specific)
function getLocalReadingProgress(): {
  chaptersCompleted: number;
  totalChapters: number;
  percentComplete: number;
  chapters: Record<string, LocalChapterProgress>;
  totalTimeSpent: number;
} {
  try {
    const key = getProgressStorageKey();
    const data = localStorage.getItem(key);
    const chapters: Record<string, LocalChapterProgress> = data ? JSON.parse(data) : {};
    const chapterList = Object.entries(chapters);
    const completed = chapterList.filter(([_, c]) => c.completed).length;
    const totalChapters = 25; // Total chapters in the course
    const totalTimeSpent = chapterList.reduce((sum, [_, c]) => sum + (c.timeSpent || 0), 0);

    return {
      chaptersCompleted: completed,
      totalChapters,
      percentComplete: Math.round((completed / totalChapters) * 100),
      chapters,
      totalTimeSpent,
    };
  } catch (e) {
    console.error('Dashboard: Error reading progress:', e);
    return { chaptersCompleted: 0, totalChapters: 25, percentComplete: 0, chapters: {}, totalTimeSpent: 0 };
  }
}

// Get quiz results from localStorage (user-specific)
function getLocalQuizResults(): LocalQuizResult[] {
  try {
    const key = getQuizStorageKey();
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

// Save quiz result to localStorage (user-specific)
export function saveQuizResult(result: LocalQuizResult): void {
  try {
    const key = getQuizStorageKey();
    const existing = getLocalQuizResults();
    existing.push(result);
    // Keep only last 50 results
    const trimmed = existing.slice(-50);
    localStorage.setItem(key, JSON.stringify(trimmed));
  } catch {
    // Storage might be full
  }
}

interface DashboardData {
  readingProgress: {
    chaptersCompleted: number;
    totalChapters: number;
    percentComplete: number;
    currentChapter: {
      slug: string;
      title: string;
      progress: number;
    } | null;
  };
  quizStats: {
    totalAttempts: number;
    averageScore: number;
    lastQuizDate: string | null;
  };
  flashcardStats: {
    totalCards: number;
    dueToday: number;
    masteredCards: number;
    streakDays: number;
  };
  recentActivity: Array<{
    type: 'read' | 'quiz' | 'flashcard' | 'chat';
    title: string;
    timestamp: string;
    detail?: string;
  }>;

}

function DashboardContent(): JSX.Element {
  const { isAuthenticated, user, isLoading: authLoading } = useAuth();
  const history = useHistory();
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [useLocalData, setUseLocalData] = useState(false);

  // Load local data as fallback (works without login)
  const loadLocalData = () => {
    const localProgress = getLocalReadingProgress();
    const localQuizzes = getLocalQuizResults();

    console.log('Dashboard loadLocalData:');
    console.log('  - localProgress:', localProgress);
    console.log('  - localQuizzes:', localQuizzes);
    console.log('  - chapters count:', Object.keys(localProgress.chapters).length);

    // Calculate quiz stats from local data
    const avgScore = localQuizzes.length > 0
      ? Math.round(localQuizzes.reduce((sum, q) => sum + q.score, 0) / localQuizzes.length)
      : 0;

    // Find most recent chapter with progress
    const chaptersWithProgress = Object.entries(localProgress.chapters)
      .filter(([_, c]) => c.scrollProgress > 0)
      .sort((a, b) => new Date(b[1].lastRead).getTime() - new Date(a[1].lastRead).getTime());

    console.log('  - chaptersWithProgress:', chaptersWithProgress);

    const currentChapter = chaptersWithProgress[0]
      ? {
          slug: chaptersWithProgress[0][0],
          title: chaptersWithProgress[0][0].split('/').pop()?.replace(/-/g, ' ') || 'Continue Reading',
          progress: chaptersWithProgress[0][1].scrollProgress,
        }
      : null;

    // Build recent activity from local data
    const recentActivity: DashboardData['recentActivity'] = [];

    // Add reading activity
    chaptersWithProgress.slice(0, 3).forEach(([slug, progress]) => {
      recentActivity.push({
        type: 'read',
        title: slug.split('/').pop()?.replace(/-/g, ' ') || slug,
        timestamp: progress.lastRead,
        detail: `${Math.round(progress.scrollProgress)}% complete`,
      });
    });

    // Add quiz activity
    localQuizzes.slice(-3).reverse().forEach((quiz) => {
      recentActivity.push({
        type: 'quiz',
        title: quiz.chapterSlug.split('/').pop()?.replace(/-/g, ' ') || 'Quiz',
        timestamp: quiz.timestamp,
        detail: `Score: ${quiz.score}%`,
      });
    });

    // Sort by timestamp
    recentActivity.sort((a, b) =>
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    setData({
      readingProgress: {
        chaptersCompleted: localProgress.chaptersCompleted,
        totalChapters: localProgress.totalChapters,
        percentComplete: localProgress.percentComplete,
        currentChapter,
      },
      quizStats: {
        totalAttempts: localQuizzes.length,
        averageScore: avgScore,
        lastQuizDate: localQuizzes.length > 0 ? localQuizzes[localQuizzes.length - 1].timestamp : null,
      },
      flashcardStats: {
        totalCards: 0,
        dueToday: 0,
        masteredCards: 0,
        streakDays: 0,
      },
      recentActivity: recentActivity.slice(0, 5),
    });
    setUseLocalData(true);
    setIsLoading(false);
  };

  // Always use localStorage for reading progress and quizzes (tracked client-side)
  useEffect(() => {
    if (!authLoading) {
      // Always load from localStorage - this is where reading progress and quizzes are stored
      loadLocalData();
    }
  }, [authLoading]);

  // Refresh data when window gains focus (user returns to dashboard)
  useEffect(() => {
    const handleFocus = () => {
      loadLocalData();
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, []);

  if (authLoading || isLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>
          <span className={styles.spinner} />
          Loading...
        </div>
      </div>
    );
  }

  const handleStartReview = (deckId?: string) => {
    if (deckId) {
      history.push(`/flashcards/${deckId}`);
    } else {
      history.push('/flashcards');
    }
  };

  const handleContinueReading = () => {
    if (data?.readingProgress.currentChapter) {
      // Slug is already the full path like "week-01/module-01/introduction"
      history.push(`/${data.readingProgress.currentChapter.slug}`);
    }
  };

  const handleRefresh = () => {
    loadLocalData();
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <h1 className={styles.title}>
            Welcome{isAuthenticated ? ' back' : ''}, {user?.display_name || 'Learner'}!
          </h1>
          <p className={styles.subtitle}>
            Here's your learning progress at a glance
            {useLocalData && !isAuthenticated && (
              <span className={styles.localDataNote}> (stored locally on this device)</span>
            )}
          </p>
        </div>
        <div className={styles.headerActions}>
          <button onClick={handleRefresh} className={styles.refreshButton} title="Refresh data">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M23 4v6h-6"></path>
              <path d="M1 20v-6h6"></path>
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
            </svg>
          </button>
          {user?.background_type && (
            <span className={styles.backgroundBadge}>
              {user.background_type.replace('_', ' ')}
            </span>
          )}
        </div>
      </header>

      {error && (
        <div className={styles.error}>
          {error}
        </div>
      )}

      {isLoading ? (
        <div className={styles.loading}>
          <span className={styles.spinner} />
          Loading dashboard...
        </div>
      ) : data && (
        <div className={styles.grid}>
          {/* Reading Progress Card */}
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className={styles.cardIcon}
              >
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
              </svg>
              <h2>Reading Progress</h2>
            </div>
            <div className={styles.progressRing}>
              <svg viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="none"
                  stroke="var(--ifm-color-emphasis-200)"
                  strokeWidth="8"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="none"
                  stroke="var(--ifm-color-primary)"
                  strokeWidth="8"
                  strokeDasharray={`${data.readingProgress.percentComplete * 2.51} 251`}
                  strokeLinecap="round"
                  transform="rotate(-90 50 50)"
                />
              </svg>
              <div className={styles.progressText}>
                <span className={styles.progressValue}>
                  {data.readingProgress.percentComplete}%
                </span>
                <span className={styles.progressLabel}>Complete</span>
              </div>
            </div>
            <p className={styles.cardStat}>
              {data.readingProgress.chaptersCompleted} of {data.readingProgress.totalChapters} chapters
            </p>
            {data.readingProgress.currentChapter && (
              <button
                onClick={handleContinueReading}
                className={styles.cardAction}
              >
                Continue: {data.readingProgress.currentChapter.title}
              </button>
            )}
          </div>

          {/* Due Cards */}
          <DueCards onStartReview={handleStartReview} />

          {/* Quiz Stats Card */}
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className={styles.cardIcon}
              >
                <path d="M9 11l3 3L22 4" />
                <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
              </svg>
              <h2>Quiz Performance</h2>
            </div>
            <div className={styles.statsRow}>
              <div className={styles.stat}>
                <span className={styles.statValue}>{data.quizStats.totalAttempts}</span>
                <span className={styles.statLabel}>Quizzes Taken</span>
              </div>
              <div className={styles.stat}>
                <span className={styles.statValue}>{data.quizStats.averageScore}%</span>
                <span className={styles.statLabel}>Avg Score</span>
              </div>
            </div>
            {data.quizStats.lastQuizDate && (
              <p className={styles.cardMeta}>
                Last quiz: {new Date(data.quizStats.lastQuizDate).toLocaleDateString()}
              </p>
            )}
          </div>

          {/* Recent Activity */}
          <div className={`${styles.card} ${styles.activityCard}`}>
            <div className={styles.cardHeader}>
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className={styles.cardIcon}
              >
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
              </svg>
              <h2>Recent Activity</h2>
            </div>
            {data.recentActivity.length > 0 ? (
              <ul className={styles.activityList}>
                {data.recentActivity.slice(0, 5).map((activity, index) => (
                  <li key={index} className={styles.activityItem}>
                    <span className={`${styles.activityIcon} ${styles[activity.type]}`}>
                      {activity.type === 'read' && '📖'}
                      {activity.type === 'quiz' && '✅'}
                      {activity.type === 'flashcard' && '🎴'}
                      {activity.type === 'chat' && '💬'}
                    </span>
                    <div className={styles.activityContent}>
                      <span className={styles.activityTitle}>{activity.title}</span>
                      {activity.detail && (
                        <span className={styles.activityDetail}>{activity.detail}</span>
                      )}
                    </div>
                    <span className={styles.activityTime}>
                      {formatRelativeTime(activity.timestamp)}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <div className={styles.emptyState}>
                <p>No recent activity yet.</p>
                <a href="/week-01/module-01/introduction" className={styles.startLink}>
                  Start reading Week 1 →
                </a>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function formatRelativeTime(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

export default function DashboardPage(): JSX.Element {
  return (
    <Layout
      title="Dashboard"
      description="Track your learning progress and upcoming reviews"
    >
      <BrowserOnly fallback={
        <div className={styles.container}>
          <div className={styles.loading}>
            <span className={styles.spinner} />
            Loading...
          </div>
        </div>
      }>
        {() => <DashboardContent />}
      </BrowserOnly>
    </Layout>
  );
}


