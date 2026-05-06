/**
 * Background selector component for user onboarding.
 */

import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import styles from './styles.module.css';

const BACKGROUND_OPTIONS = [
  {
    value: 'cs_student',
    label: 'Computer Science Student',
    description: 'Familiar with programming and software concepts',
    icon: '💻',
  },
  {
    value: 'me_student',
    label: 'Mechanical Engineering Student',
    description: 'Understanding of mechanics and physical systems',
    icon: '⚙️',
  },
  {
    value: 'ee_student',
    label: 'Electrical Engineering Student',
    description: 'Knowledge of electronics and control systems',
    icon: '⚡',
  },
  {
    value: 'hobbyist',
    label: 'Hobbyist / Maker',
    description: 'Self-taught with hands-on project experience',
    icon: '🔧',
  },
  {
    value: 'professional',
    label: 'Industry Professional',
    description: 'Working in robotics or related field',
    icon: '🏢',
  },
  {
    value: 'other',
    label: 'Other Background',
    description: 'Different educational or professional background',
    icon: '🎓',
  },
];

const EXPERIENCE_LEVELS = [
  { value: 'none', label: 'No Experience', description: 'Complete beginner' },
  { value: 'beginner', label: 'Beginner', description: 'Some basic knowledge' },
  { value: 'intermediate', label: 'Intermediate', description: 'Working knowledge' },
  { value: 'advanced', label: 'Advanced', description: 'Expert level' },
];

interface BackgroundSelectorProps {
  onComplete?: () => void;
  showSkip?: boolean;
}

export function BackgroundSelector({
  onComplete,
  showSkip = true,
}: BackgroundSelectorProps): JSX.Element {
  const { updateBackground, isLoading, error } = useAuth();
  const [step, setStep] = useState(1);
  const [backgroundType, setBackgroundType] = useState<string | null>(null);
  const [backgroundOther, setBackgroundOther] = useState('');
  const [softwareExp, setSoftwareExp] = useState<string | null>(null);
  const [hardwareExp, setHardwareExp] = useState<string | null>(null);
  const [learningGoals, setLearningGoals] = useState('');

  const handleSubmit = async () => {
    if (!backgroundType) return;

    try {
      await updateBackground({
        background_type: backgroundType,
        background_other: backgroundType === 'other' ? backgroundOther : undefined,
        software_experience: softwareExp || undefined,
        hardware_experience: hardwareExp || undefined,
        learning_goals: learningGoals || undefined,
      });
      onComplete?.();
    } catch {
      // Error handled by context
    }
  };

  const canProceed = () => {
    if (step === 1) return backgroundType !== null;
    if (step === 2) return softwareExp !== null && hardwareExp !== null;
    return true;
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2 className={styles.title}>
          {step === 1 && 'Tell us about your background'}
          {step === 2 && 'Rate your experience'}
          {step === 3 && 'What do you want to learn?'}
        </h2>
        <p className={styles.subtitle}>
          {step === 1 && 'This helps us personalize explanations to your level'}
          {step === 2 && 'We\'ll adjust content complexity accordingly'}
          {step === 3 && 'Share your learning goals (optional)'}
        </p>
        <div className={styles.progress}>
          <div className={styles.progressBar} style={{ width: `${(step / 3) * 100}%` }} />
        </div>
      </div>

      {error && <div className={styles.error}>{error}</div>}

      <div className={styles.content}>
        {step === 1 && (
          <div className={styles.options}>
            {BACKGROUND_OPTIONS.map((option) => (
              <button
                key={option.value}
                className={`${styles.optionCard} ${backgroundType === option.value ? styles.selected : ''}`}
                onClick={() => setBackgroundType(option.value)}
              >
                <span className={styles.optionIcon}>{option.icon}</span>
                <span className={styles.optionLabel}>{option.label}</span>
                <span className={styles.optionDescription}>{option.description}</span>
              </button>
            ))}
          </div>
        )}

        {step === 1 && backgroundType === 'other' && (
          <div className={styles.otherInput}>
            <label htmlFor="other-background">Please describe your background:</label>
            <input
              id="other-background"
              type="text"
              value={backgroundOther}
              onChange={(e) => setBackgroundOther(e.target.value)}
              placeholder="e.g., Physics student, Data scientist"
              className={styles.input}
            />
          </div>
        )}

        {step === 2 && (
          <div className={styles.experienceSection}>
            <div className={styles.experienceGroup}>
              <h3 className={styles.experienceTitle}>Software / Programming Experience</h3>
              <div className={styles.experienceOptions}>
                {EXPERIENCE_LEVELS.map((level) => (
                  <button
                    key={level.value}
                    className={`${styles.experienceCard} ${softwareExp === level.value ? styles.selected : ''}`}
                    onClick={() => setSoftwareExp(level.value)}
                  >
                    <span className={styles.experienceLabel}>{level.label}</span>
                    <span className={styles.experienceDesc}>{level.description}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className={styles.experienceGroup}>
              <h3 className={styles.experienceTitle}>Hardware / Electronics Experience</h3>
              <div className={styles.experienceOptions}>
                {EXPERIENCE_LEVELS.map((level) => (
                  <button
                    key={level.value}
                    className={`${styles.experienceCard} ${hardwareExp === level.value ? styles.selected : ''}`}
                    onClick={() => setHardwareExp(level.value)}
                  >
                    <span className={styles.experienceLabel}>{level.label}</span>
                    <span className={styles.experienceDesc}>{level.description}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className={styles.goalsSection}>
            <textarea
              value={learningGoals}
              onChange={(e) => setLearningGoals(e.target.value)}
              placeholder="What do you hope to learn from this course? What projects are you interested in? (Optional)"
              className={styles.textarea}
              rows={5}
            />
          </div>
        )}
      </div>

      <div className={styles.actions}>
        {step > 1 && (
          <button
            className={styles.backButton}
            onClick={() => setStep(step - 1)}
            disabled={isLoading}
          >
            Back
          </button>
        )}

        {showSkip && step < 3 && (
          <button
            className={styles.skipButton}
            onClick={onComplete}
            disabled={isLoading}
          >
            Skip for now
          </button>
        )}

        {step < 3 ? (
          <button
            className={styles.nextButton}
            onClick={() => setStep(step + 1)}
            disabled={!canProceed() || isLoading}
          >
            Continue
          </button>
        ) : (
          <button
            className={styles.submitButton}
            onClick={handleSubmit}
            disabled={isLoading}
          >
            {isLoading ? 'Saving...' : 'Complete Setup'}
          </button>
        )}
      </div>
    </div>
  );
}

export default BackgroundSelector;
