/**
 * QuestionCard component for displaying a single quiz question.
 */

import React from 'react';
import clsx from 'clsx';
import styles from './styles.module.css';

interface QuestionOption {
  id: string;
  text: string;
  is_correct?: boolean;
}

interface Question {
  id: string;
  question_type: 'mcq' | 'true_false';
  question_text: string;
  options: QuestionOption[];
  difficulty: string;
  explanation?: string;
}

interface QuestionCardProps {
  question: Question;
  selectedAnswer?: string;
  onAnswer: (optionId: string) => void;
  showResult?: boolean;
  correctOptionId?: string;
}

export function QuestionCard({
  question,
  selectedAnswer,
  onAnswer,
  showResult = false,
  correctOptionId,
}: QuestionCardProps): JSX.Element {
  const getOptionClass = (option: QuestionOption) => {
    if (!showResult) {
      return selectedAnswer === option.id ? styles.optionSelected : '';
    }

    // Show results
    if (option.id === correctOptionId) {
      return styles.optionCorrect;
    }
    if (selectedAnswer === option.id && option.id !== correctOptionId) {
      return styles.optionIncorrect;
    }
    return styles.optionDisabled;
  };

  return (
    <div className={styles.questionCard}>
      <div className={styles.questionText}>
        {question.question_text}
      </div>

      <div className={styles.options}>
        {question.options.map((option, index) => (
          <button
            key={option.id}
            className={clsx(styles.option, getOptionClass(option))}
            onClick={() => !showResult && onAnswer(option.id)}
            disabled={showResult}
          >
            <span className={styles.optionLetter}>
              {question.question_type === 'true_false'
                ? ''
                : String.fromCharCode(65 + index)}
            </span>
            <span className={styles.optionText}>{option.text}</span>
            {showResult && option.id === correctOptionId && (
              <svg className={styles.checkIcon} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
            )}
            {showResult && selectedAnswer === option.id && option.id !== correctOptionId && (
              <svg className={styles.xIcon} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            )}
          </button>
        ))}
      </div>

      {showResult && question.explanation && (
        <div className={styles.explanation}>
          <strong>Explanation:</strong> {question.explanation}
        </div>
      )}
    </div>
  );
}

export default QuestionCard;
