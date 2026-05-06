/**
 * Hook for detecting text selection in the document.
 */

import { useState, useEffect, useCallback } from 'react';

export interface SelectionPosition {
  x: number;
  y: number;
  width: number;
}

export interface TextSelection {
  text: string;
  position: SelectionPosition;
}

export interface UseTextSelectionReturn {
  selection: TextSelection | null;
  clearSelection: () => void;
}

export function useTextSelection(): UseTextSelectionReturn {
  const [selection, setSelection] = useState<TextSelection | null>(null);

  const handleSelectionChange = useCallback(() => {
    const windowSelection = window.getSelection();

    if (!windowSelection || windowSelection.isCollapsed) {
      setSelection(null);
      return;
    }

    const text = windowSelection.toString().trim();

    // Only trigger for meaningful selections (at least 10 characters)
    if (text.length < 10) {
      setSelection(null);
      return;
    }

    // Check if selection is within content area (not in chat, nav, etc.)
    const range = windowSelection.getRangeAt(0);
    const container = range.commonAncestorContainer;

    // Get the element (might be a text node)
    const element = container.nodeType === Node.TEXT_NODE
      ? container.parentElement
      : container as Element;

    // Only allow selection in article/main content areas
    const isInContent = element?.closest('article, .markdown, .theme-doc-markdown, main');
    const isInExcluded = element?.closest('.chatPanel, nav, aside, header, footer, .menu');

    if (!isInContent || isInExcluded) {
      setSelection(null);
      return;
    }

    // Get position for the popup
    const rect = range.getBoundingClientRect();
    const position: SelectionPosition = {
      x: rect.left + rect.width / 2,
      y: rect.top - 10, // Position above selection
      width: rect.width,
    };

    setSelection({ text, position });
  }, []);

  const clearSelection = useCallback(() => {
    setSelection(null);
    window.getSelection()?.removeAllRanges();
  }, []);

  useEffect(() => {
    // Use mouseup instead of selectionchange for better UX
    const handleMouseUp = () => {
      // Small delay to ensure selection is complete
      setTimeout(handleSelectionChange, 10);
    };

    // Also handle keyboard selection
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.shiftKey) {
        setTimeout(handleSelectionChange, 10);
      }
    };

    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('keyup', handleKeyUp);

    return () => {
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('keyup', handleKeyUp);
    };
  }, [handleSelectionChange]);

  // Clear selection when clicking outside
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = e.target as Element;
      if (!target.closest('.highlight-ask-popup')) {
        // Don't clear immediately - let the selection complete first
        setTimeout(() => {
          const currentSelection = window.getSelection();
          if (!currentSelection || currentSelection.isCollapsed) {
            setSelection(null);
          }
        }, 100);
      }
    };

    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return { selection, clearSelection };
}

export default useTextSelection;
