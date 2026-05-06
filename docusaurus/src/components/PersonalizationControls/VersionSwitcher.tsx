/**
 * VersionSwitcher Component (T125)
 *
 * Toggle between original and personalized content versions.
 */

import React from 'react';
import clsx from 'clsx';
import styles from './styles.module.css';

type ContentVersion = 'original' | 'personalized';

interface VersionSwitcherProps {
  currentVersion: ContentVersion;
  onVersionChange: (version: ContentVersion) => void;
  hasPersonalized: boolean;
  isGenerating?: boolean;
  personalizationInfo?: {
    interests?: string[];
    createdAt?: string;
  };
}

export function VersionSwitcher({
  currentVersion,
  onVersionChange,
  hasPersonalized,
  isGenerating = false,
  personalizationInfo,
}: VersionSwitcherProps): JSX.Element {
  return (
    <div className={styles.versionSwitcherContainer}>
      <div className={styles.versionToggle}>
        <button
          type="button"
          className={clsx(styles.versionButton, {
            [styles.active]: currentVersion === 'original',
          })}
          onClick={() => onVersionChange('original')}
          disabled={isGenerating}
        >
          <span className={styles.versionIcon}>📄</span>
          Original
        </button>
        <button
          type="button"
          className={clsx(styles.versionButton, {
            [styles.active]: currentVersion === 'personalized',
            [styles.disabled]: !hasPersonalized && !isGenerating,
          })}
          onClick={() => hasPersonalized && onVersionChange('personalized')}
          disabled={!hasPersonalized || isGenerating}
        >
          <span className={styles.versionIcon}>
            {isGenerating ? (
              <span className={styles.spinner} />
            ) : (
              '✨'
            )}
          </span>
          {isGenerating ? 'Generating...' : 'Personalized'}
        </button>
      </div>

      {currentVersion === 'personalized' && personalizationInfo && (
        <div className={styles.personalizationMeta}>
          {personalizationInfo.interests && personalizationInfo.interests.length > 0 && (
            <div className={styles.metaRow}>
              <span className={styles.metaLabel}>Based on:</span>
              <span className={styles.metaValue}>
                {personalizationInfo.interests.join(', ')}
              </span>
            </div>
          )}
          {personalizationInfo.createdAt && (
            <div className={styles.metaRow}>
              <span className={styles.metaLabel}>Generated:</span>
              <span className={styles.metaValue}>
                {new Date(personalizationInfo.createdAt).toLocaleDateString()}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default VersionSwitcher;
