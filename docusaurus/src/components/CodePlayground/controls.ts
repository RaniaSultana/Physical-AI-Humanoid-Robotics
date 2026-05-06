/**
 * Controls and utilities for the CodePlayground component.
 *
 * Provides helper functions for code manipulation, state management,
 * and keyboard shortcuts.
 */

import type { ExecutionResult } from './usePyodide';

/**
 * Code block metadata tracked for the playground.
 */
export interface CodeBlockState {
  /** Unique identifier for the code block */
  id: string;
  /** Original code from the textbook */
  originalCode: string;
  /** Current code (potentially modified) */
  currentCode: string;
  /** Whether the code has been modified from original */
  isModified: boolean;
  /** Execution history */
  history: ExecutionHistoryEntry[];
}

/**
 * Entry in the execution history.
 */
export interface ExecutionHistoryEntry {
  /** Timestamp of execution */
  timestamp: number;
  /** Code that was executed */
  code: string;
  /** Execution result */
  result: ExecutionResult | null;
}

/**
 * Reset code to the original state.
 *
 * @param originalCode - The original code from the textbook
 * @returns Object with reset state values
 */
export function resetToOriginal(originalCode: string): {
  code: string;
  isModified: boolean;
} {
  return {
    code: originalCode,
    isModified: false,
  };
}

/**
 * Check if the current code differs from original.
 *
 * @param currentCode - The current code in the editor
 * @param originalCode - The original code from the textbook
 * @returns true if code has been modified
 */
export function isCodeModified(currentCode: string, originalCode: string): boolean {
  // Normalize whitespace for comparison
  const normalize = (s: string) => s.replace(/\s+/g, ' ').trim();
  return normalize(currentCode) !== normalize(originalCode);
}

/**
 * Format code with basic Python indentation rules.
 *
 * @param code - Code to format
 * @returns Formatted code
 */
export function formatPythonCode(code: string): string {
  const lines = code.split('\n');
  let indentLevel = 0;
  const formattedLines: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();

    // Decrease indent for lines that start with these
    if (trimmed.startsWith('elif ') || trimmed.startsWith('else:') ||
        trimmed.startsWith('except') || trimmed.startsWith('finally:') ||
        trimmed.startsWith('elif:')) {
      indentLevel = Math.max(0, indentLevel - 1);
    }

    // Apply current indent
    if (trimmed.length > 0) {
      formattedLines.push('    '.repeat(indentLevel) + trimmed);
    } else {
      formattedLines.push('');
    }

    // Increase indent after these
    if (trimmed.endsWith(':') && !trimmed.startsWith('#')) {
      indentLevel++;
    }

    // Reset indent after these keywords
    if (trimmed === 'return' || trimmed.startsWith('return ') ||
        trimmed === 'break' || trimmed === 'continue' ||
        trimmed === 'pass' || trimmed.startsWith('raise ')) {
      // Don't auto-decrease, let user control
    }
  }

  return formattedLines.join('\n');
}

/**
 * Get a diff between original and modified code.
 *
 * @param original - Original code
 * @param modified - Modified code
 * @returns Object describing the changes
 */
export function getCodeDiff(original: string, modified: string): {
  linesAdded: number;
  linesRemoved: number;
  linesChanged: number;
} {
  const originalLines = original.split('\n');
  const modifiedLines = modified.split('\n');

  // Simple line-by-line comparison
  let linesAdded = 0;
  let linesRemoved = 0;
  let linesChanged = 0;

  const maxLength = Math.max(originalLines.length, modifiedLines.length);

  for (let i = 0; i < maxLength; i++) {
    const origLine = originalLines[i];
    const modLine = modifiedLines[i];

    if (origLine === undefined && modLine !== undefined) {
      linesAdded++;
    } else if (origLine !== undefined && modLine === undefined) {
      linesRemoved++;
    } else if (origLine !== modLine) {
      linesChanged++;
    }
  }

  return { linesAdded, linesRemoved, linesChanged };
}

/**
 * Keyboard shortcut definitions.
 */
export const KEYBOARD_SHORTCUTS = {
  run: { key: 'Enter', ctrl: true, description: 'Run code' },
  reset: { key: 'r', ctrl: true, shift: true, description: 'Reset to original' },
  clear: { key: 'l', ctrl: true, description: 'Clear output' },
  indent: { key: 'Tab', description: 'Indent' },
  outdent: { key: 'Tab', shift: true, description: 'Outdent' },
  format: { key: 'f', ctrl: true, shift: true, description: 'Format code' },
  help: { key: '/', ctrl: true, description: 'Show AI help' },
} as const;

/**
 * Check if a keyboard event matches a shortcut.
 *
 * @param event - Keyboard event
 * @param shortcut - Shortcut to check
 * @returns true if the event matches the shortcut
 */
export function matchesShortcut(
  event: KeyboardEvent,
  shortcut: { key: string; ctrl?: boolean; shift?: boolean; alt?: boolean }
): boolean {
  const ctrlKey = event.ctrlKey || event.metaKey;

  return (
    event.key.toLowerCase() === shortcut.key.toLowerCase() &&
    (shortcut.ctrl ? ctrlKey : !ctrlKey || !shortcut.ctrl) &&
    (shortcut.shift ? event.shiftKey : !event.shiftKey || !shortcut.shift) &&
    (shortcut.alt ? event.altKey : !event.altKey || !shortcut.alt)
  );
}

/**
 * Storage key prefix for code playground state.
 */
const STORAGE_PREFIX = 'code_playground_';

/**
 * Save code block state to local storage.
 *
 * @param blockId - Unique identifier for the code block
 * @param state - State to save
 */
export function saveCodeState(blockId: string, state: Partial<CodeBlockState>): void {
  try {
    const key = STORAGE_PREFIX + blockId;
    const existing = localStorage.getItem(key);
    const current = existing ? JSON.parse(existing) : {};
    localStorage.setItem(key, JSON.stringify({ ...current, ...state }));
  } catch {
    // Ignore storage errors
  }
}

/**
 * Load code block state from local storage.
 *
 * @param blockId - Unique identifier for the code block
 * @returns Saved state or null
 */
export function loadCodeState(blockId: string): CodeBlockState | null {
  try {
    const key = STORAGE_PREFIX + blockId;
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : null;
  } catch {
    return null;
  }
}

/**
 * Clear saved code state.
 *
 * @param blockId - Unique identifier for the code block
 */
export function clearCodeState(blockId: string): void {
  try {
    const key = STORAGE_PREFIX + blockId;
    localStorage.removeItem(key);
  } catch {
    // Ignore storage errors
  }
}

/**
 * Generate a unique ID for a code block based on its content and position.
 *
 * @param code - The code content
 * @param chapterSlug - The chapter slug
 * @param index - Position index in the chapter
 * @returns Unique identifier
 */
export function generateBlockId(code: string, chapterSlug: string, index: number): string {
  // Simple hash of code content
  let hash = 0;
  for (let i = 0; i < Math.min(code.length, 100); i++) {
    hash = ((hash << 5) - hash) + code.charCodeAt(i);
    hash = hash & hash;
  }
  return `${chapterSlug}_block_${index}_${Math.abs(hash).toString(16)}`;
}

/**
 * Copy code to clipboard.
 *
 * @param code - Code to copy
 * @returns Promise resolving when copy is complete
 */
export async function copyToClipboard(code: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(code);
    return true;
  } catch {
    // Fallback for older browsers
    try {
      const textarea = document.createElement('textarea');
      textarea.value = code;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      const result = document.execCommand('copy');
      document.body.removeChild(textarea);
      return result;
    } catch {
      return false;
    }
  }
}

/**
 * Download code as a file.
 *
 * @param code - Code to download
 * @param filename - Name for the file
 */
export function downloadCode(code: string, filename = 'code.py'): void {
  const blob = new Blob([code], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
