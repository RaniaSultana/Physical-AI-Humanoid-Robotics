/**
 * Registration page for new user accounts.
 */

import React, { useEffect, useState } from 'react';
import Layout from '@theme/Layout';
import BrowserOnly from '@docusaurus/BrowserOnly';
import { useHistory, useLocation } from '@docusaurus/router';
import { useAuth } from '../../context/AuthContext';
import { OAuthButtons } from '../../components/Auth/OAuthButtons';
import styles from './auth.module.css';

function RegisterContent(): JSX.Element {
  const { isAuthenticated, isLoading, register, error: authError, clearError } = useAuth();
  const history = useHistory();
  const location = useLocation();
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Get redirect URL from query params
  const searchParams = new URLSearchParams(location.search);
  const redirectTo = searchParams.get('redirect') || '/dashboard';

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      history.push('/dashboard');
    }
  }, [isAuthenticated, isLoading, history]);

  // Check for OAuth error in URL
  useEffect(() => {
    const oauthError = searchParams.get('error');
    if (oauthError) {
      setError(decodeURIComponent(oauthError));
      history.replace('/auth/register');
    }
  }, [location.search, history]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    clearError();

    if (!email || !password) {
      setError('Please fill in all required fields');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setIsSubmitting(true);
    try {
      await register(email, password, displayName || undefined);
      history.push('/dashboard');
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

  const goToLogin = () => {
    history.push(`/auth/login${redirectTo !== '/dashboard' ? `?redirect=${encodeURIComponent(redirectTo)}` : ''}`);
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
          <h1 className={styles.title}>Create Account</h1>
          <p className={styles.subtitle}>
            Join learners studying Physical AI & Robotics
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
          actionText="Sign up with"
          onError={handleOAuthError}
        />

        <div className={styles.divider}>
          <span>or sign up with email</span>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.field}>
            <label htmlFor="displayName" className={styles.label}>
              Display Name <span className={styles.optional}>(optional)</span>
            </label>
            <input
              id="displayName"
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Your name"
              className={styles.input}
              disabled={isSubmitting}
              autoComplete="name"
            />
          </div>

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
              required
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="password" className={styles.label}>Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 8 characters"
              className={styles.input}
              disabled={isSubmitting}
              autoComplete="new-password"
              required
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="confirmPassword" className={styles.label}>Confirm Password</label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm your password"
              className={styles.input}
              disabled={isSubmitting}
              autoComplete="new-password"
              required
            />
          </div>

          <button type="submit" className={styles.submitButton} disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <span className={styles.buttonSpinner} />
                Creating account...
              </>
            ) : (
              'Create Account'
            )}
          </button>
        </form>

        <div className={styles.footer}>
          <p>
            Already have an account?{' '}
            <button onClick={goToLogin} className={styles.link}>
              Sign in
            </button>
          </p>
        </div>

        <div className={styles.terms}>
          <p>
            By creating an account, you agree to our{' '}
            <a href="/terms" className={styles.link}>Terms</a>
            {' '}and{' '}
            <a href="/privacy" className={styles.link}>Privacy Policy</a>
          </p>
        </div>
      </div>

      <div className={styles.features}>
        <h2>What you'll get</h2>
        <ul>
          <li>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            <span>AI assistant that knows your background</span>
          </li>
          <li>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="4 17 10 11 4 5" />
              <line x1="12" y1="19" x2="20" y2="19" />
            </svg>
            <span>Interactive Python code playground</span>
          </li>
          <li>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
              <line x1="8" y1="21" x2="16" y2="21" />
              <line x1="12" y1="17" x2="12" y2="21" />
            </svg>
            <span>Spaced repetition flashcards</span>
          </li>
          <li>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
            </svg>
            <span>Urdu translations on demand</span>
          </li>
        </ul>
      </div>
    </div>
  );
}

export default function RegisterPage(): JSX.Element {
  return (
    <Layout
      title="Create Account"
      description="Create an account to access personalized learning features"
    >
      <BrowserOnly fallback={
        <div className={styles.container}>
          <div className={styles.loading}>
            <span className={styles.spinner} />
            Loading...
          </div>
        </div>
      }>
        {() => <RegisterContent />}
      </BrowserOnly>
    </Layout>
  );
}
