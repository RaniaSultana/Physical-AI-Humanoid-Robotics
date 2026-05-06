/**
 * CodePlayground component for interactive Python code execution.
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import clsx from 'clsx';
import { usePyodide, ExecutionResult } from './usePyodide';
import styles from './styles.module.css';

interface CodePlaygroundProps {
  /** Initial code to display */
  code?: string;
  /** Title for the playground */
  title?: string;
  /** Whether to auto-execute on mount */
  autoRun?: boolean;
  /** Packages to preload */
  packages?: string[];
  /** Read-only mode */
  readOnly?: boolean;
  /** Height of the editor */
  height?: string;
}

export function CodePlayground({
  code: initialCode = '# Write your Python code here\nprint("Hello, World!")',
  title = 'Python Playground',
  autoRun = false,
  packages = [],
  readOnly = false,
  height = '200px',
}: CodePlaygroundProps): JSX.Element {
  const [code, setCode] = useState(initialCode);
  const [result, setResult] = useState<ExecutionResult | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { isLoading, isReady, error: pyodideError, execute, loadPackages } = usePyodide();

  // Preload packages
  useEffect(() => {
    if (packages.length > 0 && isReady) {
      loadPackages(packages).catch(console.error);
    }
  }, [packages, isReady, loadPackages]);

  // Auto-run on mount
  useEffect(() => {
    if (autoRun && isReady && initialCode) {
      handleRun();
    }
  }, [autoRun, isReady]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleRun = useCallback(async () => {
    if (!code.trim()) return;

    setIsExecuting(true);
    setResult(null);

    try {
      const executionResult = await execute(code);
      setResult(executionResult);
    } finally {
      setIsExecuting(false);
    }
  }, [code, execute]);

  const handleReset = useCallback(() => {
    setCode(initialCode);
    setResult(null);
  }, [initialCode]);

  const handleClear = useCallback(() => {
    setResult(null);
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    // Ctrl/Cmd + Enter to run
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleRun();
    }

    // Tab for indentation
    if (e.key === 'Tab') {
      e.preventDefault();
      const textarea = textareaRef.current;
      if (!textarea) return;

      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newCode = code.substring(0, start) + '    ' + code.substring(end);

      setCode(newCode);
      // Set cursor position after indent
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + 4;
      }, 0);
    }
  }, [code, handleRun]);

  return (
    <div className={styles.playground}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <span className={styles.icon}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <line x1="16" y1="13" x2="8" y2="13"></line>
              <line x1="16" y1="17" x2="8" y2="17"></line>
              <polyline points="10 9 9 9 8 9"></polyline>
            </svg>
          </span>
          <span className={styles.title}>{title}</span>
          {isLoading && <span className={styles.loadingBadge}>Loading Pyodide...</span>}
          {isReady && <span className={styles.readyBadge}>Ready</span>}
        </div>
        <div className={styles.headerRight}>
          <button
            onClick={handleReset}
            className={styles.headerButton}
            title="Reset code"
            disabled={isExecuting}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"></path>
              <path d="M21 3v5h-5"></path>
              <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"></path>
              <path d="M3 21v-5h5"></path>
            </svg>
          </button>
          <button
            onClick={handleClear}
            className={styles.headerButton}
            title="Clear output"
            disabled={!result}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            </svg>
          </button>
        </div>
      </div>

      <div className={styles.editor}>
        <div className={styles.lineNumbers}>
          {code.split('\n').map((_, i) => (
            <span key={i}>{i + 1}</span>
          ))}
        </div>
        <textarea
          ref={textareaRef}
          value={code}
          onChange={(e) => setCode(e.target.value)}
          onKeyDown={handleKeyDown}
          className={styles.codeInput}
          style={{ height }}
          spellCheck={false}
          readOnly={readOnly}
          placeholder="Write your Python code here..."
        />
      </div>

      <div className={styles.actions}>
        <button
          onClick={handleRun}
          disabled={isExecuting || isLoading || !code.trim()}
          className={clsx(styles.runButton, { [styles.running]: isExecuting })}
        >
          {isExecuting ? (
            <>
              <span className={styles.spinner} />
              Running...
            </>
          ) : (
            <>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <polygon points="5 3 19 12 5 21 5 3"></polygon>
              </svg>
              Run Code
            </>
          )}
        </button>
        <span className={styles.shortcut}>
          Ctrl/Cmd + Enter
        </span>
      </div>

      {(result || pyodideError) && (
        <div className={styles.output}>
          <div className={styles.outputHeader}>
            <span>Output</span>
            {result?.executionTime && (
              <span className={styles.executionTime}>
                {result.executionTime.toFixed(0)}ms
              </span>
            )}
          </div>
          <pre className={clsx(styles.outputContent, {
            [styles.errorOutput]: result?.error || pyodideError,
          })}>
            {pyodideError || result?.error || result?.output || 'No output'}
          </pre>
        </div>
      )}
    </div>
  );
}

export default CodePlayground;
