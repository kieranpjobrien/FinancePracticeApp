export type ExamType = string;

export interface ExamInfo {
  name: string;
  category_label: string;
  subcategory_label: string;
  session_types: string[];
  question_types: string[];
  total_questions: number;
  categories: { name: string; weight: number }[];
}

export interface Question {
  id: string;
  category: string;
  subcategory: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  question: string;
  options: Record<string, string>;
}

export interface QuestionResult {
  question_id: string;
  selected_answer: string;
  correct_answer: string;
  is_correct: boolean;
  time_seconds: number;
  confidence: string;
  explanation: string;
}

export interface SessionConfig {
  session_type: string;
  categories: string[];
  subcategory?: string;
  question_count: number;
  difficulty: 'easy' | 'medium' | 'hard' | 'mixed';
  timed: boolean;
  time_per_question: number;
}

export interface SessionSummary {
  session_id: string;
  date: string;
  time: string;
  session_type: string;
  question_count: number;
  questions_attempted: number;
  score: number;
  score_percent: number;
  time_taken_minutes: number;
  categories: string[];
  results_by_category: Record<string, { correct: number; total: number; percent: number }>;
  error_summary: Record<string, number>;
}

export interface CategoryInfo {
  subcategories: string[];
  question_count: number;
}

export interface PausedSession {
  session_id: string;
  started_at: string;
  questions_total: number;
  questions_answered: number;
  categories: string[];
}

export interface CategoryProgress {
  total_questions: number;
  times_shown: number;
  times_correct: number;
  accuracy: number;
  questions_seen: number;
  questions_mastered: number;
}

export interface Progress {
  overall: {
    times_shown: number;
    times_correct: number;
    accuracy: number;
  };
  by_category: Record<string, CategoryProgress>;
}

export interface SessionHistory {
  date: string;
  time: string;
  type: string;
  score: number;
  score_percent: number;
  questions_count: number;
  categories: string[];
}
