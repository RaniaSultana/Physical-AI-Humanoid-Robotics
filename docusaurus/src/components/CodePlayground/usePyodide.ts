/**
 * Hook for managing Pyodide (Python in browser) execution.
 */

import { useState, useCallback, useRef, useEffect } from 'react';

declare global {
  interface Window {
    loadPyodide: (config?: { indexURL?: string }) => Promise<PyodideInterface>;
  }
}

interface PyodideInterface {
  runPython: (code: string) => unknown;
  runPythonAsync: (code: string) => Promise<unknown>;
  loadPackage: (packages: string | string[]) => Promise<void>;
  loadPackagesFromImports: (code: string) => Promise<void>;
  globals: {
    get: (name: string) => unknown;
    set: (name: string, value: unknown) => void;
  };
}

export interface ExecutionResult {
  output: string;
  error: string | null;
  executionTime: number;
}

export interface UsePyodideReturn {
  isLoading: boolean;
  isReady: boolean;
  error: string | null;
  execute: (code: string) => Promise<ExecutionResult>;
  loadPackages: (packages: string[]) => Promise<void>;
}

// Pyodide CDN URL
const PYODIDE_INDEX_URL = 'https://cdn.jsdelivr.net/pyodide/v0.24.1/full/';

export function usePyodide(): UsePyodideReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pyodideRef = useRef<PyodideInterface | null>(null);
  const loadingRef = useRef(false);

  // Load Pyodide script
  const loadPyodideScript = useCallback(async (): Promise<void> => {
    if (typeof window === 'undefined') return;

    // Check if already loaded
    if (window.loadPyodide) return;

    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = `${PYODIDE_INDEX_URL}pyodide.js`;
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Failed to load Pyodide script'));
      document.head.appendChild(script);
    });
  }, []);

  // Initialize Pyodide
  const initPyodide = useCallback(async () => {
    if (loadingRef.current || pyodideRef.current) return;
    loadingRef.current = true;
    setIsLoading(true);
    setError(null);

    try {
      // Load the script first
      await loadPyodideScript();

      // Initialize Pyodide
      const pyodide = await window.loadPyodide({
        indexURL: PYODIDE_INDEX_URL,
      });

      // Set up stdout/stderr capture
      await pyodide.runPythonAsync(`
import sys
from io import StringIO

class OutputCapture:
    def __init__(self):
        self.stdout = StringIO()
        self.stderr = StringIO()

    def capture(self):
        sys.stdout = self.stdout
        sys.stderr = self.stderr

    def get_output(self):
        return self.stdout.getvalue(), self.stderr.getvalue()

    def reset(self):
        self.stdout = StringIO()
        self.stderr = StringIO()
        sys.stdout = self.stdout
        sys.stderr = self.stderr

_output_capture = OutputCapture()
      `);

      pyodideRef.current = pyodide;
      setIsReady(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to initialize Pyodide');
    } finally {
      setIsLoading(false);
      loadingRef.current = false;
    }
  }, [loadPyodideScript]);

  // Execute Python code
  const execute = useCallback(async (code: string): Promise<ExecutionResult> => {
    // Initialize if not ready
    if (!pyodideRef.current) {
      await initPyodide();
    }

    const pyodide = pyodideRef.current;
    if (!pyodide) {
      return {
        output: '',
        error: 'Pyodide not initialized',
        executionTime: 0,
      };
    }

    const startTime = performance.now();

    try {
      // Reset and capture output
      await pyodide.runPythonAsync(`
_output_capture.reset()
_output_capture.capture()
      `);

      // Load any required packages
      await pyodide.loadPackagesFromImports(code);

      // Execute the code
      await pyodide.runPythonAsync(code);

      // Get captured output
      const result = await pyodide.runPythonAsync(`
stdout, stderr = _output_capture.get_output()
(stdout, stderr)
      `);

      const [stdout, stderr] = result as [string, string];
      const executionTime = performance.now() - startTime;

      return {
        output: stdout || (stderr ? '' : 'Code executed successfully'),
        error: stderr || null,
        executionTime,
      };
    } catch (err) {
      const executionTime = performance.now() - startTime;
      return {
        output: '',
        error: err instanceof Error ? err.message : String(err),
        executionTime,
      };
    }
  }, [initPyodide]);

  // Load additional packages
  const loadPackages = useCallback(async (packages: string[]) => {
    if (!pyodideRef.current) {
      await initPyodide();
    }

    const pyodide = pyodideRef.current;
    if (!pyodide) {
      throw new Error('Pyodide not initialized');
    }

    await pyodide.loadPackage(packages);
  }, [initPyodide]);

  return {
    isLoading,
    isReady,
    error,
    execute,
    loadPackages,
  };
}

export default usePyodide;
