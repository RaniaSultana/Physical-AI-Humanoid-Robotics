/**
 * QuizResults component for displaying quiz completion results.
 */

import React, { useState } from 'react';
import clsx from 'clsx';
import { QuestionCard } from './QuestionCard';
import styles from './styles.module.css';

interface QuestionResult {
  question_id: string;
  is_correct: boolean;
  correct_option_id: string;
  explanation?: string;
}

interface QuizResult {
  score: number;
  correct_count: number;
  total_count: number;
  time_taken_seconds: number;
  questions: QuestionResult[];
}

interface Quiz {
  id: string;
  title: string;
  questions: Array<{
    id: string;
    question_type: 'mcq' | 'true_false';
    question_text: string;
    options: Array<{
      id: string;
      text: string;
    }>;
    difficulty: string;
  }>;
}

interface QuizResultsProps {
  result: QuizResult;
  quiz: Quiz;
  onRetry?: () => void;
  onClose?: () => void;
}

export function QuizResults({
  result,
  quiz,
  onRetry,
  onClose,
}: QuizResultsProps): JSX.Element {
  const [showReview, setShowReview] = useState(false);
  const [reviewQuestion, setReviewQuestion] = useState(0);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  };

  const getScoreMessage = () => {
    if (result.score >= 90) return { emoji: '🎉', message: 'Excellent!' };
    if (result.score >= 70) return { emoji: '👏', message: 'Great job!' };
    if (result.score >= 50) return { emoji: '👍', message: 'Good effort!' };
    return { emoji: '📚', message: 'Keep studying!' };
  };

  const { emoji, message } = getScoreMessage();

  if (showReview) {
    const question = quiz.questions[reviewQuestion];
    const questionResult = result.questions.find(q => q.question_id === question.id);

    return (
      <div className={styles.panel}>
        <div className={styles.header}>
          <button
            className={styles.backButton}
            onClick={() => setShowReview(false)}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="19" y1="12" x2="5" y2="12"></line>
              <polyline points="12 19 5 12 12 5"></polyline>
            </svg>
            Back to Results
          </button>
        </div>

        <div className={styles.reviewHeader}>
          <span>Question {reviewQuestion + 1} of {quiz.questions.length}</span>
          <span className={clsx(styles.resultBadge, {
            [styles.correct]: questionResult?.is_correct,
            [styles.incorrect]: !questionResult?.is_correct,
          })}>
            {questionResult?.is_correct ? 'Correct' : 'Incorrect'}
          </span>
        </div>

        <QuestionCard
          question={{
            ...question,
            explanation: questionResult?.explanation,
          }}
          onAnswer={() => {}}
          showResult={true}
          correctOptionId={questionResult?.correct_option_id}
        />

        <div className={styles.reviewNavigation}>
          <button
            className={styles.navButton}
            onClick={() => setReviewQuestion(prev => prev - 1)}
            disabled={reviewQuestion === 0}
          >
            Previous
          </button>
          <button
            className={styles.navButton}
            onClick={() => setReviewQuestion(prev => prev + 1)}
            disabled={reviewQuestion === quiz.questions.length - 1}
          >
            Next
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.panel}>
      <div className={styles.resultsContainer}>
        <div className={styles.scoreEmoji}>{emoji}</div>
        <h2 className={styles.scoreMessage}>{message}</h2>

        <div className={styles.scoreCircle}>
          <svg viewBox="0 0 100 100" className={styles.scoreSvg}>
            <circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              stroke="var(--ifm-color-gray-200)"
              strokeWidth="10"
            />
            <circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              stroke="var(--ifm-color-primary)"
              strokeWidth="10"
              strokeDasharray={`${(result.score / 100) * 283} 283`}
              strokeLinecap="round"
              transform="rotate(-90 50 50)"
            />
          </svg>
          <div className={styles.scoreText}>
            <span className={styles.scoreNumber}>{Math.round(result.score)}%</span>
            <span className={styles.scoreLabel}>Score</span>
          </div>
        </div>

        <div className={styles.statsGrid}>
          <div className={styles.statItem}>
            <span className={styles.statValue}>{result.correct_count}</span>
            <span className={styles.statLabel}>Correct</span>
          </div>
          <div className={styles.statItem}>
            <span className={styles.statValue}>{result.total_count - result.correct_count}</span>
            <span className={styles.statLabel}>Incorrect</span>
          </div>
          <div className={styles.statItem}>
            <span className={styles.statValue}>{formatTime(result.time_taken_seconds)}</span>
            <span className={styles.statLabel}>Time</span>
          </div>
        </div>

        <div className={styles.questionSummary}>
          {result.questions.map((q, idx) => (
            <button
              key={q.question_id}
              className={clsx(styles.summaryDot, {
                [styles.correct]: q.is_correct,
                [styles.incorrect]: !q.is_correct,
              })}
              onClick={() => {
                setReviewQuestion(idx);
                setShowReview(true);
              }}
              title={`Question ${idx + 1}: ${q.is_correct ? 'Correct' : 'Incorrect'}`}
            >
              {idx + 1}
            </button>
          ))}
        </div>

        <div className={styles.resultsActions}>
          <button
            className={styles.reviewButton}
            onClick={() => setShowReview(true)}
          >
            Review Answers
          </button>
          {onRetry && (
            <button className={styles.retryButton} onClick={onRetry}>
              Try Again
            </button>
          )}
          {onClose && (
            <button className={styles.closeButton} onClick={onClose}>
              Close
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default QuizResults;
