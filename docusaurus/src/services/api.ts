/**
 * API client service for backend communication.
 */

const API_BASE_URL = 'http://localhost:8000/api/v1';

interface RequestOptions extends RequestInit {
  token?: string;
}

class ApiClient {
  private baseUrl: string;
  private token: string | null = null;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  setToken(token: string | null): void {
    this.token = token;
  }

  // Expose baseUrl and headers for compatibility with code expecting axios-like defaults
  get defaults(): { baseURL: string; headers: Record<string, string> } {
    return {
      baseURL: this.baseUrl,
      headers: this.token ? { Authorization: `Bearer ${this.token}` } : {},
    };
  }

  // Generic HTTP methods for flexibility
  async get<T>(endpoint: string, options: RequestOptions = {}): Promise<{ data: T }> {
    const result = await this.request<T>(endpoint, { ...options, method: 'GET' });
    return { data: result };
  }

  async post<T>(endpoint: string, data?: unknown, options: RequestOptions = {}): Promise<{ data: T }> {
    const result = await this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
    return { data: result };
  }

  async put<T>(endpoint: string, data?: unknown, options: RequestOptions = {}): Promise<{ data: T }> {
    const result = await this.request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
    return { data: result };
  }

  async delete<T>(endpoint: string, options: RequestOptions = {}): Promise<{ data: T }> {
    const result = await this.request<T>(endpoint, { ...options, method: 'DELETE' });
    return { data: result };
  }

  private async request<T>(
    endpoint: string,
    options: RequestOptions = {}
  ): Promise<T> {
    const { token, ...fetchOptions } = options;

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    const authToken = token || this.token;
    if (authToken) {
      (headers as Record<string, string>)['Authorization'] = `Bearer ${authToken}`;
    }

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...fetchOptions,
      headers,
    });

    if (!response.ok) {
      const errorBody = await response.json().catch(() => null);
      // FastAPI returns errors as { detail: "message" }
      const errorMessage = errorBody?.detail || errorBody?.message || `HTTP ${response.status}`;
      throw new Error(errorMessage);
    }

    // Handle no content responses
    if (response.status === 204) {
      return {} as T;
    }

    return response.json();
  }

  // Auth endpoints
  async register(email: string, password: string, displayName?: string) {
    return this.request<{ user: User; access_token: string }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, display_name: displayName }),
    });
  }

  async login(email: string, password: string) {
    return this.request<{ user: User; access_token: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  async logout() {
    return this.request<void>('/auth/logout', { method: 'POST' });
  }

  async getCurrentUser() {
    return this.request<User>('/auth/me');
  }

  // OAuth endpoints
  async initiateOAuth(provider: 'google' | 'github') {
    // This will redirect to the OAuth provider, so we return the URL
    return `${this.baseUrl}/auth/oauth/${provider}`;
  }

  async updateBackground(data: BackgroundData) {
    return this.request<User>('/auth/me/background', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // Chat endpoints
  async askQuestion(data: AskQuestionRequest) {
    return this.request<ChatResponse>('/chat/ask', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async streamQuestion(question: string, options?: ChatOptions): Promise<ReadableStream> {
    const response = await fetch(`${this.baseUrl}/chat/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(this.token && { Authorization: `Bearer ${this.token}` }),
      },
      body: JSON.stringify({ question, ...options }),
    });

    if (!response.ok || !response.body) {
      throw new Error('Failed to start stream');
    }

    return response.body;
  }

  // Content endpoints
  async getChapters(week?: number) {
    const params = week ? `?week=${week}` : '';
    return this.request<ChapterTree>(`/content/chapters${params}`);
  }

  async getChapter(slug: string) {
    return this.request<Chapter>(`/content/chapters/${encodeURIComponent(slug)}`);
  }

  // Progress endpoints
  async getProgress() {
    return this.request<ProgressList>('/progress');
  }

  async updateProgress(chapterId: string, data: ProgressUpdate) {
    return this.request<ReadingProgress>(`/progress/${chapterId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // Quiz endpoints
  async generateQuiz(chapterId: string, options?: QuizOptions) {
    return this.request<Quiz>(`/chapters/${chapterId}/quiz`, {
      method: 'POST',
      body: JSON.stringify(options || {}),
    });
  }

  async submitQuizAttempt(quizId: string, attemptId: string, answers: QuizAnswer[]) {
    return this.request<QuizResult>(`/quizzes/${quizId}/attempts/${attemptId}/submit`, {
      method: 'POST',
      body: JSON.stringify({ answers }),
    });
  }

  // Flashcard endpoints
  async generateFlashcards(chapterId: string) {
    return this.request<FlashcardDeck>(`/chapters/${chapterId}/flashcards`, {
      method: 'POST',
    });
  }

  async getDueFlashcards(deckId?: string) {
    const params = deckId ? `?deck_id=${deckId}` : '';
    return this.request<DueFlashcards>(`/reviews/due${params}`);
  }

  async submitFlashcardReview(sessionId: string, flashcardId: string, quality: number) {
    return this.request<ReviewResult>(`/reviews/session/${sessionId}/review`, {
      method: 'POST',
      body: JSON.stringify({ flashcard_id: flashcardId, quality }),
    });
  }

  // Authoring endpoints (T105-T111)
  async getAuthoringChapters(includeDrafts: boolean = true) {
    return this.request<ChapterTree>(`/content/chapters?include_drafts=${includeDrafts}`);
  }

  async createChapter(data: CreateChapterRequest) {
    return this.request<ChapterFull>('/content/chapters', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateChapter(chapterId: string, data: UpdateChapterRequest) {
    return this.request<ChapterFull>(`/content/chapters/${chapterId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteChapter(chapterId: string) {
    return this.request<void>(`/content/chapters/${chapterId}`, {
      method: 'DELETE',
    });
  }

  async publishChapter(chapterId: string, content?: string) {
    return this.request<ChapterFull>(`/content/chapters/${chapterId}/publish`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    });
  }

  async unpublishChapter(chapterId: string) {
    return this.request<ChapterFull>(`/content/chapters/${chapterId}/unpublish`, {
      method: 'POST',
    });
  }

  async reorderChapters(chapters: ReorderChapterRequest[]) {
    return this.request<ChapterFull[]>('/content/chapters/reorder', {
      method: 'PUT',
      body: JSON.stringify({ chapters }),
    });
  }

  async reindexChapter(chapterId: string, content: string) {
    return this.request<{ message: string; chapter_id: string }>(`/content/chapters/${chapterId}/reindex`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    });
  }
}

// Types
export interface User {
  id: string;
  email: string;
  display_name: string | null;
  background_type: string | null;
  background_other: string | null;
  software_experience: string | null;
  hardware_experience: string | null;
  learning_goals: string | null;
  preferred_language: 'en' | 'ur';
  role: 'student' | 'author';
  created_at: string;
  has_background?: boolean;
}

export interface BackgroundData {
  background_type: string;
  background_other?: string;
  software_experience?: string;
  hardware_experience?: string;
  learning_goals?: string;
}

export interface AskQuestionRequest {
  question: string;
  context_mode?: 'chapter' | 'course' | 'selection';
  chapter_slug?: string;
  selected_text?: string;
  conversation_id?: string;
}

export interface ChatOptions {
  context_mode?: 'chapter' | 'course' | 'selection';
  selected_text?: string;
  conversation_id?: string;
  chapter_slug?: string;
}

export interface ChatResponse {
  answer: string;
  citations: Citation[];
  conversation_id: string;
  message_id: string;
}

export interface Citation {
  chapter_slug: string;
  section_title: string;
  content_preview: string;
  relevance_score: number;
}

export interface ChapterTree {
  course_id: string;
  course_title: string;
  weeks: WeekNode[];
}

export interface WeekNode {
  week_number: number;
  title: string;
  modules: ModuleNode[];
}

export interface ModuleNode {
  module_number: number;
  title: string;
  chapters: ChapterSummary[];
}

export interface ChapterSummary {
  id: string;
  chapter_number: number;
  slug: string;
  title: string;
  estimated_read_time: number;
}

export interface Chapter extends ChapterSummary {
  week_number: number;
  module_number: number;
  word_count: number;
  status: 'draft' | 'published';
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ReadingProgress {
  chapter_id: string;
  scroll_position: number;
  completed: boolean;
  completed_at: string | null;
  total_time_seconds: number;
  last_accessed_at: string;
}

export interface ProgressList {
  progress: ReadingProgress[];
  total_chapters: number;
  completed_chapters: number;
  overall_completion: number;
}

export interface ProgressUpdate {
  scroll_position?: number;
  time_spent_seconds?: number;
}

export interface Quiz {
  id: string;
  chapter_id: string;
  chapter_title: string;
  questions: QuizQuestion[];
  question_count: number;
  difficulty: string;
  created_at: string;
}

export interface QuizQuestion {
  id: string;
  question_type: 'mcq' | 'true_false';
  question_text: string;
  options: QuestionOption[];
  difficulty: string;
  order: number;
}

export interface QuestionOption {
  id: string;
  text: string;
  is_correct?: boolean;
}

export interface QuizOptions {
  question_count?: number;
  question_types?: string[];
  difficulty?: string;
}

export interface QuizAnswer {
  question_id: string;
  selected_option_id: string;
}

export interface QuizResult {
  attempt_id: string;
  quiz_id: string;
  score: number;
  correct_count: number;
  total_count: number;
  time_taken_seconds: number;
  questions: QuestionResult[];
  completed_at: string;
}

export interface QuestionResult {
  question_id: string;
  question_text: string;
  is_correct: boolean;
  explanation: string;
}

export interface FlashcardDeck {
  id: string;
  chapter_id: string;
  chapter_title: string;
  flashcards: Flashcard[];
  card_count: number;
  due_count: number;
  mastered_count: number;
  created_at: string;
}

export interface Flashcard {
  id: string;
  deck_id: string;
  front: string;
  back: string;
  difficulty: string;
  easiness_factor: number;
  interval: number;
  repetitions: number;
  next_review_date: string;
}

export interface DueFlashcards {
  total_due: number;
  flashcards: Flashcard[];
}

export interface ReviewResult {
  flashcard_id: string;
  quality: number;
  passed: boolean;
  new_interval: number;
  new_easiness_factor: number;
  next_review_date: string;
  cards_remaining: number;
}

// Authoring types
export interface ChapterFull extends Chapter {
  content?: string;
}

export interface CreateChapterRequest {
  week_number: number;
  module_number: number;
  chapter_number: number;
  slug: string;
  title: string;
  content?: string;
}

export interface UpdateChapterRequest {
  title?: string;
  content?: string;
  week_number?: number;
  module_number?: number;
  chapter_number?: number;
}

export interface ReorderChapterRequest {
  chapter_id: string;
  new_week_number: number;
  new_module_number: number;
  new_chapter_number: number;
}

// Export singleton instance
export const api = new ApiClient();
export default api;
