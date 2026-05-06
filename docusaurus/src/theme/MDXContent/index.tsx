/**
 * Custom MDXContent wrapper that enables the HighlightAsk feature and translation.
 *
 * This component wraps the MDX content and provides:
 * - Context for the highlight/selection feature
 * - Enhanced text selection capabilities
 * - Integration with the HighlightAsk popover
 * - Content translation (English/Urdu)
 */

import React, { createContext, useContext, useRef, useCallback, useState, useEffect } from 'react';
import MDXContent from '@theme-original/MDXContent';
import type { WrapperProps } from '@docusaurus/types';
import { useLocation } from '@docusaurus/router';
import BrowserOnly from '@docusaurus/BrowserOnly';
import ContentPersonalizer from '../../components/ContentPersonalizer';
import { useTranslation } from '../../context/TranslationContext';
import { getTranslation } from '../../data/translations';
import styles from './styles.module.css';

// Context for MDX content interactions
interface MDXContextValue {
  /** Reference to the content container */
  contentRef: React.RefObject<HTMLDivElement> | null;
  /** Get surrounding context around a selection */
  getSurroundingContext: (selection: Selection) => string | null;
  /** Current chapter metadata */
  chapterMeta: ChapterMeta | null;
}

interface ChapterMeta {
  title: string;
  slug: string;
  week?: number;
  module?: number;
}

const MDXContext = createContext<MDXContextValue>({
  contentRef: null,
  getSurroundingContext: () => null,
  chapterMeta: null,
});

export const useMDXContext = () => useContext(MDXContext);

type Props = WrapperProps<typeof MDXContent>;

// Helper to check if current path is a docs/chapter page
function useChapterInfo(): { slug: string; title: string } | null {
  const location = useLocation();
  const path = location.pathname;

  // Skip non-docs pages (auth, dashboard, etc.)
  if (path.startsWith('/auth') || path.startsWith('/dashboard') || path.startsWith('/authoring')) {
    return null;
  }

  // Handle homepage
  if (path === '/' || path === '') {
    return { slug: 'home', title: 'Physical AI & Humanoid Robotics' };
  }

  // Handle chapter pages (week-XX paths)
  if (path.match(/^\/week-\d+/)) {
    const slug = path.replace(/^\//, '').replace(/\/$/, '');
    const title = slug.split('/').pop()?.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) || '';
    return { slug, title };
  }

  // For any other docs page
  const slug = path.replace(/^\//, '').replace(/\/$/, '') || 'docs';
  const title = slug.split('/').pop()?.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) || 'Content';

  return { slug, title };
}

// Convert simple markdown-like text to HTML
function convertToHtml(text: string): string {
  return text
    // Headers
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    // Bold
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    // Italic
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    // Lists
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/^\d+\. (.+)$/gm, '<li>$1</li>')
    // Line breaks
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br/>');
}

export default function MDXContentWrapper(props: Props): JSX.Element {
  const contentRef = useRef<HTMLDivElement>(null);
  const [chapterMeta] = useState<ChapterMeta | null>(null);
  const chapterInfo = useChapterInfo();
  const { isUrdu } = useTranslation();
  const [translatedHtml, setTranslatedHtml] = useState<string | null>(null);

  useEffect(() => {
    if (isUrdu && chapterInfo) {
      const translation = getTranslation(chapterInfo.slug);
      if (translation) {
        // Store the translated content in localStorage
        localStorage.setItem(`translation_${chapterInfo.slug}`, JSON.stringify({
          title: translation.urduTitle,
          content: translation.urduContent,
        }));
        // Convert to HTML
        const html = convertToHtml(translation.urduContent);
        setTranslatedHtml(html);
      } else {
        setTranslatedHtml(null);
      }
    } else {
      setTranslatedHtml(null);
      if (chapterInfo) {
        localStorage.removeItem(`translation_${chapterInfo.slug}`);
      }
    }
  }, [chapterInfo?.slug, isUrdu, chapterInfo]);

  /**
   * Get surrounding context around a text selection.
   * This provides additional context for AI processing.
   */
  const getSurroundingContext = useCallback((selection: Selection): string | null => {
    if (!contentRef.current || selection.rangeCount === 0) {
      return null;
    }

    try {
      const range = selection.getRangeAt(0);
      const container = range.commonAncestorContainer;

      // Find the nearest block-level parent
      let blockParent: HTMLElement | null = null;
      let current: Node | null = container;

      while (current && current !== contentRef.current) {
        if (current instanceof HTMLElement) {
          const display = window.getComputedStyle(current).display;
          if (display === 'block' || display === 'list-item') {
            blockParent = current;
            break;
          }
        }
        current = current.parentNode;
      }

      if (!blockParent) {
        return null;
      }

      // Get text content of the block and its siblings
      const contextParts: string[] = [];

      // Previous sibling paragraph
      const prevSibling = blockParent.previousElementSibling;
      if (prevSibling && prevSibling.textContent) {
        const text = prevSibling.textContent.trim();
        if (text.length > 0 && text.length < 500) {
          contextParts.push(text);
        }
      }

      // Current block
      if (blockParent.textContent) {
        contextParts.push(blockParent.textContent.trim());
      }

      // Next sibling paragraph
      const nextSibling = blockParent.nextElementSibling;
      if (nextSibling && nextSibling.textContent) {
        const text = nextSibling.textContent.trim();
        if (text.length > 0 && text.length < 500) {
          contextParts.push(text);
        }
      }

      const fullContext = contextParts.join('\n\n');
      // Limit total context length
      return fullContext.slice(0, 1500);
    } catch {
      return null;
    }
  }, []);

  const contextValue: MDXContextValue = {
    contentRef,
    getSurroundingContext,
    chapterMeta,
  };

  return (
    <MDXContext.Provider value={contextValue}>
      <div
        ref={contentRef}
        className="mdx-content-wrapper"
        data-highlight-enabled="true"
      >
        {/* Content Personalizer - only show on chapter pages */}
        {chapterInfo && (
          <BrowserOnly fallback={null}>
            {() => (
              <ContentPersonalizer
                chapterSlug={chapterInfo.slug}
                chapterTitle={chapterInfo.title}
              />
            )}
          </BrowserOnly>
        )}

        {/* Show translated content if Urdu is selected and translation exists */}
        {isUrdu && translatedHtml ? (
          <div
            className={styles.translatedContent}
            dir="rtl"
            dangerouslySetInnerHTML={{ __html: translatedHtml }}
          />
        ) : (
          <MDXContent {...props} />
        )}
      </div>
    </MDXContext.Provider>
  );
}
