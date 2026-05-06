/**
 * ChapterList Component (T109)
 *
 * Displays a list of chapters for authoring management.
 * Supports drag-and-drop reordering, publishing, and editing.
 */

import React, { useState, useCallback } from 'react';
import styles from './ChapterList.module.css';

interface Chapter {
  id: string;
  week_number: number;
  module_number: number;
  chapter_number: number;
  slug: string;
  title: string;
  word_count: number | null;
  estimated_read_time: number | null;
  status: 'draft' | 'published';
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

interface ChapterListProps {
  chapters: Chapter[];
  onEdit?: (chapter: Chapter) => void;
  onPublish?: (chapterId: string) => void;
  onUnpublish?: (chapterId: string) => void;
  onDelete?: (chapterId: string) => void;
  onReorder?: (chapters: { chapter_id: string; new_week_number: number; new_module_number: number; new_chapter_number: number }[]) => void;
  isLoading?: boolean;
}

interface GroupedChapters {
  [week: number]: {
    [module: number]: Chapter[];
  };
}

export default function ChapterList({
  chapters,
  onEdit,
  onPublish,
  onUnpublish,
  onDelete,
  isLoading = false,
}: ChapterListProps): JSX.Element {
  const [expandedWeeks, setExpandedWeeks] = useState<Set<number>>(new Set([1]));
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // Group chapters by week and module
  const groupedChapters = chapters.reduce<GroupedChapters>((acc, chapter) => {
    if (!acc[chapter.week_number]) {
      acc[chapter.week_number] = {};
    }
    if (!acc[chapter.week_number][chapter.module_number]) {
      acc[chapter.week_number][chapter.module_number] = [];
    }
    acc[chapter.week_number][chapter.module_number].push(chapter);
    return acc;
  }, {});

  // Sort chapters within each module
  Object.values(groupedChapters).forEach((modules) => {
    Object.values(modules).forEach((chapterList) => {
      chapterList.sort((a, b) => a.chapter_number - b.chapter_number);
    });
  });

  const toggleWeek = useCallback((week: number) => {
    setExpandedWeeks((prev) => {
      const next = new Set(prev);
      if (next.has(week)) {
        next.delete(week);
      } else {
        next.add(week);
      }
      return next;
    });
  }, []);

  const handleDelete = useCallback(
    (chapterId: string) => {
      if (deleteConfirm === chapterId) {
        onDelete?.(chapterId);
        setDeleteConfirm(null);
      } else {
        setDeleteConfirm(chapterId);
        // Reset confirm state after 3 seconds
        setTimeout(() => setDeleteConfirm(null), 3000);
      }
    },
    [deleteConfirm, onDelete]
  );

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  if (isLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>
          <div className={styles.spinner} />
          <span>Loading chapters...</span>
        </div>
      </div>
    );
  }

  if (chapters.length === 0) {
    return (
      <div className={styles.container}>
        <div className={styles.empty}>
          <div className={styles.emptyIcon}>📚</div>
          <h3>No chapters yet</h3>
          <p>Create your first chapter to get started.</p>
        </div>
      </div>
    );
  }

  const weeks = Object.keys(groupedChapters)
    .map(Number)
    .sort((a, b) => a - b);

  return (
    <div className={styles.container}>
      {weeks.map((week) => (
        <div key={week} className={styles.weekGroup}>
          <button
            className={styles.weekHeader}
            onClick={() => toggleWeek(week)}
            aria-expanded={expandedWeeks.has(week)}
          >
            <span className={styles.weekTitle}>
              <span className={styles.expandIcon}>
                {expandedWeeks.has(week) ? '▼' : '▶'}
              </span>
              Week {week}
            </span>
            <span className={styles.weekStats}>
              {Object.values(groupedChapters[week]).flat().length} chapters
            </span>
          </button>

          {expandedWeeks.has(week) && (
            <div className={styles.weekContent}>
              {Object.keys(groupedChapters[week])
                .map(Number)
                .sort((a, b) => a - b)
                .map((module) => (
                  <div key={module} className={styles.moduleGroup}>
                    <div className={styles.moduleHeader}>
                      Module {module}
                    </div>
                    <div className={styles.chapterList}>
                      {groupedChapters[week][module].map((chapter) => (
                        <div key={chapter.id} className={styles.chapterItem}>
                          <div className={styles.chapterInfo}>
                            <div className={styles.chapterTitle}>
                              <span className={styles.chapterNumber}>
                                {chapter.chapter_number}.
                              </span>
                              {chapter.title}
                            </div>
                            <div className={styles.chapterMeta}>
                              <span
                                className={`${styles.status} ${
                                  chapter.status === 'published'
                                    ? styles.published
                                    : styles.draft
                                }`}
                              >
                                {chapter.status}
                              </span>
                              {chapter.word_count && (
                                <span className={styles.metaItem}>
                                  {chapter.word_count} words
                                </span>
                              )}
                              {chapter.estimated_read_time && (
                                <span className={styles.metaItem}>
                                  ~{chapter.estimated_read_time} min
                                </span>
                              )}
                              <span className={styles.metaItem}>
                                Updated {formatDate(chapter.updated_at)}
                              </span>
                            </div>
                          </div>

                          <div className={styles.chapterActions}>
                            <button
                              className={styles.actionButton}
                              onClick={() => onEdit?.(chapter)}
                              title="Edit chapter"
                            >
                              ✏️
                            </button>
                            {chapter.status === 'draft' ? (
                              <button
                                className={`${styles.actionButton} ${styles.publishButton}`}
                                onClick={() => onPublish?.(chapter.id)}
                                title="Publish chapter"
                              >
                                🚀
                              </button>
                            ) : (
                              <button
                                className={`${styles.actionButton} ${styles.unpublishButton}`}
                                onClick={() => onUnpublish?.(chapter.id)}
                                title="Unpublish chapter"
                              >
                                📥
                              </button>
                            )}
                            <button
                              className={`${styles.actionButton} ${styles.deleteButton}`}
                              onClick={() => handleDelete(chapter.id)}
                              title={
                                deleteConfirm === chapter.id
                                  ? 'Click again to confirm delete'
                                  : 'Delete chapter'
                              }
                            >
                              {deleteConfirm === chapter.id ? '⚠️' : '🗑️'}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
