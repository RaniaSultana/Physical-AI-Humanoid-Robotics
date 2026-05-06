/**
 * Quick actions for the HighlightAsk component.
 *
 * Defines available actions and their configurations for processing highlighted text.
 */

import { api } from '../../services/api';

/**
 * Available quick action types that map to backend HighlightAction enum.
 */
export type ActionType =
  | 'explain'
  | 'example'
  | 'simplify'
  | 'go_deeper'
  | 'define'
  | 'compare';

/**
 * Action configuration with display properties.
 */
export interface ActionConfig {
  /** Unique action identifier */
  type: ActionType;
  /** Display label for the action button */
  label: string;
  /** Tooltip/description for the action */
  description: string;
  /** SVG icon path (d attribute for path element) */
  iconPath: string;
  /** Optional secondary icon path */
  iconPath2?: string;
  /** Keyboard shortcut (shown in tooltip) */
  shortcut?: string;
  /** Whether action is available for short selections (< 20 chars) */
  availableForShort: boolean;
  /** Whether action is available for long selections (> 500 chars) */
  availableForLong: boolean;
}

/**
 * Configuration for all available quick actions.
 */
export const QUICK_ACTIONS: ActionConfig[] = [
  {
    type: 'explain',
    label: 'Explain',
    description: 'Get a clear explanation of this concept',
    iconPath: 'M12 2L2 7l10 5 10-5-10-5z',
    iconPath2: 'M2 17l10 5 10-5M2 12l10 5 10-5',
    shortcut: 'E',
    availableForShort: true,
    availableForLong: true,
  },
  {
    type: 'example',
    label: 'Example',
    description: 'Show practical examples of this concept',
    iconPath:
      'M12 2L15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2z',
    shortcut: 'X',
    availableForShort: true,
    availableForLong: true,
  },
  {
    type: 'simplify',
    label: 'Simplify',
    description: 'Explain in simpler terms',
    iconPath: 'M4 19.5A2.5 2.5 0 0 1 6.5 17H20',
    iconPath2: 'M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z',
    shortcut: 'S',
    availableForShort: true,
    availableForLong: true,
  },
  {
    type: 'go_deeper',
    label: 'Go Deeper',
    description: 'Learn more advanced details',
    iconPath: 'M8 3v4l-4 4 4 4v4h4l4-4 4 4h4v-4l-4-4 4-4V3h-4L12 7 8 3z',
    shortcut: 'D',
    availableForShort: true,
    availableForLong: true,
  },
  {
    type: 'define',
    label: 'Define',
    description: 'Get a concise definition',
    iconPath: 'M4 7V4h16v3M9 20h6M12 4v16',
    shortcut: 'F',
    availableForShort: true,
    availableForLong: false, // Not useful for long selections
  },
  {
    type: 'compare',
    label: 'Compare',
    description: 'Compare with related concepts',
    iconPath: 'M16 3h5v5M4 20L21 3M21 16v5h-5M15 15l6 6M4 4l5 5',
    shortcut: 'C',
    availableForShort: true,
    availableForLong: true,
  },
];

/**
 * Response from the highlight API.
 */
export interface HighlightResponse {
  explanation: string;
  action: ActionType;
  citations: Array<{
    chapter_id: string;
    chapter_slug: string;
    section: string;
    quote: string;
  }>;
}

/**
 * Get actions available for the given selection length.
 */
export function getAvailableActions(textLength: number): ActionConfig[] {
  const isShort = textLength < 20;
  const isLong = textLength > 500;

  return QUICK_ACTIONS.filter((action) => {
    if (isShort && !action.availableForShort) return false;
    if (isLong && !action.availableForLong) return false;
    return true;
  });
}

/**
 * Execute a quick action on selected text.
 *
 * @param action - The action type to execute
 * @param selectedText - The text selected by the user
 * @param chapterSlug - The current chapter slug
 * @param surroundingContext - Optional surrounding context
 * @returns Promise resolving to the AI response
 */
export async function executeAction(
  action: ActionType,
  selectedText: string,
  chapterSlug: string | null,
  surroundingContext?: string
): Promise<HighlightResponse> {
  const response = await api.post<HighlightResponse>('/chat/highlight', {
    selected_text: selectedText,
    action,
    chapter_slug: chapterSlug,
    surrounding_context: surroundingContext,
  });

  return response.data;
}

/**
 * Execute a quick action with streaming response.
 *
 * @param action - The action type to execute
 * @param selectedText - The text selected by the user
 * @param chapterSlug - The current chapter slug
 * @param onChunk - Callback for each streamed chunk
 * @param surroundingContext - Optional surrounding context
 * @returns Promise resolving when streaming is complete
 */
export async function executeActionStream(
  action: ActionType,
  selectedText: string,
  chapterSlug: string | null,
  onChunk: (chunk: string) => void,
  surroundingContext?: string
): Promise<void> {
  const baseUrl = api.defaults.baseURL;
  const response = await fetch(`${baseUrl}/chat/highlight/stream`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...api.defaults.headers,
    },
    body: JSON.stringify({
      selected_text: selectedText,
      action,
      chapter_slug: chapterSlug,
      surrounding_context: surroundingContext,
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to stream highlight response: ${response.statusText}`);
  }

  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error('No response body available');
  }

  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });

    // Process SSE events
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = line.slice(6);
        if (data === '[DONE]') {
          return;
        }
        try {
          const parsed = JSON.parse(data);
          if (parsed.content) {
            onChunk(parsed.content);
          }
        } catch {
          // If not JSON, treat as plain text chunk
          onChunk(data);
        }
      }
    }
  }
}

/**
 * Send a follow-up question about highlighted text.
 *
 * @param selectedText - The originally highlighted text
 * @param originalExplanation - The previous AI explanation
 * @param followupQuestion - The user's follow-up question
 * @param chapterSlug - The current chapter slug
 * @returns Promise resolving to the AI response
 */
export async function askFollowup(
  selectedText: string,
  originalExplanation: string,
  followupQuestion: string,
  chapterSlug: string | null
): Promise<HighlightResponse> {
  const response = await api.post<HighlightResponse>('/chat/highlight/followup', {
    selected_text: selectedText,
    original_explanation: originalExplanation,
    followup_question: followupQuestion,
    chapter_slug: chapterSlug,
  });

  return response.data;
}

/**
 * Stream a follow-up question response.
 *
 * @param selectedText - The originally highlighted text
 * @param originalExplanation - The previous AI explanation
 * @param followupQuestion - The user's follow-up question
 * @param chapterSlug - The current chapter slug
 * @param onChunk - Callback for each streamed chunk
 * @returns Promise resolving when streaming is complete
 */
export async function askFollowupStream(
  selectedText: string,
  originalExplanation: string,
  followupQuestion: string,
  chapterSlug: string | null,
  onChunk: (chunk: string) => void
): Promise<void> {
  const baseUrl = api.defaults.baseURL;
  const response = await fetch(`${baseUrl}/chat/highlight/followup/stream`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...api.defaults.headers,
    },
    body: JSON.stringify({
      selected_text: selectedText,
      original_explanation: originalExplanation,
      followup_question: followupQuestion,
      chapter_slug: chapterSlug,
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to stream followup response: ${response.statusText}`);
  }

  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error('No response body available');
  }

  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });

    // Process SSE events
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = line.slice(6);
        if (data === '[DONE]') {
          return;
        }
        try {
          const parsed = JSON.parse(data);
          if (parsed.content) {
            onChunk(parsed.content);
          }
        } catch {
          onChunk(data);
        }
      }
    }
  }
}

/**
 * Get the keyboard shortcut handler map.
 */
export function getShortcutMap(): Record<string, ActionType> {
  const map: Record<string, ActionType> = {};
  for (const action of QUICK_ACTIONS) {
    if (action.shortcut) {
      map[action.shortcut.toLowerCase()] = action.type;
    }
  }
  return map;
}

/**
 * Get action config by type.
 */
export function getActionConfig(type: ActionType): ActionConfig | undefined {
  return QUICK_ACTIONS.find((action) => action.type === type);
}
