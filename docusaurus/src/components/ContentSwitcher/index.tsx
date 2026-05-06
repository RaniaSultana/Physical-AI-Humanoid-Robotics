/**
 * ContentSwitcher component that switches between English and Urdu content.
 * Used in MDX pages to show pre-written translations.
 */

import React, { useEffect, useState } from 'react';
import { useTranslation } from '../../context/TranslationContext';
import { getTranslation } from '../../data/translations';
import styles from './styles.module.css';

interface ContentSwitcherProps {
  slug: string;
  originalTitle: string;
  originalContent: React.ReactNode;
}

export function ContentSwitcher({ slug, originalTitle, originalContent }: ContentSwitcherProps): JSX.Element {
  const { isUrdu } = useTranslation();
  const [translatedData, setTranslatedData] = useState<{ title: string; content: string } | null>(null);

  useEffect(() => {
    if (isUrdu) {
      const translation = getTranslation(slug);
      if (translation) {
        setTranslatedData({
          title: translation.urduTitle,
          content: translation.urduContent,
        });
      }
    } else {
      setTranslatedData(null);
    }
  }, [slug, isUrdu]);

  if (isUrdu && translatedData) {
    return (
      <div className={styles.translatedContent}>
        <h1 className={styles.urduTitle}>{translatedData.title}</h1>
        <div
          className={styles.urduText}
          dangerouslySetInnerHTML={{ __html: translatedData.content.replace(/\n/g, '<br/>') }}
        />
      </div>
    );
  }

  return <>{originalContent}</>;
}

export default ContentSwitcher;
