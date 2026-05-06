/**
 * ChapterNav component for navigating between chapters.
 */

import React from 'react';
import Link from '@docusaurus/Link';
import styles from './styles.module.css';

interface ChapterInfo {
  slug: string;
  title: string;
}

interface ChapterNavProps {
  previous?: ChapterInfo;
  next?: ChapterInfo;
  currentChapter: string;
}

export default function ChapterNav({ previous, next, currentChapter }: ChapterNavProps) {
  return (
    <nav className={styles.chapterNav} aria-label="Chapter navigation">
      <div className={styles.navContainer}>
        {previous ? (
          <Link to={`/${previous.slug}`} className={styles.navLink}>
            <span className={styles.navLabel}>Previous</span>
            <span className={styles.navTitle}>{previous.title}</span>
          </Link>
        ) : (
          <div className={styles.navPlaceholder} />
        )}

        <div className={styles.currentChapter}>
          <span className={styles.currentLabel}>Current Chapter</span>
          <span className={styles.currentTitle}>{currentChapter}</span>
        </div>

        {next ? (
          <Link to={`/${next.slug}`} className={styles.navLink}>
            <span className={styles.navLabel}>Next</span>
            <span className={styles.navTitle}>{next.title}</span>
          </Link>
        ) : (
          <div className={styles.navPlaceholder} />
        )}
      </div>
    </nav>
  );
}
