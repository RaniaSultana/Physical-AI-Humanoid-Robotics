/**
 * ChatBot component for AI-powered Q&A.
 */

import React, { useState, useRef, useEffect } from 'react';
import clsx from 'clsx';
import { useAuth } from '../../context/AuthContext';
import { useChat, Message } from './useChat';
import { CitationList } from './Citation';
import styles from './styles.module.css';

interface ChatBotProps {
  contextMode?: 'chapter' | 'course' | 'selection';
  chapterSlug?: string;
  initialOpen?: boolean;
}

export function ChatBot({
  contextMode = 'course',
  chapterSlug,
  initialOpen = false,
}: ChatBotProps): JSX.Element {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(initialOpen);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const {
    messages,
    isLoading,
    error,
    sendMessage,
    clearMessages,
  } = useChat({ contextMode, chapterSlug });

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const message = input;
    setInput('');
    await sendMessage(message);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const renderMessage = (message: Message) => {
    const isUser = message.role === 'user';

    return (
      <div
        key={message.id}
        className={clsx(styles.message, {
          [styles.userMessage]: isUser,
          [styles.assistantMessage]: !isUser,
          [styles.streaming]: message.isStreaming,
        })}
      >
        <div className={styles.messageHeader}>
          <span className={styles.messageRole}>
            {isUser ? (user?.display_name || 'You') : 'AI Assistant'}
          </span>
          <span className={styles.messageTime}>
            {message.timestamp.toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
        </div>
        <div className={styles.messageContent}>
          {message.content || (message.isStreaming && (
            <span className={styles.typingIndicator}>
              <span></span>
              <span></span>
              <span></span>
            </span>
          ))}
        </div>
        {!isUser && message.citations && message.citations.length > 0 && (
          <CitationList citations={message.citations} />
        )}
      </div>
    );
  };

  return (
    <>
      {/* Chat toggle button */}
      <button
        className={clsx(styles.chatToggle, { [styles.chatToggleOpen]: isOpen })}
        onClick={() => setIsOpen(!isOpen)}
        aria-label={isOpen ? 'Close chat' : 'Open chat'}
      >
        {isOpen ? (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        ) : (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
          </svg>
        )}
      </button>

      {/* Chat panel */}
      <div className={clsx(styles.chatPanel, { [styles.chatPanelOpen]: isOpen })}>
        <div className={styles.chatHeader}>
          <h3>AI Assistant</h3>
          <div className={styles.chatHeaderActions}>
            <button
              onClick={clearMessages}
              className={styles.clearButton}
              title="Clear chat"
              disabled={messages.length === 0}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              </svg>
            </button>
            <button
              onClick={() => setIsOpen(false)}
              className={styles.closeButton}
              title="Close chat"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
        </div>

        <div className={styles.chatBody}>
          {messages.length === 0 ? (
            <div className={styles.emptyState}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
              </svg>
              <h4>Ask me anything</h4>
              <p>I can help you understand the course material on Physical AI and Humanoid Robotics.</p>
              <div className={styles.suggestionList}>
                <button
                  onClick={() => sendMessage('What is Physical AI?')}
                  className={styles.suggestionButton}
                >
                  What is Physical AI?
                </button>
                <button
                  onClick={() => sendMessage('Explain embodied AI concepts')}
                  className={styles.suggestionButton}
                >
                  Explain embodied AI
                </button>
                <button
                  onClick={() => sendMessage('How do humanoid robots work?')}
                  className={styles.suggestionButton}
                >
                  How do humanoid robots work?
                </button>
              </div>
            </div>
          ) : (
            <div className={styles.messageList}>
              {messages.map(renderMessage)}
              <div ref={messagesEndRef} />
            </div>
          )}

          {error && (
            <div className={styles.errorMessage}>
              {error}
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className={styles.chatInput}>
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask a question..."
            disabled={isLoading}
            rows={1}
            className={styles.inputTextarea}
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className={styles.sendButton}
          >
            {isLoading ? (
              <span className={styles.loadingSpinner} />
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="22" y1="2" x2="11" y2="13"></line>
                <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
              </svg>
            )}
          </button>
        </form>
      </div>
    </>
  );
}

export default ChatBot;
