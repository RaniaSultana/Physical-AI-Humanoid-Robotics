/**
 * Onboarding modal component that appears for new users.
 */

import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { BackgroundSelector } from './BackgroundSelector';
import styles from './styles.module.css';

interface OnboardingModalProps {
  forceShow?: boolean;
  onComplete?: () => void;
}

export function OnboardingModal({
  forceShow = false,
  onComplete,
}: OnboardingModalProps): JSX.Element | null {
  const { user, isAuthenticated } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // Show onboarding if user is authenticated but hasn't set background
    if (isAuthenticated && user && !user.has_background) {
      setIsOpen(true);
    }
  }, [isAuthenticated, user]);

  // Allow forcing the modal open
  useEffect(() => {
    if (forceShow) {
      setIsOpen(true);
    }
  }, [forceShow]);

  const handleComplete = () => {
    setIsOpen(false);
    onComplete?.();
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modal}>
        <div className={styles.modalHeader}>
          <div className={styles.modalIcon}>🤖</div>
          <h1 className={styles.modalTitle}>Welcome to Physical AI</h1>
          <p className={styles.modalSubtitle}>
            Let's personalize your learning experience
          </p>
        </div>
        <BackgroundSelector onComplete={handleComplete} showSkip={true} />
      </div>
    </div>
  );
}

// Add these styles to the styles.module.css
const modalStyles = `
.modalOverlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  padding: 20px;
}

.modal {
  background: var(--ifm-background-color);
  border-radius: 16px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  max-width: 640px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
}

.modalHeader {
  text-align: center;
  padding: 32px 24px 0;
}

.modalIcon {
  font-size: 3rem;
  margin-bottom: 12px;
}

.modalTitle {
  margin: 0 0 8px 0;
  font-size: 1.75rem;
  font-weight: 700;
  color: var(--ifm-color-gray-900);
}

.modalSubtitle {
  margin: 0;
  font-size: 1rem;
  color: var(--ifm-color-gray-600);
}
`;

export { BackgroundSelector } from './BackgroundSelector';
export default OnboardingModal;
