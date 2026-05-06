/**
 * MDXCode component - Wraps code blocks in MDX to make them interactive.
 *
 * This component intercepts Python code blocks and renders them as
 * interactive CodePlayground components instead of static code.
 */

import React, { useMemo } from 'react';
import { useLocation } from '@docusaurus/router';
import CodePlayground from './index';

interface MDXCodeProps {
  /** Code content as children (from MDX) */
  children: string;
  /** Language from the code fence (e.g., 'python', 'py') */
  className?: string;
  /** Additional meta string from the code fence */
  metastring?: string;
  /** Title for the playground */
  title?: string;
  /** Whether to show the playground (vs static code) */
  live?: boolean;
  /** Packages to preload */
  packages?: string;
  /** Whether to auto-run on mount */
  autoRun?: boolean;
  /** Height of the editor */
  height?: string;
}

/**
 * Parse meta string for playground options.
 * Example: ```python live title="Example" packages="numpy,pandas"
 */
function parseMetaString(metastring?: string): {
  live: boolean;
  title?: string;
  packages?: string[];
  autoRun?: boolean;
  height?: string;
} {
  if (!metastring) {
    return { live: false };
  }

  const result: ReturnType<typeof parseMetaString> = { live: false };

  // Check for 'live' flag
  if (metastring.includes('live')) {
    result.live = true;
  }

  // Check for 'autoRun' flag
  if (metastring.includes('autoRun') || metastring.includes('autorun')) {
    result.autoRun = true;
  }

  // Parse title="..."
  const titleMatch = metastring.match(/title=["']([^"']+)["']/);
  if (titleMatch) {
    result.title = titleMatch[1];
  }

  // Parse packages="numpy,pandas"
  const packagesMatch = metastring.match(/packages=["']([^"']+)["']/);
  if (packagesMatch) {
    result.packages = packagesMatch[1].split(',').map((p) => p.trim());
  }

  // Parse height="300px"
  const heightMatch = metastring.match(/height=["']([^"']+)["']/);
  if (heightMatch) {
    result.height = heightMatch[1];
  }

  return result;
}

/**
 * Check if the language should be treated as Python.
 */
function isPythonLanguage(className?: string): boolean {
  if (!className) return false;
  const lang = className.replace(/^language-/, '').toLowerCase();
  return ['python', 'py', 'python3'].includes(lang);
}

/**
 * Extract chapter slug from the current URL path.
 */
function useChapterSlug(): string | null {
  const location = useLocation();
  const path = location.pathname;
  // Remove /docs/ prefix and trailing slash
  const slug = path.replace(/^\/docs\//, '').replace(/\/$/, '');
  return slug || null;
}

/**
 * MDXCode component that wraps code blocks.
 *
 * Usage in MDX:
 * ```python live title="Hello World Example"
 * print("Hello, World!")
 * ```
 *
 * Or for static code (default):
 * ```python
 * print("This is static")
 * ```
 */
export function MDXCode({
  children,
  className,
  metastring,
  title: propTitle,
  live: propLive,
  packages: propPackages,
  autoRun: propAutoRun,
  height: propHeight,
}: MDXCodeProps): JSX.Element {
  const chapterSlug = useChapterSlug();

  // Parse code from children
  const code = useMemo(() => {
    if (typeof children === 'string') {
      return children.trim();
    }
    // Handle React children
    if (React.isValidElement(children)) {
      return String((children as React.ReactElement<{ children?: string }>).props?.children || '').trim();
    }
    return String(children).trim();
  }, [children]);

  // Parse options from meta string or props
  const options = useMemo(() => {
    const parsed = parseMetaString(metastring);
    return {
      live: propLive ?? parsed.live,
      title: propTitle ?? parsed.title,
      packages: propPackages ? propPackages.split(',').map((p) => p.trim()) : parsed.packages,
      autoRun: propAutoRun ?? parsed.autoRun,
      height: propHeight ?? parsed.height,
    };
  }, [metastring, propTitle, propLive, propPackages, propAutoRun, propHeight]);

  // Check if this should be an interactive playground
  const isPython = isPythonLanguage(className);
  const shouldBeInteractive = options.live && isPython;

  // If not interactive, render as static code block
  if (!shouldBeInteractive) {
    return (
      <pre className={className}>
        <code>{code}</code>
      </pre>
    );
  }

  // Render as interactive CodePlayground
  return (
    <CodePlayground
      code={code}
      title={options.title || `Python Example${chapterSlug ? ` - ${chapterSlug}` : ''}`}
      packages={options.packages}
      autoRun={options.autoRun}
      height={options.height || '200px'}
    />
  );
}

/**
 * Pre element wrapper for code blocks.
 * This is used when MDX renders ```code``` blocks.
 */
export function MDXPre({
  children,
  ...props
}: React.HTMLAttributes<HTMLPreElement> & { children?: React.ReactNode }): JSX.Element {
  // Check if the child is a code element
  if (React.isValidElement(children) && children.type === 'code') {
    const codeProps = children.props as MDXCodeProps;
    return <MDXCode {...codeProps} />;
  }

  // Fallback to regular pre
  return <pre {...props}>{children}</pre>;
}

export default MDXCode;
