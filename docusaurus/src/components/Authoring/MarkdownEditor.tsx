/**
 * MarkdownEditor Component (T108)
 *
 * A Markdown/MDX editor with live preview for authoring chapter content.
 * Uses Monaco Editor for syntax highlighting and MDX rendering for preview.
 */

import React, { useState, useCallback, useEffect } from 'react';
import styles from './MarkdownEditor.module.css';

interface MarkdownEditorProps {
  initialContent?: string;
  onChange?: (content: string) => void;
  onSave?: (content: string) => void;
  readOnly?: boolean;
  chapterTitle?: string;
}

export default function MarkdownEditor({
  initialContent = '',
  onChange,
  onSave,
  readOnly = false,
  chapterTitle = 'Untitled Chapter',
}: MarkdownEditorProps): JSX.Element {
  const [content, setContent] = useState(initialContent);
  const [showPreview, setShowPreview] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  // Update content when initialContent changes
  useEffect(() => {
    setContent(initialContent);
  }, [initialContent]);

  const handleContentChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newContent = e.target.value;
      setContent(newContent);
      onChange?.(newContent);
    },
    [onChange]
  );

  const handleSave = useCallback(async () => {
    if (readOnly || !onSave) return;

    setIsSaving(true);
    try {
      await onSave(content);
      setLastSaved(new Date());
    } catch (error) {
      console.error('Failed to save:', error);
    } finally {
      setIsSaving(false);
    }
  }, [content, onSave, readOnly]);

  // Keyboard shortcut for save (Cmd/Ctrl + S)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSave]);

  // Simple Markdown to HTML conversion for preview
  const renderPreview = (markdown: string): string => {
    let html = markdown
      // Headers
      .replace(/^### (.*$)/gim, '<h3>$1</h3>')
      .replace(/^## (.*$)/gim, '<h2>$1</h2>')
      .replace(/^# (.*$)/gim, '<h1>$1</h1>')
      // Bold
      .replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>')
      // Italic
      .replace(/\*(.*?)\*/gim, '<em>$1</em>')
      // Code blocks
      .replace(/```(\w+)?\n([\s\S]*?)```/gim, '<pre><code class="language-$1">$2</code></pre>')
      // Inline code
      .replace(/`(.*?)`/gim, '<code>$1</code>')
      // Links
      .replace(/\[(.*?)\]\((.*?)\)/gim, '<a href="$2">$1</a>')
      // Blockquotes
      .replace(/^> (.*$)/gim, '<blockquote>$1</blockquote>')
      // Unordered lists
      .replace(/^\s*[-*] (.*$)/gim, '<li>$1</li>')
      // Line breaks
      .replace(/\n/gim, '<br />');

    // Wrap consecutive <li> elements in <ul>
    html = html.replace(/(<li>.*?<\/li>(<br \/>)?)+/gim, (match) => {
      return '<ul>' + match.replace(/<br \/>/g, '') + '</ul>';
    });

    return html;
  };

  const wordCount = content.split(/\s+/).filter(Boolean).length;
  const readTime = Math.max(1, Math.ceil(wordCount / 200));

  return (
    <div className={styles.editorContainer}>
      <div className={styles.toolbar}>
        <div className={styles.toolbarLeft}>
          <span className={styles.chapterTitle}>{chapterTitle}</span>
          <span className={styles.stats}>
            {wordCount} words | ~{readTime} min read
          </span>
        </div>
        <div className={styles.toolbarRight}>
          <button
            className={`${styles.toolbarButton} ${showPreview ? styles.active : ''}`}
            onClick={() => setShowPreview(!showPreview)}
            title="Toggle Preview"
          >
            {showPreview ? 'Hide Preview' : 'Show Preview'}
          </button>
          {!readOnly && onSave && (
            <button
              className={`${styles.toolbarButton} ${styles.saveButton}`}
              onClick={handleSave}
              disabled={isSaving}
            >
              {isSaving ? 'Saving...' : 'Save'}
            </button>
          )}
        </div>
      </div>

      <div className={`${styles.editorBody} ${showPreview ? styles.split : ''}`}>
        <div className={styles.editorPane}>
          <textarea
            className={styles.textarea}
            value={content}
            onChange={handleContentChange}
            placeholder="Start writing your chapter content in Markdown..."
            readOnly={readOnly}
            spellCheck
          />
        </div>

        {showPreview && (
          <div className={styles.previewPane}>
            <div className={styles.previewHeader}>Preview</div>
            <div
              className={styles.previewContent}
              dangerouslySetInnerHTML={{ __html: renderPreview(content) }}
            />
          </div>
        )}
      </div>

      {lastSaved && (
        <div className={styles.statusBar}>
          Last saved: {lastSaved.toLocaleTimeString()}
        </div>
      )}
    </div>
  );
}
