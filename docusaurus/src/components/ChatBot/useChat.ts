/**
 * Hook for managing chat state and streaming responses.
 */

import { useState, useCallback, useRef } from 'react';
import { api, Citation } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  citations?: Citation[];
  isStreaming?: boolean;
  timestamp: Date;
}

export interface UseChatOptions {
  contextMode?: 'chapter' | 'course' | 'selection';
  chapterSlug?: string;
}

export interface UseChatReturn {
  messages: Message[];
  isLoading: boolean;
  error: string | null;
  conversationId: string | null;
  sendMessage: (content: string, selectedText?: string) => Promise<void>;
  clearMessages: () => void;
  setConversationId: (id: string | null) => void;
}

export function useChat(options: UseChatOptions = {}): UseChatReturn {
  const { contextMode = 'course', chapterSlug } = options;
  const { isAuthenticated } = useAuth();

  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);

  const sendMessage = useCallback(async (content: string, selectedText?: string) => {
    if (!isAuthenticated) {
      setError('Please log in to use the AI assistant');
      return;
    }

    if (!content.trim()) return;

    // Add user message immediately
    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);
    setError(null);

    // Create placeholder for assistant message
    const assistantMessageId = `assistant-${Date.now()}`;
    const assistantMessage: Message = {
      id: assistantMessageId,
      role: 'assistant',
      content: '',
      isStreaming: true,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, assistantMessage]);

    try {
      // Cancel any previous request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();

      // Use streaming endpoint
      const response = await fetch('http://localhost:8000/api/v1/chat/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('ai_textbook_token')}`,
        },
        body: JSON.stringify({
          question: content,
          context_mode: selectedText ? 'selection' : contextMode,
          chapter_slug: chapterSlug,
          selected_text: selectedText,
          conversation_id: conversationId,
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        throw new Error('Failed to get response');
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let citations: Citation[] = [];
      let fullContent = '';

      if (reader) {
        let buffer = '';
        let currentEvent = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');

          // Keep the last incomplete line in the buffer
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.startsWith('event: ')) {
              currentEvent = line.slice(7).trim();
              continue;
            }
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              try {
                const parsed = JSON.parse(data);

                if (currentEvent === 'citations' || Array.isArray(parsed)) {
                  // This is citations data
                  citations = parsed;
                } else if (parsed.content) {
                  // This is a content chunk
                  fullContent += parsed.content;
                  setMessages(prev =>
                    prev.map(msg =>
                      msg.id === assistantMessageId
                        ? { ...msg, content: fullContent }
                        : msg
                    )
                  );
                } else if (parsed.conversation_id) {
                  // Stream complete, update conversation ID
                  setConversationId(parsed.conversation_id);
                }
                currentEvent = ''; // Reset event type
              } catch {
                // Ignore parse errors for incomplete chunks
              }
            }
          }
        }
      }

      // Finalize message with citations
      setMessages(prev =>
        prev.map(msg =>
          msg.id === assistantMessageId
            ? { ...msg, content: fullContent, citations, isStreaming: false }
            : msg
        )
      );

    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        return; // Request was cancelled
      }

      const errorMessage = err instanceof Error ? err.message : 'Failed to send message';
      setError(errorMessage);

      // Remove the empty assistant message on error
      setMessages(prev => prev.filter(msg => msg.id !== assistantMessageId));

      // Try non-streaming fallback
      try {
        const response = await api.askQuestion({
          question: content,
          context_mode: selectedText ? 'selection' : contextMode,
          chapter_slug: chapterSlug,
          selected_text: selectedText,
          conversation_id: conversationId || undefined,
        });

        const fallbackMessage: Message = {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: response.answer,
          citations: response.citations,
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, fallbackMessage]);
        setConversationId(response.conversation_id);
        setError(null);
      } catch (fallbackErr) {
        setError(fallbackErr instanceof Error ? fallbackErr.message : 'Failed to get response');
      }
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, contextMode, chapterSlug, conversationId]);

  const clearMessages = useCallback(() => {
    setMessages([]);
    setConversationId(null);
    setError(null);
  }, []);

  return {
    messages,
    isLoading,
    error,
    conversationId,
    sendMessage,
    clearMessages,
    setConversationId,
  };
}

export default useChat;
