/**
 * Citation component for displaying source references.
 */

import React from 'react';
import Link from '@docusaurus/Link';
import styles from './styles.module.css';

export interface CitationProps {
  chapterSlug: string;
  sectionTitle: string;
  contentPreview: string;
  relevanceScore: number;
  index: number;
}

export function Citation({
  chapterSlug,
  sectionTitle,
  contentPreview,
  relevanceScore,
  index,
}: CitationProps): JSX.Element {
  // Build the link to the chapter
  const chapterLink = `/docs/${chapterSlug}`;

  // Format relevance as percentage
  const relevancePercent = Math.round(relevanceScore * 100);

  return (
    <div className={styles.citation}>
      <div className={styles.citationHeader}>
        <span className={styles.citationIndex}>[{index}]</span>
        <Link to={chapterLink} className={styles.citationLink}>
          {sectionTitle}
        </Link>
        <span className={styles.relevanceBadge} title="Relevance score">
          {relevancePercent}%
        </span>
      </div>
      <p className={styles.citationPreview}>
        {contentPreview.length > 150
          ? `${contentPreview.slice(0, 150)}...`
          : contentPreview}
      </p>
    </div>
  );
}

export interface CitationListProps {
  citations: Array<{
    chapter_slug: string;
    section_title: string;
    content_preview: string;
    relevance_score: number;
  }>;
}

export function CitationList({ citations }: CitationListProps): JSX.Element | null {
  if (!citations || citations.length === 0) {
    return null;
  }

  return (
    <div className={styles.citationList}>
      <h4 className={styles.citationListTitle}>Sources</h4>
      {citations.map((citation, index) => (
        <Citation
          key={`${citation.chapter_slug}-${index}`}
          chapterSlug={citation.chapter_slug}
          sectionTitle={citation.section_title}
          contentPreview={citation.content_preview}
          relevanceScore={citation.relevance_score}
          index={index + 1}
        />
      ))}
    </div>
  );
}

export default Citation;
