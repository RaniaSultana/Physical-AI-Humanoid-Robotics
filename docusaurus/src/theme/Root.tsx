/**
 * Custom Root component to wrap the entire Docusaurus app.
 * Provides global context providers and floating components.
 */

import React from 'react';
import BrowserOnly from '@docusaurus/BrowserOnly';
import { AuthProvider } from '../context/AuthContext';
import { TranslationProvider } from '../context/TranslationContext';

interface RootProps {
  children: React.ReactNode;
}

// Fallback component for SSR (TranslationProvider is available during SSR)
function SSRContent({ children }: { children: React.ReactNode }) {
  return (
    <TranslationProvider>
      {children}
    </TranslationProvider>
  );
}

// Lazy load components to avoid SSR issues
const ChatBot = React.lazy(() => import('../components/ChatBot'));
const HighlightAsk = React.lazy(() => import('../components/HighlightAsk'));
const ReadingTracker = React.lazy(() => import('../components/ReadingTracker'));

function FloatingComponents() {
  return (
    <React.Suspense fallback={null}>
      <ReadingTracker />
      <ChatBot />
      <HighlightAsk />
    </React.Suspense>
  );
}

export default function Root({ children }: RootProps): JSX.Element {
  return (
    <SSRContent>
      <AuthProvider>
        {children}
        <BrowserOnly fallback={null}>
          {() => <FloatingComponents />}
        </BrowserOnly>
      </AuthProvider>
    </SSRContent>
  );
}
