/**
 * OAuth callback page - handles token from OAuth providers.
 */

import React, { useEffect, useState } from 'react';
import { useHistory, useLocation } from '@docusaurus/router';
import Layout from '@theme/Layout';
import BrowserOnly from '@docusaurus/BrowserOnly';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import styles from './auth.module.css';

function CallbackContent(): JSX.Element {
  const history = useHistory();
  const location = useLocation();
  const { login } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(true);

  useEffect(() => {
    const handleCallback = async () => {
      const params = new URLSearchParams(location.search);
      const token = params.get('token');
      const errorParam = params.get('error');

      if (errorParam) {
        setError(decodeURIComponent(errorParam));
        setProcessing(false);
        return;
      }

      if (!token) {
        setError('No authentication token received');
        setProcessing(false);
        return;
      }

      try {
        // Set the token in the API client
        localStorage.setItem('ai_textbook_token', token);
        api.setToken(token);

        // Fetch user data to verify token and populate auth context
        const user = await api.getCurrentUser();

        // Redirect to dashboard or home
        history.push('/dashboard');
      } catch (err) {
        console.error('OAuth callback error:', err);
        setError(err instanceof Error ? err.message : 'Authentication failed');
        localStorage.removeItem('ai_textbook_token');
        api.setToken(null);
        setProcessing(false);
      }
    };

    handleCallback();
  }, [location.search, history]);

  if (processing && !error) {
    return (
      <div className={styles.container}>
        <div className={styles.formCard}>
          <div className={styles.loadingContainer}>
            <span className={styles.spinner} />
            <p>Completing sign in...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.formCard}>
          <h1 className={styles.title}>Authentication Error</h1>
          <div className={styles.error}>{error}</div>
          <button
            onClick={() => history.push('/auth/login')}
            className={styles.submitButton}
          >
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  return null;
}

export default function CallbackPage(): JSX.Element {
  return (
    <Layout title="Signing In" description="OAuth callback">
      <BrowserOnly fallback={
        <div className={styles.container}>
          <div className={styles.formCard}>
            <div className={styles.loadingContainer}>
              <span className={styles.spinner} />
              <p>Loading...</p>
            </div>
          </div>
        </div>
      }>
        {() => <CallbackContent />}
      </BrowserOnly>
    </Layout>
  );
}
