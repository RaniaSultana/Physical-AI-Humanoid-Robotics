/**
 * HighlightAsk component - enables contextual Q&A on selected text.
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useLocation } from '@docusaurus/router';
import { useTextSelection } from './useTextSelection';
import { api } from '../../services/api';
import styles from './styles.module.css';

interface HighlightAskProps {
  onAskQuestion?: (question: string, selectedText: string) => void;
}

export function HighlightAsk({ onAskQuestion }: HighlightAskProps): JSX.Element | null {
  const { selection, clearSelection } = useTextSelection();
  const location = useLocation();
  const [isExpanded, setIsExpanded] = useState(false);
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Extract chapter slug from location
  const getChapterSlug = () => {
    const path = location.pathname;
    // Remove leading slash and trailing slash
    const slug = path.replace(/^\//, '').replace(/\/$/, '');
    return slug || null;
  };

  // Reset state when selection changes
  useEffect(() => {
    setIsExpanded(false);
    setQuestion('');
    setAnswer('');
    setError(null);
  }, [selection?.text]);

  // Focus input when expanded
  useEffect(() => {
    if (isExpanded && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isExpanded]);

  const handleAsk = useCallback(async () => {
    if (!selection?.text || !question.trim()) return;

    setIsLoading(true);
    setError(null);

    try {
      const chapterSlug = getChapterSlug();
      const response = await api.askQuestion({
        question: question.trim(),
        context_mode: 'selection',
        chapter_slug: chapterSlug || undefined,
        selected_text: selection.text,
      });

      setAnswer(response.answer);

      // Also trigger external handler if provided (e.g., to add to chat)
      if (onAskQuestion) {
        onAskQuestion(question.trim(), selection.text);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get answer');
    } finally {
      setIsLoading(false);
    }
  }, [selection?.text, question, onAskQuestion]);

  const handleQuickAction = useCallback(async (actionType: 'explain' | 'simplify' | 'example') => {
    if (!selection?.text) return;

    const questions = {
      explain: `Explain this concept in detail: "${selection.text.slice(0, 100)}..."`,
      simplify: `Explain this in simpler terms: "${selection.text.slice(0, 100)}..."`,
      example: `Give me a practical example for: "${selection.text.slice(0, 100)}..."`,
    };

    setQuestion(questions[actionType]);
    setIsExpanded(true);

    // Immediately ask
    setIsLoading(true);
    setError(null);

    try {
      const chapterSlug = getChapterSlug();
      const response = await api.askQuestion({
        question: questions[actionType],
        context_mode: 'selection',
        chapter_slug: chapterSlug || undefined,
        selected_text: selection.text,
      });

      setAnswer(response.answer);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get answer');
    } finally {
      setIsLoading(false);
    }
  }, [selection?.text]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleAsk();
    }
    if (e.key === 'Escape') {
      clearSelection();
    }
  };

  const handleClose = () => {
    clearSelection();
    setIsExpanded(false);
    setQuestion('');
    setAnswer('');
    setError(null);
  };

  // Don't render if no selection
  if (!selection) {
    return null;
  }

  // Calculate popup position
  const popupStyle: React.CSSProperties = {
    position: 'fixed',
    left: `${Math.max(20, Math.min(selection.position.x, window.innerWidth - 200))}px`,
    top: `${Math.max(20, selection.position.y + window.scrollY)}px`,
    transform: 'translate(-50%, -100%)',
    zIndex: 1100,
  };

  return (
    <div
      className={`highlight-ask-popup ${styles.popup} ${isExpanded ? styles.expanded : ''}`}
      style={popupStyle}
    >
      {!isExpanded ? (
        // Compact toolbar
        <div className={styles.toolbar}>
          <button
            onClick={() => setIsExpanded(true)}
            className={styles.toolbarButton}
            title="Ask a question"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"></circle>
              <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
              <line x1="12" y1="17" x2="12.01" y2="17"></line>
            </svg>
            Ask
          </button>
          <button
            onClick={() => handleQuickAction('explain')}
            className={styles.toolbarButton}
            title="Explain this"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2L2 7l10 5 10-5-10-5z"></path>
              <path d="M2 17l10 5 10-5"></path>
              <path d="M2 12l10 5 10-5"></path>
            </svg>
            Explain
          </button>
          <button
            onClick={() => handleQuickAction('simplify')}
            className={styles.toolbarButton}
            title="Simplify"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
            </svg>
            Simplify
          </button>
          <button
            onClick={() => handleQuickAction('example')}
            className={styles.toolbarButton}
            title="Give example"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
            </svg>
            Example
          </button>
        </div>
      ) : (
        // Expanded panel
        <div className={styles.panel}>
          <div className={styles.panelHeader}>
            <span className={styles.panelTitle}>Ask about selection</span>
            <button onClick={handleClose} className={styles.closeButton}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>

          <div className={styles.selectedText}>
            <span className={styles.selectedLabel}>Selected:</span>
            <p>"{selection.text.slice(0, 150)}{selection.text.length > 150 ? '...' : ''}"</p>
          </div>

          {!answer ? (
            <div className={styles.inputArea}>
              <input
                ref={inputRef}
                type="text"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask a question about this text..."
                disabled={isLoading}
                className={styles.input}
              />
              <button
                onClick={handleAsk}
                disabled={!question.trim() || isLoading}
                className={styles.askButton}
              >
                {isLoading ? (
                  <span className={styles.spinner} />
                ) : (
                  'Ask'
                )}
              </button>
            </div>
          ) : (
            <div className={styles.answerArea}>
              <div className={styles.answerContent}>
                {answer}
              </div>
              <button
                onClick={() => {
                  setAnswer('');
                  setQuestion('');
                }}
                className={styles.newQuestionButton}
              >
                Ask another question
              </button>
            </div>
          )}

          {error && (
            <div className={styles.error}>
              {error}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default HighlightAsk;
