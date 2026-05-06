/**
 * Login page for user authentication.
 */

import React, { useEffect, useState } from 'react';
import Layout from '@theme/Layout';
import BrowserOnly from '@docusaurus/BrowserOnly';
import { useHistory, useLocation } from '@docusaurus/router';
import { useAuth } from '../../context/AuthContext';
import { OAuthButtons } from '../../components/Auth/OAuthButtons';
import styles from './auth.module.css';

function LoginContent(): JSX.Element {
  const { isAuthenticated, isLoading, login, error: authError, clearError } = useAuth();
  const history = useHistory();
  const location = useLocation();
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Get redirect URL from query params
  const searchParams = new URLSearchParams(location.search);
  const redirectTo = searchParams.get('redirect') || '/dashboard';

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      history.push(redirectTo);
    }
  }, [isAuthenticated, isLoading, history, redirectTo]);

  // Check for OAuth error in URL
  useEffect(() => {
    const oauthError = searchParams.get('error');
    if (oauthError) {
      setError(decodeURIComponent(oauthError));
      history.replace('/auth/login');
    }
  }, [location.search, history]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    clearError();

    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }

    setIsSubmitting(true);
    try {
      await login(email, password);
      history.push(redirectTo);
    } catch (err) {
      // Error handled by auth context
    } finally {
      setIsSubmitting(false);
    }
  };

  const [oauthInfo, setOauthInfo] = useState<string | null>(null);

  const handleOAuthError = (err: string) => {
    // OAuth "coming soon" messages should be info, not errors
    if (err.includes('coming soon')) {
      setOauthInfo(err);
      setError(null);
    } else {
      setError(err);
      setOauthInfo(null);
    }
  };

  const goToRegister = () => {
    history.push(`/auth/register${redirectTo !== '/dashboard' ? `?redirect=${encodeURIComponent(redirectTo)}` : ''}`);
  };

  if (isLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>
          <span className={styles.spinner} />
          Loading...
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.header}>
          <div className={styles.logoIcon}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M12 2L2 7l10 5 10-5-10-5z" />
              <path d="M2 17l10 5 10-5" />
              <path d="M2 12l10 5 10-5" />
            </svg>
          </div>
          <h1 className={styles.title}>Welcome Back</h1>
          <p className={styles.subtitle}>
            Sign in to continue your AI & Robotics journey
          </p>
        </div>

        {(error || authError) && (
          <div className={styles.error}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            {error || authError}
          </div>
        )}

        {oauthInfo && (
          <div className={styles.info}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="16" x2="12" y2="12" />
              <line x1="12" y1="8" x2="12.01" y2="8" />
            </svg>
            {oauthInfo}
          </div>
        )}

        <OAuthButtons
          actionText="Continue with"
          onError={handleOAuthError}
        />

        <div className={styles.divider}>
          <span>or continue with email</span>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.field}>
            <label htmlFor="email" className={styles.label}>Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className={styles.input}
              disabled={isSubmitting}
              autoComplete="email"
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="password" className={styles.label}>Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              className={styles.input}
              disabled={isSubmitting}
              autoComplete="current-password"
            />
          </div>

          <button type="submit" className={styles.submitButton} disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <span className={styles.buttonSpinner} />
                Signing in...
              </>
            ) : (
              'Sign In'
            )}
          </button>
        </form>

        <div className={styles.footer}>
          <p>
            Don't have an account?{' '}
            <button onClick={goToRegister} className={styles.link}>
              Create one
            </button>
          </p>
        </div>
      </div>

      <div className={styles.features}>
        <h2>Why create an account?</h2>
        <ul>
          <li>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
            <span>AI-powered personalized explanations</span>
          </li>
          <li>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2L2 7l10 5 10-5-10-5z" />
              <path d="M2 17l10 5 10-5" />
              <path d="M2 12l10 5 10-5" />
            </svg>
            <span>Track your reading progress</span>
          </li>
          <li>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <path d="M9 9l6 6" />
              <path d="M15 9l-6 6" />
            </svg>
            <span>Take quizzes and review flashcards</span>
          </li>
          <li>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            <span>Chat with AI about any concept</span>
          </li>
        </ul>
      </div>
    </div>
  );
}

export default function LoginPage(): JSX.Element {
  return (
    <Layout
      title="Login"
      description="Sign in to your account to access personalized learning features"
    >
      <BrowserOnly fallback={
        <div className={styles.container}>
          <div className={styles.loading}>
            <span className={styles.spinner} />
            Loading...
          </div>
        </div>
      }>
        {() => <LoginContent />}
      </BrowserOnly>
    </Layout>
  );
}
