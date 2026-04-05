export interface Question {
  id: string;
  domain: string;
  task: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  type: 'conceptual' | 'situational' | 'technical' | 'calculation';
  question: string;
  options: Record<string, string>;
  answer: string;
  explanation: string;
  tags: string[];
  created: string | null;
  source: string;
  times_shown: number;
  times_correct: number;
  last_shown: string | null;
  filePath: string; // Obsidian vault file path for updating stats
}

export function questionAccuracy(q: Question): number {
  if (q.times_shown === 0) return 0;
  return q.times_correct / q.times_shown;
}

export interface QuestionResponse {
  id: string;
  domain: string;
  task: string;
  difficulty: string;
  question: string;
  options: Record<string, string>;
}

export interface AnswerSubmission {
  question_id: string;
  selected_answer: string;
  time_seconds: number;
  confidence: 'guessing' | 'maybe' | 'sure';
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
  session_type: 'domain_drill' | 'mixed' | 'weak_areas' | 'mock_exam';
  domains: string[];
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
  domains: string[];
  results_by_domain: Record<string, { correct: number; total: number; percent: number }>;
  error_summary: Record<string, number>;
}

export interface SessionState {
  session_id: string;
  config: SessionConfig;
  questions: string[];
  current_index: number;
  answers: Record<string, AnswerSubmission>;
  started_at: string; // ISO string
}

export interface PausedSession {
  session_id: string;
  started_at: string;
  questions_total: number;
  questions_answered: number;
  domains: string[];
}

export interface DomainInfo {
  tasks: string[];
  question_count: number;
}

export interface Stats {
  total_questions: number;
  by_domain: Record<string, { total: number; easy: number; medium: number; hard: number }>;
}

export interface DomainProgress {
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
  by_domain: Record<string, DomainProgress>;
}

export interface SessionHistory {
  date: string;
  time: string;
  type: string;
  score: number;
  score_percent: number;
  questions_count: number;
  domains: string[];
}

export interface PluginSettings {
  questionsPath: string;
  sessionsPath: string;
  defaultQuestions: number;
  defaultTimePerQuestion: number;
}

export const DEFAULT_SETTINGS: PluginSettings = {
  questionsPath: 'Questions',
  sessionsPath: 'Sessions',
  defaultQuestions: 20,
  defaultTimePerQuestion: 90,
};
