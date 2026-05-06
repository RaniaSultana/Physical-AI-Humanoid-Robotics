/**
 * Language toggle for the navbar - switches between English and Urdu.
 */

import React from 'react';
import { useTranslation } from '../../context/TranslationContext';
import styles from './LanguageToggle.module.css';

export function LanguageToggle(): JSX.Element {
  const { language, setLanguage, isUrdu } = useTranslation();

  return (
    <div className={styles.languageToggle}>
      <button
        className={`${styles.langButton} ${language === 'en' ? styles.active : ''}`}
        onClick={() => setLanguage('en')}
        title="English"
      >
        EN
      </button>
      <span className={styles.divider}>|</span>
      <button
        className={`${styles.langButton} ${isUrdu ? styles.active : ''}`}
        onClick={() => setLanguage('ur')}
        title="اردو"
      >
        اردو
      </button>
    </div>
  );
}

export default LanguageToggle;
