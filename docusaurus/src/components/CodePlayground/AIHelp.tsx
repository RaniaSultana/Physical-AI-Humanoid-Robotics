/**
 * AIHelp component - provides AI-assisted debugging and explanations for code errors.
 */

import React, { useState, useCallback } from 'react';
import { api } from '../../services/api';
import styles from './styles.module.css';

interface AIHelpProps {
  /** The code that was executed */
  code: string;
  /** The error message received */
  error: string;
  /** Current chapter slug for context */
  chapterSlug?: string;
  /** Callback when help is dismissed */
  onDismiss: () => void;
  /** Callback when code is suggested */
  onSuggestCode?: (suggestedCode: string) => void;
}

interface AIHelpResponse {
  explanation: string;
  suggestion?: string;
  suggestedCode?: string;
  relatedConcepts?: string[];
}

export function AIHelp({
  code,
  error,
  chapterSlug,
  onDismiss,
  onSuggestCode,
}: AIHelpProps): JSX.Element {
  const [isLoading, setIsLoading] = useState(false);
  const [response, setResponse] = useState<AIHelpResponse | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [hasAsked, setHasAsked] = useState(false);

  const askForHelp = useCallback(async () => {
    setIsLoading(true);
    setApiError(null);
    setHasAsked(true);

    try {
      const result = await api.post<AIHelpResponse>('/chat/code-help', {
        code,
        error,
        chapter_slug: chapterSlug,
      });
      setResponse(result.data);
    } catch (err) {
      setApiError(err instanceof Error ? err.message : 'Failed to get AI help');
    } finally {
      setIsLoading(false);
    }
  }, [code, error, chapterSlug]);

  const handleApplySuggestion = useCallback(() => {
    if (response?.suggestedCode && onSuggestCode) {
      onSuggestCode(response.suggestedCode);
      onDismiss();
    }
  }, [response, onSuggestCode, onDismiss]);

  return (
    <div className={styles.aiHelp}>
      <div className={styles.aiHelpHeader}>
        <div className={styles.aiHelpTitle}>
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="12" cy="12" r="10" />
            <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
          AI Debug Assistant
        </div>
        <button
          onClick={onDismiss}
          className={styles.aiHelpClose}
          aria-label="Dismiss"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      {!hasAsked && (
        <div className={styles.aiHelpPrompt}>
          <p className={styles.aiHelpMessage}>
            Your code encountered an error. Would you like AI assistance to understand
            and fix it?
          </p>
          <div className={styles.aiHelpError}>
            <code>{error}</code>
          </div>
          <button onClick={askForHelp} className={styles.aiHelpButton}>
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            Ask AI for Help
          </button>
        </div>
      )}

      {isLoading && (
        <div className={styles.aiHelpLoading}>
          <span className={styles.aiHelpSpinner} />
          Analyzing your code...
        </div>
      )}

      {apiError && (
        <div className={styles.aiHelpApiError}>
          <p>{apiError}</p>
          <button onClick={askForHelp} className={styles.aiHelpRetry}>
            Try Again
          </button>
        </div>
      )}

      {response && (
        <div className={styles.aiHelpResponse}>
          <div className={styles.aiHelpSection}>
            <h4>What went wrong</h4>
            <p>{response.explanation}</p>
          </div>

          {response.suggestion && (
            <div className={styles.aiHelpSection}>
              <h4>How to fix it</h4>
              <p>{response.suggestion}</p>
            </div>
          )}

          {response.suggestedCode && onSuggestCode && (
            <div className={styles.aiHelpSection}>
              <h4>Suggested fix</h4>
              <div className={styles.aiHelpCodePreview}>
                <pre>
                  <code>{response.suggestedCode}</code>
                </pre>
              </div>
              <button
                onClick={handleApplySuggestion}
                className={styles.aiHelpApply}
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                Apply Fix
              </button>
            </div>
          )}

          {response.relatedConcepts && response.relatedConcepts.length > 0 && (
            <div className={styles.aiHelpSection}>
              <h4>Related concepts</h4>
              <ul className={styles.aiHelpConcepts}>
                {response.relatedConcepts.map((concept, index) => (
                  <li key={index}>{concept}</li>
                ))}
              </ul>
            </div>
          )}

          <div className={styles.aiHelpActions}>
            <button
              onClick={() => {
                setResponse(null);
                setHasAsked(false);
              }}
              className={styles.aiHelpSecondary}
            >
              Ask Different Question
            </button>
            <button onClick={onDismiss} className={styles.aiHelpPrimary}>
              Got It
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default AIHelp;
