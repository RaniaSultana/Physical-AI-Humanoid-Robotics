/**
 * PersonalizationControls Component (T123)
 *
 * Main component for controlling content personalization.
 * Allows users to specify interests and switch between original/personalized content.
 */

import React, { useState, useCallback, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { InterestInput } from './InterestInput';
import { VersionSwitcher } from './VersionSwitcher';
import styles from './styles.module.css';

type ContentVersion = 'original' | 'personalized';

interface PersonalizationControlsProps {
  chapterId: string;
  chapterTitle: string;
  originalContent: string;
  onContentChange?: (content: string, version: ContentVersion) => void;
}

export function PersonalizationControls({
  chapterId,
  chapterTitle,
  originalContent,
  onContentChange,
}: PersonalizationControlsProps): JSX.Element {
  const { isAuthenticated, user } = useAuth();

  const [isExpanded, setIsExpanded] = useState(false);
  const [currentVersion, setCurrentVersion] = useState<ContentVersion>('original');
  const [interests, setInterests] = useState<string[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [personalizedContent, setPersonalizedContent] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [personalizationInfo, setPersonalizationInfo] = useState<{
    interests?: string[];
    createdAt?: string;
  } | null>(null);

  // Fetch interest suggestions when component mounts
  useEffect(() => {
    if (isAuthenticated && chapterId) {
      // Use static suggestions for now - could be fetched from API
      const defaultSuggestions = [
        'Practical applications',
        'Industry examples',
        'Hands-on projects',
        'Mathematical foundations',
        'Real-world case studies',
        'Code implementations',
        'Historical context',
        'Future trends',
      ];
      setSuggestions(defaultSuggestions);
    }
  }, [isAuthenticated, chapterId]);

  // Handle version switching
  const handleVersionChange = useCallback(
    (version: ContentVersion) => {
      setCurrentVersion(version);
      if (version === 'original') {
        onContentChange?.(originalContent, 'original');
      } else if (personalizedContent) {
        onContentChange?.(personalizedContent, 'personalized');
      }
    },
    [originalContent, personalizedContent, onContentChange]
  );

  // Generate personalized content
  const handlePersonalize = useCallback(async () => {
    if (!isAuthenticated || interests.length === 0) {
      setError('Please add at least one interest to personalize content');
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      const response = await fetch('http://localhost:8000/api/v1/personalization/personalize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('ai_textbook_token')}`,
        },
        body: JSON.stringify({
          chapter_id: chapterId,
          content: originalContent,
          title: chapterTitle,
          interests,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to personalize content');
      }

      const data = await response.json();
      setPersonalizedContent(data.personalized_content);
      setPersonalizationInfo({
        interests: interests,
        createdAt: new Date().toISOString(),
      });
      setCurrentVersion('personalized');
      onContentChange?.(data.personalized_content, 'personalized');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Personalization failed');
    } finally {
      setIsGenerating(false);
    }
  }, [isAuthenticated, interests, chapterId, originalContent, chapterTitle, onContentChange]);

  // Check if user has set their background
  const hasBackground = user?.background_type;

  if (!isAuthenticated) {
    return (
      <div className={styles.container}>
        <div className={styles.loginPrompt}>
          <span className={styles.icon}>✨</span>
          <span>Log in to personalize this content</span>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Header / Toggle */}
      <button
        type="button"
        className={styles.header}
        onClick={() => setIsExpanded(!isExpanded)}
        aria-expanded={isExpanded}
      >
        <span className={styles.headerIcon}>✨</span>
        <span className={styles.headerTitle}>Personalize Content</span>
        <span className={styles.expandIcon}>{isExpanded ? '▼' : '▶'}</span>
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <div className={styles.content}>
          {!hasBackground && (
            <div className={styles.warning}>
              <span className={styles.warningIcon}>⚠️</span>
              <span>
                Set your background in{' '}
                <a href="/dashboard">Settings</a> for better personalization
              </span>
            </div>
          )}

          {/* Interest Input */}
          <div className={styles.section}>
            <label className={styles.label}>
              What aspects interest you most?
            </label>
            <InterestInput
              value={interests}
              onChange={setInterests}
              suggestions={suggestions}
              maxInterests={5}
              placeholder="e.g., robotics applications, code examples..."
              disabled={isGenerating}
            />
          </div>

          {/* Generate Button */}
          <div className={styles.actions}>
            <button
              type="button"
              className={styles.generateButton}
              onClick={handlePersonalize}
              disabled={isGenerating || interests.length === 0}
            >
              {isGenerating ? (
                <>
                  <span className={styles.spinner} />
                  Generating...
                </>
              ) : (
                <>
                  <span className={styles.buttonIcon}>✨</span>
                  {personalizedContent ? 'Regenerate' : 'Personalize'}
                </>
              )}
            </button>
          </div>

          {/* Version Switcher */}
          <div className={styles.versionSection}>
            <VersionSwitcher
              currentVersion={currentVersion}
              onVersionChange={handleVersionChange}
              hasPersonalized={!!personalizedContent}
              isGenerating={isGenerating}
              personalizationInfo={personalizationInfo || undefined}
            />
          </div>

          {/* Error Message */}
          {error && <div className={styles.error}>{error}</div>}
        </div>
      )}
    </div>
  );
}

export default PersonalizationControls;
