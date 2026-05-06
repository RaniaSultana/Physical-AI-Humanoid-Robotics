/**
 * MiniChat component - enables follow-up questions in the HighlightAsk popover.
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { askFollowup, askFollowupStream, type ActionType } from './actions';
import styles from './styles.module.css';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  isStreaming?: boolean;
}

interface MiniChatProps {
  /** The text that was originally highlighted */
  selectedText: string;
  /** The initial AI explanation */
  initialExplanation: string;
  /** The action type that produced the initial explanation */
  initialAction: ActionType;
  /** Current chapter slug for context */
  chapterSlug: string | null;
  /** Callback when chat is closed */
  onClose: () => void;
  /** Whether to use streaming for responses */
  useStreaming?: boolean;
}

export function MiniChat({
  selectedText,
  initialExplanation,
  initialAction,
  chapterSlug,
  onClose,
  useStreaming = true,
}: MiniChatProps): JSX.Element {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '0',
      role: 'assistant',
      content: initialExplanation,
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const getLastAssistantMessage = useCallback((): string => {
    const assistantMessages = messages.filter((m) => m.role === 'assistant');
    return assistantMessages[assistantMessages.length - 1]?.content || initialExplanation;
  }, [messages, initialExplanation]);

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();

    const question = input.trim();
    if (!question || isLoading) return;

    const userMessageId = `user-${Date.now()}`;
    const assistantMessageId = `assistant-${Date.now()}`;

    // Add user message
    setMessages((prev) => [
      ...prev,
      {
        id: userMessageId,
        role: 'user',
        content: question,
      },
    ]);

    setInput('');
    setIsLoading(true);
    setError(null);

    try {
      if (useStreaming) {
        // Add empty assistant message for streaming
        setMessages((prev) => [
          ...prev,
          {
            id: assistantMessageId,
            role: 'assistant',
            content: '',
            isStreaming: true,
          },
        ]);

        // Stream the response
        await askFollowupStream(
          selectedText,
          getLastAssistantMessage(),
          question,
          chapterSlug,
          (chunk) => {
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === assistantMessageId
                  ? { ...msg, content: msg.content + chunk }
                  : msg
              )
            );
          }
        );

        // Mark streaming as complete
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMessageId ? { ...msg, isStreaming: false } : msg
          )
        );
      } else {
        // Non-streaming response
        const response = await askFollowup(
          selectedText,
          getLastAssistantMessage(),
          question,
          chapterSlug
        );

        setMessages((prev) => [
          ...prev,
          {
            id: assistantMessageId,
            role: 'assistant',
            content: response.explanation,
          },
        ]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get response');
      // Remove the streaming message on error
      setMessages((prev) => prev.filter((m) => m.id !== assistantMessageId));
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
    if (e.key === 'Escape') {
      onClose();
    }
  };

  const suggestedQuestions = [
    'Can you give an example?',
    'Why is this important?',
    'How does this relate to...',
  ];

  return (
    <div className={styles.miniChat}>
      <div className={styles.miniChatHeader}>
        <span className={styles.miniChatTitle}>Follow-up Questions</span>
        <button
          onClick={onClose}
          className={styles.miniChatClose}
          aria-label="Close chat"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      <div className={styles.miniChatMessages}>
        {messages.map((message) => (
          <div
            key={message.id}
            className={`${styles.miniChatMessage} ${
              message.role === 'user'
                ? styles.miniChatMessageUser
                : styles.miniChatMessageAssistant
            }`}
          >
            <div className={styles.miniChatMessageContent}>
              {message.content}
              {message.isStreaming && (
                <span className={styles.streamingCursor}>|</span>
              )}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {error && <div className={styles.miniChatError}>{error}</div>}

      {messages.length === 1 && !isLoading && (
        <div className={styles.miniChatSuggestions}>
          {suggestedQuestions.map((question, index) => (
            <button
              key={index}
              onClick={() => {
                setInput(question);
                inputRef.current?.focus();
              }}
              className={styles.miniChatSuggestion}
            >
              {question}
            </button>
          ))}
        </div>
      )}

      <form onSubmit={handleSubmit} className={styles.miniChatForm}>
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask a follow-up question..."
          disabled={isLoading}
          className={styles.miniChatInput}
        />
        <button
          type="submit"
          disabled={!input.trim() || isLoading}
          className={styles.miniChatSubmit}
        >
          {isLoading ? (
            <span className={styles.miniChatSpinner} />
          ) : (
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          )}
        </button>
      </form>
    </div>
  );
}

export default MiniChat;
