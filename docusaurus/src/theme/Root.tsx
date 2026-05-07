/**
 * Custom Root component to wrap the entire Docusaurus app.
 * Provides global context providers and floating components.
 */

import React, { Suspense } from 'react';
import BrowserOnly from '@docusaurus/BrowserOnly';
import { AuthProvider } from '../context/AuthContext';
import { TranslationProvider } from '../context/TranslationContext';
import { ChatBot } from '../components/ChatBot';
import { HighlightAsk } from '../components/HighlightAsk';
import { ReadingTracker } from '../components/ReadingTracker';

interface RootProps {
  children: React.ReactNode;
}

function FloatingComponents(): JSX.Element {
  return (
    <Suspense fallback={null}>
      <ReadingTracker />
      <ChatBot />
      <HighlightAsk />
    </Suspense>
  );
}

export default function Root({ children }: RootProps): JSX.Element {
  return (
    <TranslationProvider>
      <AuthProvider>
        {children}
        <BrowserOnly fallback={null}>
          {() => <FloatingComponents />}
        </BrowserOnly>
      </AuthProvider>
    </TranslationProvider>
  );
}
