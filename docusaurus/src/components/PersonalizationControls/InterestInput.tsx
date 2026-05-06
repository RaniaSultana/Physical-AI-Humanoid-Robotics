/**
 * InterestInput Component (T124)
 *
 * Input component for specifying personalization interests with tag-like chips.
 */

import React, { useState, useCallback, KeyboardEvent } from 'react';
import styles from './styles.module.css';

interface InterestInputProps {
  value: string[];
  onChange: (interests: string[]) => void;
  suggestions?: string[];
  maxInterests?: number;
  placeholder?: string;
  disabled?: boolean;
}

export function InterestInput({
  value,
  onChange,
  suggestions = [],
  maxInterests = 5,
  placeholder = 'Add an interest...',
  disabled = false,
}: InterestInputProps): JSX.Element {
  const [inputValue, setInputValue] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);

  const handleAddInterest = useCallback(
    (interest: string) => {
      const trimmed = interest.trim();
      if (
        trimmed &&
        !value.includes(trimmed) &&
        value.length < maxInterests
      ) {
        onChange([...value, trimmed]);
        setInputValue('');
      }
    },
    [value, onChange, maxInterests]
  );

  const handleRemoveInterest = useCallback(
    (interest: string) => {
      onChange(value.filter((i) => i !== interest));
    },
    [value, onChange]
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter' || e.key === ',') {
        e.preventDefault();
        handleAddInterest(inputValue);
      } else if (e.key === 'Backspace' && !inputValue && value.length > 0) {
        handleRemoveInterest(value[value.length - 1]);
      }
    },
    [inputValue, value, handleAddInterest, handleRemoveInterest]
  );

  const filteredSuggestions = suggestions.filter(
    (s) =>
      !value.includes(s) &&
      s.toLowerCase().includes(inputValue.toLowerCase())
  );

  return (
    <div className={styles.interestInputContainer}>
      <div className={styles.interestChips}>
        {value.map((interest) => (
          <span key={interest} className={styles.interestChip}>
            {interest}
            <button
              type="button"
              className={styles.removeChip}
              onClick={() => handleRemoveInterest(interest)}
              disabled={disabled}
              aria-label={`Remove ${interest}`}
            >
              x
            </button>
          </span>
        ))}
        {value.length < maxInterests && (
          <input
            type="text"
            className={styles.interestInput}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
            placeholder={value.length === 0 ? placeholder : ''}
            disabled={disabled}
          />
        )}
      </div>

      {showSuggestions && filteredSuggestions.length > 0 && (
        <div className={styles.suggestions}>
          <div className={styles.suggestionsLabel}>Suggestions:</div>
          {filteredSuggestions.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              className={styles.suggestionItem}
              onMouseDown={() => handleAddInterest(suggestion)}
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}

      <div className={styles.interestHint}>
        {value.length}/{maxInterests} interests - Press Enter or comma to add
      </div>
    </div>
  );
}

export default InterestInput;
