/**
 * Custom MDX components for the textbook.
 * These components are available in all MDX files without explicit imports.
 */

import React from 'react';
import MDXComponents from '@theme-original/MDXComponents';
import CodePlayground from '@site/src/components/CodePlayground';

export default {
  // Spread default components
  ...MDXComponents,

  // Custom components
  CodePlayground,
};
