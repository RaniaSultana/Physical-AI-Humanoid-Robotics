/**
 * QuizPanel component for taking AI-generated quizzes.
 * Works with or without authentication - generates quizzes via AI API.
 */

import React, { useState, useCallback } from 'react';
import clsx from 'clsx';
import { QuestionCard } from './QuestionCard';
import { QuizResults } from './Results';
import styles from './styles.module.css';

// Base storage key for quiz results - will be combined with user ID
const QUIZ_STORAGE_KEY_BASE = 'ai_textbook_quiz_results';

// Get the current user ID from localStorage
function getCurrentUserId(): string {
  try {
    const token = localStorage.getItem('ai_textbook_token');
    if (token) {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.sub || payload.user_id || 'authenticated';
    }
  } catch {
    // Token decode failed
  }
  return 'guest';
}

// Get user-specific quiz storage key
function getQuizStorageKey(): string {
  return `${QUIZ_STORAGE_KEY_BASE}_${getCurrentUserId()}`;
}

// Save quiz result to localStorage for dashboard (user-specific)
function saveQuizResultToStorage(chapterSlug: string, score: number, totalQuestions: number): void {
  try {
    const key = getQuizStorageKey();
    const existing = localStorage.getItem(key);
    const results = existing ? JSON.parse(existing) : [];
    results.push({
      chapterSlug,
      score: Math.round(score),
      totalQuestions,
      timestamp: new Date().toISOString(),
    });
    // Keep only last 50 results
    const trimmed = results.slice(-50);
    localStorage.setItem(key, JSON.stringify(trimmed));
  } catch {
    // Storage might be full
  }
}

interface QuizQuestion {
  id: string;
  question_type: 'mcq' | 'true_false';
  question_text: string;
  options: Array<{
    id: string;
    text: string;
    is_correct?: boolean;
  }>;
  difficulty: string;
  order: number;
  explanation?: string;
}

interface Quiz {
  id: string;
  title: string;
  questions: QuizQuestion[];
  question_count: number;
  difficulty: string;
}

interface QuizResult {
  score: number;
  correct_count: number;
  total_count: number;
  time_taken_seconds: number;
  questions: Array<{
    question_id: string;
    is_correct: boolean;
    correct_option_id: string;
    explanation?: string;
  }>;
}

interface QuizPanelProps {
  chapterSlug: string;
  chapterTitle?: string;
  onClose?: () => void;
  userBackground?: string | null;
}

export function QuizPanel({
  chapterSlug,
  chapterTitle,
  onClose,
  userBackground,
}: QuizPanelProps): JSX.Element {
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<QuizResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [startTime, setStartTime] = useState<number | null>(null);

  // Quiz settings
  const [questionCount, setQuestionCount] = useState(5);
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard' | 'mixed'>('mixed');

  const generateQuiz = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    let questions: QuizQuestion[];

    try {
      // Try to use the chat API to generate quiz questions (full URL since no proxy)
      const response = await fetch('http://localhost:8000/api/v1/chat/ask', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question: `Generate a quiz with ${questionCount} ${difficulty === 'mixed' ? '' : difficulty} multiple choice questions about the content in this chapter: ${chapterTitle || chapterSlug}.

Format your response as a JSON array of questions. Each question should have:
- id: a unique string (q1, q2, etc.)
- question_type: "mcq"
- question_text: the question
- options: array of 4 options, each with id (a, b, c, d), text, and is_correct (boolean, only one should be true)
- difficulty: "${difficulty === 'mixed' ? 'medium' : difficulty}"
- explanation: brief explanation of the correct answer

IMPORTANT: Only respond with valid JSON array, no markdown, no code blocks, no other text. Start with [ and end with ].`,
          context_mode: 'course',
          chapter_slug: chapterSlug,
        }),
      });

      if (!response.ok) {
        // Fall back to sample questions if API fails
        console.warn('Quiz API failed, using sample questions');
        questions = generateSampleQuestions(chapterSlug, chapterTitle || '', questionCount);
      } else {
        const data = await response.json();

        // Try to parse the AI response as JSON
        try {
          // Extract JSON from the response - handle various formats
          let jsonStr = data.answer;

          // Remove markdown code blocks if present
          jsonStr = jsonStr.replace(/```json\s*/g, '').replace(/```\s*/g, '');

          // Find JSON array
          const jsonMatch = jsonStr.match(/\[[\s\S]*\]/);
          if (jsonMatch) {
            questions = JSON.parse(jsonMatch[0]);
            // Validate the questions have required fields
            if (!questions.length || !questions[0].question_text || !questions[0].options) {
              throw new Error('Invalid question format');
            }
          } else {
            throw new Error('Could not find quiz questions in response');
          }
        } catch (parseErr) {
          // Fallback: generate sample questions if AI response isn't parseable
          console.warn('Failed to parse AI quiz response, using sample questions', parseErr);
          questions = generateSampleQuestions(chapterSlug, chapterTitle || '', questionCount);
        }
      }
    } catch (err) {
      // Network error or other failure - use sample questions
      console.warn('Quiz generation error, using sample questions', err);
      questions = generateSampleQuestions(chapterSlug, chapterTitle || '', questionCount);
    }

    const quizData: Quiz = {
      id: `quiz-${Date.now()}`,
      title: `Quiz: ${chapterTitle || chapterSlug}`,
      questions: questions.map((q, i) => ({ ...q, order: i })),
      question_count: questions.length,
      difficulty: difficulty,
    };

    setQuiz(quizData);
    setStartTime(Date.now());
    setCurrentQuestion(0);
    setAnswers({});
    setResult(null);
    setIsLoading(false);
  }, [chapterSlug, chapterTitle, questionCount, difficulty]);

  const handleAnswer = useCallback((questionId: string, optionId: string) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: optionId,
    }));
  }, []);

  const handleNext = useCallback(() => {
    if (quiz && currentQuestion < quiz.questions.length - 1) {
      setCurrentQuestion(prev => prev + 1);
    }
  }, [quiz, currentQuestion]);

  const handlePrevious = useCallback(() => {
    if (currentQuestion > 0) {
      setCurrentQuestion(prev => prev - 1);
    }
  }, [currentQuestion]);

  const handleSubmit = useCallback(() => {
    if (!quiz) return;

    setIsSubmitting(true);

    // Calculate results client-side
    const timeTaken = startTime ? Math.floor((Date.now() - startTime) / 1000) : 0;
    let correctCount = 0;
    const questionResults = quiz.questions.map(q => {
      const selectedOption = answers[q.id];
      const correctOption = q.options.find(o => o.is_correct);
      const isCorrect = selectedOption === correctOption?.id;
      if (isCorrect) correctCount++;

      return {
        question_id: q.id,
        is_correct: isCorrect,
        correct_option_id: correctOption?.id || '',
        explanation: q.explanation,
      };
    });

    const score = (correctCount / quiz.questions.length) * 100;

    // Save to localStorage for dashboard
    saveQuizResultToStorage(chapterSlug, score, quiz.questions.length);

    setResult({
      score,
      correct_count: correctCount,
      total_count: quiz.questions.length,
      time_taken_seconds: timeTaken,
      questions: questionResults,
    });

    setIsSubmitting(false);
  }, [quiz, answers, startTime, chapterSlug]);

  const handleRetry = useCallback(() => {
    setQuiz(null);
    setResult(null);
    setAnswers({});
    setCurrentQuestion(0);
    setStartTime(null);
  }, []);

  // Render quiz setup
  if (!quiz) {
    return (
      <div className={styles.panel}>
        <div className={styles.header}>
          <h2 className={styles.title}>Test Your Knowledge</h2>
          {chapterTitle && <p className={styles.subtitle}>{chapterTitle}</p>}
          {onClose && (
            <button className={styles.closeButton} onClick={onClose}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          )}
        </div>

        <div className={styles.setup}>
          <div className={styles.setupField}>
            <label>Number of Questions</label>
            <div className={styles.buttonGroup}>
              {[3, 5, 10].map(count => (
                <button
                  key={count}
                  className={clsx(styles.optionButton, {
                    [styles.selected]: questionCount === count,
                  })}
                  onClick={() => setQuestionCount(count)}
                >
                  {count}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.setupField}>
            <label>Difficulty</label>
            <div className={styles.buttonGroup}>
              {(['mixed', 'easy', 'medium', 'hard'] as const).map(level => (
                <button
                  key={level}
                  className={clsx(styles.optionButton, {
                    [styles.selected]: difficulty === level,
                  })}
                  onClick={() => setDifficulty(level)}
                >
                  {level.charAt(0).toUpperCase() + level.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {error && <div className={styles.error}>{error}</div>}

          <button
            className={styles.startButton}
            onClick={generateQuiz}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <span className={styles.spinner} />
                Generating Quiz...
              </>
            ) : (
              'Start Quiz'
            )}
          </button>
        </div>
      </div>
    );
  }

  // Render results
  if (result) {
    return (
      <QuizResults
        result={result}
        quiz={quiz}
        onRetry={handleRetry}
        onClose={onClose}
      />
    );
  }

  // Render quiz questions
  const question = quiz.questions[currentQuestion];
  const answeredCount = Object.keys(answers).length;
  const progress = (answeredCount / quiz.questions.length) * 100;

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <span className={styles.questionCounter}>
            Question {currentQuestion + 1} of {quiz.questions.length}
          </span>
          <span className={styles.difficultyBadge}>{question.difficulty}</span>
        </div>
        {onClose && (
          <button className={styles.closeButton} onClick={onClose}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        )}
      </div>

      <div className={styles.progressBar}>
        <div className={styles.progressFill} style={{ width: `${progress}%` }} />
      </div>

      <QuestionCard
        question={question}
        selectedAnswer={answers[question.id]}
        onAnswer={(optionId) => handleAnswer(question.id, optionId)}
      />

      {error && <div className={styles.error}>{error}</div>}

      <div className={styles.navigation}>
        <button
          className={styles.navButton}
          onClick={handlePrevious}
          disabled={currentQuestion === 0}
        >
          Previous
        </button>

        <div className={styles.questionDots}>
          {quiz.questions.map((_, idx) => (
            <button
              key={idx}
              className={clsx(styles.dot, {
                [styles.dotCurrent]: idx === currentQuestion,
                [styles.dotAnswered]: answers[quiz.questions[idx].id],
              })}
              onClick={() => setCurrentQuestion(idx)}
            />
          ))}
        </div>

        {currentQuestion < quiz.questions.length - 1 ? (
          <button
            className={styles.navButton}
            onClick={handleNext}
          >
            Next
          </button>
        ) : (
          <button
            className={styles.submitButton}
            onClick={handleSubmit}
            disabled={isSubmitting || answeredCount < quiz.questions.length}
          >
            {isSubmitting ? 'Submitting...' : 'Submit Quiz'}
          </button>
        )}
      </div>
    </div>
  );
}

// Generate sample questions as fallback when AI parsing fails
function generateSampleQuestions(chapterSlug: string, chapterTitle: string, count: number): QuizQuestion[] {
  const topicName = chapterTitle || chapterSlug.replace(/-/g, ' ');

  const templates = [
    {
      question: `What is the main focus of ${topicName}?`,
      options: [
        { id: 'a', text: 'Understanding fundamental concepts', is_correct: true },
        { id: 'b', text: 'Historical background only', is_correct: false },
        { id: 'c', text: 'Unrelated technical details', is_correct: false },
        { id: 'd', text: 'General programming basics', is_correct: false },
      ],
      explanation: `The main focus is understanding the fundamental concepts of ${topicName}.`,
    },
    {
      question: `Which aspect is most important when studying ${topicName}?`,
      options: [
        { id: 'a', text: 'Memorizing formulas', is_correct: false },
        { id: 'b', text: 'Understanding practical applications', is_correct: true },
        { id: 'c', text: 'Speed of completion', is_correct: false },
        { id: 'd', text: 'Avoiding hands-on practice', is_correct: false },
      ],
      explanation: 'Understanding practical applications helps in real-world implementation.',
    },
    {
      question: `What skill is developed through ${topicName}?`,
      options: [
        { id: 'a', text: 'Problem-solving abilities', is_correct: true },
        { id: 'b', text: 'Only theoretical knowledge', is_correct: false },
        { id: 'c', text: 'Unrelated competencies', is_correct: false },
        { id: 'd', text: 'Basic arithmetic only', is_correct: false },
      ],
      explanation: 'This topic helps develop problem-solving abilities and critical thinking.',
    },
    {
      question: `How does ${topicName} relate to Physical AI?`,
      options: [
        { id: 'a', text: 'It has no connection', is_correct: false },
        { id: 'b', text: 'It provides foundational understanding', is_correct: true },
        { id: 'c', text: 'It only applies to software', is_correct: false },
        { id: 'd', text: 'It replaces other learning', is_correct: false },
      ],
      explanation: 'This topic provides foundational understanding for Physical AI systems.',
    },
    {
      question: `What is a key takeaway from ${topicName}?`,
      options: [
        { id: 'a', text: 'Theory and practice must work together', is_correct: true },
        { id: 'b', text: 'Only theory matters', is_correct: false },
        { id: 'c', text: 'Practice without theory is sufficient', is_correct: false },
        { id: 'd', text: 'Neither theory nor practice is important', is_correct: false },
      ],
      explanation: 'Combining theory and practice leads to better understanding and application.',
    },
  ];

  return templates.slice(0, count).map((t, i) => ({
    id: `q${i + 1}`,
    question_type: 'mcq' as const,
    question_text: t.question,
    options: t.options,
    difficulty: 'medium',
    order: i,
    explanation: t.explanation,
  }));
}

export default QuizPanel;
