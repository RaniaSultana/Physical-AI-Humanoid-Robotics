/**
 * Authoring Dashboard Page (T110)
 *
 * Main dashboard for content authors to manage chapters:
 * - View all chapters (drafts and published)
 * - Create new chapters
 * - Edit existing chapters
 * - Publish/unpublish chapters
 * - Delete chapters
 * - Reorder chapters
 */

import React, { useEffect, useState, useCallback } from 'react';
import Layout from '@theme/Layout';
import { useHistory } from '@docusaurus/router';
import { useAuth } from '../../context/AuthContext';
import ChapterList from '../../components/Authoring/ChapterList';
import MarkdownEditor from '../../components/Authoring/MarkdownEditor';
import { api, Chapter, ChapterTree, CreateChapterRequest } from '../../services/api';
import styles from './authoring.module.css';

type ViewMode = 'list' | 'create' | 'edit';

interface ChapterWithContent extends Chapter {
  content?: string;
}

export default function AuthoringDashboard(): JSX.Element {
  const { isAuthenticated, user, isLoading: authLoading } = useAuth();
  const history = useHistory();

  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [chapters, setChapters] = useState<ChapterWithContent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // For create/edit mode
  const [editingChapter, setEditingChapter] = useState<ChapterWithContent | null>(null);
  const [formData, setFormData] = useState<CreateChapterRequest>({
    week_number: 1,
    module_number: 1,
    chapter_number: 1,
    slug: '',
    title: '',
    content: '',
  });

  // Check author role
  const isAuthor = user?.role === 'author' || (user?.role as string) === 'admin';

  // Redirect if not authenticated or not an author
  useEffect(() => {
    if (!authLoading) {
      if (!isAuthenticated) {
        history.push('/auth/login?redirect=/authoring');
      } else if (!isAuthor) {
        history.push('/dashboard');
      }
    }
  }, [authLoading, isAuthenticated, isAuthor, history]);

  // Fetch chapters
  const fetchChapters = useCallback(async () => {
    if (!isAuthor) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await api.getAuthoringChapters(true);
      // Flatten the tree into a list
      const flatChapters: ChapterWithContent[] = [];
      response.weeks.forEach((week) => {
        week.modules.forEach((module) => {
          module.chapters.forEach((chapter) => {
            flatChapters.push({
              ...chapter,
              week_number: week.week_number,
              module_number: module.module_number,
              word_count: null,
              status: 'published' as const,
              published_at: null,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            });
          });
        });
      });
      setChapters(flatChapters);
    } catch (err) {
      setError('Failed to load chapters');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthor]);

  useEffect(() => {
    if (isAuthor) {
      fetchChapters();
    }
  }, [isAuthor, fetchChapters]);

  // Clear success message after 3 seconds
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  // Handlers
  const handleCreateNew = () => {
    setEditingChapter(null);
    setFormData({
      week_number: 1,
      module_number: 1,
      chapter_number: chapters.length + 1,
      slug: '',
      title: '',
      content: '',
    });
    setViewMode('create');
  };

  const handleEdit = (chapter: ChapterWithContent) => {
    setEditingChapter(chapter);
    setFormData({
      week_number: chapter.week_number,
      module_number: chapter.module_number,
      chapter_number: chapter.chapter_number,
      slug: chapter.slug,
      title: chapter.title,
      content: chapter.content || '',
    });
    setViewMode('edit');
  };

  const handleSave = async (content: string) => {
    setError(null);

    try {
      if (viewMode === 'create') {
        await api.createChapter({ ...formData, content });
        setSuccessMessage('Chapter created successfully!');
      } else if (editingChapter) {
        await api.updateChapter(editingChapter.id, {
          title: formData.title,
          content,
          week_number: formData.week_number,
          module_number: formData.module_number,
          chapter_number: formData.chapter_number,
        });
        setSuccessMessage('Chapter updated successfully!');
      }

      setViewMode('list');
      fetchChapters();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save chapter');
    }
  };

  const handlePublish = async (chapterId: string) => {
    setError(null);

    try {
      await api.publishChapter(chapterId);
      setSuccessMessage('Chapter published successfully!');
      fetchChapters();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to publish chapter');
    }
  };

  const handleUnpublish = async (chapterId: string) => {
    setError(null);

    try {
      await api.unpublishChapter(chapterId);
      setSuccessMessage('Chapter unpublished successfully!');
      fetchChapters();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to unpublish chapter');
    }
  };

  const handleDelete = async (chapterId: string) => {
    setError(null);

    try {
      await api.deleteChapter(chapterId);
      setSuccessMessage('Chapter deleted successfully!');
      fetchChapters();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete chapter');
    }
  };

  const handleCancel = () => {
    setViewMode('list');
    setEditingChapter(null);
    setError(null);
  };

  // Generate slug from title
  const generateSlug = (title: string): string => {
    return `week-${String(formData.week_number).padStart(2, '0')}/module-${String(formData.module_number).padStart(2, '0')}/${title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')}`;
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const title = e.target.value;
    setFormData((prev) => ({
      ...prev,
      title,
      slug: generateSlug(title),
    }));
  };

  if (authLoading || (!isAuthenticated && !error)) {
    return (
      <Layout title="Authoring">
        <div className={styles.container}>
          <div className={styles.loading}>
            <span className={styles.spinner} />
            Loading...
          </div>
        </div>
      </Layout>
    );
  }

  if (!isAuthor) {
    return (
      <Layout title="Authoring">
        <div className={styles.container}>
          <div className={styles.accessDenied}>
            <h2>Access Denied</h2>
            <p>You need author privileges to access this page.</p>
            <button onClick={() => history.push('/dashboard')} className={styles.primaryButton}>
              Go to Dashboard
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Authoring Dashboard" description="Manage your course content">
      <div className={styles.container}>
        {/* Header */}
        <header className={styles.header}>
          <div className={styles.headerContent}>
            <h1 className={styles.title}>Content Management</h1>
            <p className={styles.subtitle}>
              Create, edit, and publish course chapters
            </p>
          </div>
          {viewMode === 'list' && (
            <button onClick={handleCreateNew} className={styles.primaryButton}>
              + New Chapter
            </button>
          )}
          {viewMode !== 'list' && (
            <button onClick={handleCancel} className={styles.secondaryButton}>
              Back to List
            </button>
          )}
        </header>

        {/* Messages */}
        {error && <div className={styles.error}>{error}</div>}
        {successMessage && <div className={styles.success}>{successMessage}</div>}

        {/* Content */}
        {viewMode === 'list' && (
          <div className={styles.listView}>
            <div className={styles.stats}>
              <div className={styles.statCard}>
                <span className={styles.statValue}>{chapters.length}</span>
                <span className={styles.statLabel}>Total Chapters</span>
              </div>
              <div className={styles.statCard}>
                <span className={styles.statValue}>
                  {chapters.filter((c) => c.status === 'published').length}
                </span>
                <span className={styles.statLabel}>Published</span>
              </div>
              <div className={styles.statCard}>
                <span className={styles.statValue}>
                  {chapters.filter((c) => c.status === 'draft').length}
                </span>
                <span className={styles.statLabel}>Drafts</span>
              </div>
            </div>

            <ChapterList
              chapters={chapters}
              onEdit={handleEdit}
              onPublish={handlePublish}
              onUnpublish={handleUnpublish}
              onDelete={handleDelete}
              isLoading={isLoading}
            />
          </div>
        )}

        {(viewMode === 'create' || viewMode === 'edit') && (
          <div className={styles.editorView}>
            {/* Chapter Metadata Form */}
            <div className={styles.metadataForm}>
              <h3>{viewMode === 'create' ? 'Create New Chapter' : 'Edit Chapter'}</h3>

              <div className={styles.formGrid}>
                <div className={styles.formGroup}>
                  <label htmlFor="title">Title</label>
                  <input
                    id="title"
                    type="text"
                    value={formData.title}
                    onChange={handleTitleChange}
                    placeholder="Chapter title"
                    className={styles.input}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="slug">Slug</label>
                  <input
                    id="slug"
                    type="text"
                    value={formData.slug}
                    onChange={(e) => setFormData((prev) => ({ ...prev, slug: e.target.value }))}
                    placeholder="week-01/module-01/chapter-slug"
                    className={styles.input}
                  />
                </div>

                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label htmlFor="week">Week</label>
                    <input
                      id="week"
                      type="number"
                      min="1"
                      value={formData.week_number}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          week_number: parseInt(e.target.value) || 1,
                          slug: generateSlug(prev.title),
                        }))
                      }
                      className={styles.input}
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label htmlFor="module">Module</label>
                    <input
                      id="module"
                      type="number"
                      min="1"
                      value={formData.module_number}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          module_number: parseInt(e.target.value) || 1,
                          slug: generateSlug(prev.title),
                        }))
                      }
                      className={styles.input}
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label htmlFor="chapter">Chapter #</label>
                    <input
                      id="chapter"
                      type="number"
                      min="1"
                      value={formData.chapter_number}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          chapter_number: parseInt(e.target.value) || 1,
                        }))
                      }
                      className={styles.input}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Markdown Editor */}
            <MarkdownEditor
              initialContent={formData.content}
              onSave={handleSave}
              chapterTitle={formData.title || 'Untitled Chapter'}
            />
          </div>
        )}
      </div>
    </Layout>
  );
}
