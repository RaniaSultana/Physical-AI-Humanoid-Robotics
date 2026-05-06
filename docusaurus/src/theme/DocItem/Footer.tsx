/**
 * Custom DocItem Footer that adds a "Test My Knowledge" button at the end of chapters.
 *
 * This component wraps the original DocItem Footer and adds a quiz trigger button.
 * Works for all users without requiring authentication.
 */

import React, { useState, useCallback } from 'react';
import Footer from '@theme-original/DocItem/Footer';
import type { WrapperProps } from '@docusaurus/types';
import { useLocation } from '@docusaurus/router';
import QuizPanel from '../../components/QuizPanel';
import styles from './Footer.module.css';

type Props = WrapperProps<typeof Footer>;

/**
 * Extract chapter information from the URL path.
 */
function useChapterInfo(): { slug: string; title: string } | null {
  const location = useLocation();
  const path = location.pathname;

  // Only show on chapter pages (week-XX paths)
  if (!path.match(/^\/week-\d+/)) {
    return null;
  }

  // Extract slug from path
  const slug = path.replace(/^\//, '').replace(/\/$/, '');

  // Generate a readable title from the slug
  const title = slug
    .split('/')
    .pop()
    ?.replace(/-/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase()) || 'This Chapter';

  return { slug, title };
}

export default function FooterWrapper(props: Props): JSX.Element {
  const chapterInfo = useChapterInfo();
  const [showQuiz, setShowQuiz] = useState(false);
  const [quizGenerated, setQuizGenerated] = useState(false);

  const handleStartQuiz = useCallback(() => {
    setShowQuiz(true);
    setQuizGenerated(true);
  }, []);

  const handleCloseQuiz = useCallback(() => {
    setShowQuiz(false);
  }, []);

  // Don't show the quiz button if not on a docs page
  if (!chapterInfo) {
    return <Footer {...props} />;
  }

  return (
    <>
      <Footer {...props} />

      {/* Test My Knowledge Section */}
      <div className={styles.quizSection}>
        <div className={styles.quizCard}>
          <div className={styles.quizHeader}>
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className={styles.quizIcon}
            >
              <path d="M9 11l3 3L22 4" />
              <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
            </svg>
            <h3 className={styles.quizTitle}>Test Your Knowledge</h3>
          </div>

          <p className={styles.quizDescription}>
            Ready to check your understanding? Take a quick AI-generated quiz based on this chapter's content.
          </p>

          <button onClick={handleStartQuiz} className={styles.quizButton}>
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
            {quizGenerated ? 'Take Quiz Again' : 'Start Quiz'}
          </button>

          <div className={styles.quizFeatures}>
            <span className={styles.feature}>
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              5-10 questions
            </span>
            <span className={styles.feature}>
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M12 2L2 7l10 5 10-5-10-5z" />
                <path d="M2 17l10 5 10-5" />
                <path d="M2 12l10 5 10-5" />
              </svg>
              AI-generated
            </span>
            <span className={styles.feature}>
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
              Instant feedback
            </span>
          </div>
        </div>
      </div>

      {/* Quiz Panel Modal */}
      {showQuiz && chapterInfo && (
        <QuizPanel
          chapterSlug={chapterInfo.slug}
          chapterTitle={chapterInfo.title}
          onClose={handleCloseQuiz}
        />
      )}
    </>
  );
}
