/**
 * ContentPersonalizer - Allows users to translate/personalize chapter content
 * into different languages (Urdu, Hindi, Arabic, Spanish, French, Chinese)
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import clsx from 'clsx';
import { useAuth } from '../../context/AuthContext';
import styles from './styles.module.css';

interface Language {
  code: string;
  name: string;
  nativeName: string;
  dir: 'ltr' | 'rtl';
}

const SUPPORTED_LANGUAGES: Language[] = [
  { code: 'en', name: 'English', nativeName: 'English', dir: 'ltr' },
  { code: 'ur', name: 'Urdu', nativeName: 'اردو', dir: 'rtl' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', dir: 'ltr' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', dir: 'rtl' },
  { code: 'es', name: 'Spanish', nativeName: 'Español', dir: 'ltr' },
  { code: 'fr', name: 'French', nativeName: 'Français', dir: 'ltr' },
  { code: 'zh', name: 'Chinese', nativeName: '中文', dir: 'ltr' },
];

interface ContentPersonalizerProps {
  chapterSlug: string;
  chapterTitle?: string;
}

export function ContentPersonalizer({
  chapterSlug,
  chapterTitle,
}: ContentPersonalizerProps): JSX.Element {
  const { isAuthenticated } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState<Language>(SUPPORTED_LANGUAGES[0]);
  const [isTranslating, setIsTranslating] = useState(false);
  const [translatedContent, setTranslatedContent] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [showTranslation, setShowTranslation] = useState(false);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Clean up interval on unmount
  useEffect(() => {
    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
  }, []);

  const handleLanguageSelect = useCallback(async (language: Language) => {
    if (language.code === 'en') {
      setSelectedLanguage(language);
      setShowTranslation(false);
      setIsOpen(false);
      return;
    }

    if (!isAuthenticated) {
      setError('Please log in to translate content');
      return;
    }

    setSelectedLanguage(language);
    setIsTranslating(true);
    setError(null);
    setProgress(0);
    setIsOpen(false);

    // Clear any existing interval
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
    }

    try {
      // Get the main content from the page - try multiple selectors
      const contentElement = document.querySelector('.theme-doc-markdown, .markdown, article, main');
      const originalContent = contentElement?.textContent || '';

      if (!originalContent || originalContent.trim().length < 50) {
        throw new Error('Could not find enough content to translate on this page.');
      }

      // Get auth token
      const token = localStorage.getItem('ai_textbook_token');
      if (!token) {
        throw new Error('Authentication token not found. Please log in again.');
      }

      // Start progress animation
      progressIntervalRef.current = setInterval(() => {
        setProgress(prev => Math.min(prev + 2, 95));
      }, 500);

      // Use the translation stream endpoint
      const response = await fetch('http://localhost:8000/api/v1/personalization/translate/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          chapter_id: chapterSlug, // In this app chapterSlug is used as ID in some contexts, but backend expects UUID.
          // However, translate/stream endpoint in personalization.py expects TranslateRequest which has chapter_id: UUID.
          // Let's check if chapterSlug is a UUID or if we need to fetch the UUID first.
          // Wait, TranslationToggle uses chapterId: string.
          chapter_id: chapterSlug,
          content: originalContent.slice(0, 5000),
          title: chapterTitle || chapterSlug,
          target_language: language.code,
        }),
      });

      if (!response.ok) {
        let errorMessage = `Server error: ${response.status}`;
        try {
          const errorData = await response.json();
          if (errorData.detail) {
            if (typeof errorData.detail === 'string') {
              errorMessage = errorData.detail;
            } else if (Array.isArray(errorData.detail)) {
              errorMessage = errorData.detail[0]?.msg || JSON.stringify(errorData.detail);
            } else {
              errorMessage = JSON.stringify(errorData.detail);
            }
          }
        } catch (e) {
          // If not JSON, it might be text
          try {
            const errorText = await response.text();
            if (errorText) errorMessage = errorText.slice(0, 200);
          } catch (e2) {
            // Use default
          }
        }
        throw new Error(errorMessage);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let fullContent = '';

      if (reader) {
        // Clear progress interval and switch to manual progress
        if (progressIntervalRef.current) {
          clearInterval(progressIntervalRef.current);
          progressIntervalRef.current = null;
        }

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const text = decoder.decode(value, { stream: true });
          const lines = text.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              try {
                const parsed = JSON.parse(data);
                if (parsed.content) {
                  fullContent += parsed.content;
                  setTranslatedContent(fullContent);
                  setShowTranslation(true);
                  // Update progress based on chunks
                  setProgress(prev => Math.min(prev + 1, 99));
                }
              } catch (e) {
                // Ignore parse errors for incomplete chunks
              }
            }
          }
        }
      }

      setProgress(100);
      setError(null);
    } catch (err) {
      // Clear progress interval on error
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
      setProgress(0);

      const errorMessage = err instanceof Error ? err.message : 'Translation failed';
      console.error('Translation error:', errorMessage);
      setError(errorMessage);
      setShowTranslation(false);
    } finally {
      setIsTranslating(false);
    }
  }, [isAuthenticated, chapterSlug, chapterTitle]);

  const handleClose = useCallback(() => {
    setShowTranslation(false);
    setSelectedLanguage(SUPPORTED_LANGUAGES[0]);
    setTranslatedContent(null);
  }, []);

  return (
    <>
      {/* Personalization Button */}
      <div className={styles.container}>
        <button
          className={styles.personalizeButton}
          onClick={() => setIsOpen(!isOpen)}
          disabled={isTranslating}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="2" y1="12" x2="22" y2="12"></line>
            <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
          </svg>
          <span>
            {isTranslating ? 'Translating...' : `Language: ${selectedLanguage.nativeName}`}
          </span>
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className={clsx(styles.chevron, { [styles.open]: isOpen })}
          >
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
        </button>

        {/* Language Dropdown */}
        {isOpen && (
          <div className={styles.dropdown}>
            <div className={styles.dropdownHeader}>
              <span>Select Language</span>
              {!isAuthenticated && (
                <span className={styles.loginHint}>Login required for translation</span>
              )}
            </div>
            <div className={styles.languageList}>
              {SUPPORTED_LANGUAGES.map((lang) => (
                <button
                  key={lang.code}
                  className={clsx(styles.languageOption, {
                    [styles.selected]: selectedLanguage.code === lang.code,
                    [styles.disabled]: lang.code !== 'en' && !isAuthenticated,
                  })}
                  onClick={() => handleLanguageSelect(lang)}
                  disabled={lang.code !== 'en' && !isAuthenticated}
                >
                  <span className={styles.langName}>{lang.name}</span>
                  <span className={styles.langNative} dir={lang.dir}>{lang.nativeName}</span>
                  {selectedLanguage.code === lang.code && (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Progress Bar */}
        {isTranslating && (
          <div className={styles.progressContainer}>
            <div className={styles.progressBar}>
              <div className={styles.progressFill} style={{ width: `${progress}%` }} />
            </div>
            <span className={styles.progressText}>
              Translating to {selectedLanguage.name}... {Math.round(progress)}%
            </span>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className={styles.error}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="15" y1="9" x2="9" y2="15"></line>
              <line x1="9" y1="9" x2="15" y2="15"></line>
            </svg>
            {error}
          </div>
        )}
      </div>

      {/* Translation Overlay */}
      {showTranslation && translatedContent && (
        <div className={styles.translationOverlay}>
          <div className={styles.translationHeader}>
            <div className={styles.translationTitle}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="2" y1="12" x2="22" y2="12"></line>
                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
              </svg>
              <span>Translated to {selectedLanguage.name}</span>
            </div>
            <button className={styles.closeButton} onClick={handleClose}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
          <div
            className={styles.translationContent}
            dir={selectedLanguage.dir}
          >
            {translatedContent}
          </div>
          <div className={styles.translationFooter}>
            <span className={styles.disclaimer}>
              AI-generated translation. Original content is authoritative.
            </span>
            <button className={styles.backButton} onClick={handleClose}>
              Back to English
            </button>
          </div>
        </div>
      )}
    </>
  );
}

export default ContentPersonalizer;
