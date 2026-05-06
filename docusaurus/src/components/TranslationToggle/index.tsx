/**
 * TranslationToggle component for switching between English and Urdu content.
 * Uses pre-written translations stored in data/translations.ts
 */

import React from 'react';
import clsx from 'clsx';
import { useTranslation } from '../../context/TranslationContext';
import { getTranslation } from '../../data/translations';
import styles from './styles.module.css';

interface TranslationToggleProps {
  slug?: string;
}

export function TranslationToggle({ slug }: TranslationToggleProps): JSX.Element {
  const { language, setLanguage, isUrdu } = useTranslation();

  const handleUrduClick = () => {
    if (slug) {
      const translation = getTranslation(slug);
      if (translation) {
        // Store the translation for the content component to use
        localStorage.setItem(`translation_${slug}`, JSON.stringify({
          title: translation.urduTitle,
          content: translation.urduContent,
        }));
      }
    }
    setLanguage('ur');
  };

  const handleEnglishClick = () => {
    if (slug) {
      localStorage.removeItem(`translation_${slug}`);
    }
    setLanguage('en');
  };

  return (
    <div className={styles.container}>
      <div className={styles.toggleWrapper}>
        <span className={styles.label}>Language / زبان:</span>
        <div className={styles.toggle}>
          <button
            className={clsx(styles.toggleButton, {
              [styles.active]: language === 'en',
            })}
            onClick={handleEnglishClick}
          >
            English
          </button>
          <button
            className={clsx(styles.toggleButton, {
              [styles.active]: isUrdu,
            })}
            onClick={handleUrduClick}
          >
            اردو
          </button>
        </div>
      </div>
    </div>
  );
}

export default TranslationToggle;
